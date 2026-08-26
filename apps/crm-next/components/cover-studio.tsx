'use client';

/* Blob URLs are created in the browser and cannot be optimized by next/image. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  COPY_POSITIONS,
  COVER_DIMENSIONS,
  COVER_PRESETS,
  COVER_TEXT_LIMITS,
  getCandidateFrameTimes,
  validateCoverCopy,
  type CoverCopy,
  type CoverCopyField,
  type CopyPosition,
  type CoverPresetId,
} from '../lib/covers/cover-presets';
import { renderCover } from '../lib/covers/render-cover';
import { validateMediaFile, validateVideoDuration } from '../lib/covers/media-validation';

type StageId = 'media' | 'image' | 'copy' | 'review';
type MediaKind = 'image' | 'video';
type FrameCandidate = { id: string; time: number; imageUrl: string };
type ProcessingProgress = { completed: number; total: number; label: string };

const STAGES: { id: StageId; label: string; title: string }[] = [
  { id: 'media', label: '01', title: 'Adicionar mídia' },
  { id: 'image', label: '02', title: 'Escolher imagem' },
  { id: 'copy', label: '03', title: 'Definir conteúdo' },
  { id: 'review', label: '04', title: 'Revisar e baixar' },
];

const INITIAL_COPY: CoverCopy = {
  context: COVER_PRESETS[0].context,
  headline: COVER_PRESETS[0].headline,
  subtitle: COVER_PRESETS[0].subtitle,
};

function copyFromPreset(id: CoverPresetId): CoverCopy {
  const preset = COVER_PRESETS.find((item) => item.id === id) ?? COVER_PRESETS[0];
  return { context: preset.context, headline: preset.headline, subtitle: preset.subtitle };
}

function createAbortError() {
  const error = new Error('Processamento cancelado.');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw createAbortError();
}

function getVideoErrorMessage(video: HTMLVideoElement, fallback: string) {
  if (video.error?.code === 4) {
    return 'Formato de vídeo não suportado neste navegador. Tente MP4 (H.264) ou envie uma foto.';
  }
  return fallback;
}

function waitForMetadata(video: HTMLVideoElement, signal: AbortSignal): Promise<void> {
  if (video.readyState >= 1 && Number.isFinite(video.duration)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => finish(() => reject(new Error('O navegador demorou para ler os dados do vídeo.'))), 8000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('error', handleError);
      signal.removeEventListener('abort', handleAbort);
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const handleLoaded = () => finish(resolve);
    const handleError = () => finish(() => reject(new Error(getVideoErrorMessage(video, 'O navegador não conseguiu ler a duração do vídeo.'))));
    const handleAbort = () => finish(() => reject(createAbortError()));

    video.addEventListener('loadedmetadata', handleLoaded, { once: true });
    video.addEventListener('error', handleError, { once: true });
    signal.addEventListener('abort', handleAbort, { once: true });
    throwIfAborted(signal);
  });
}

function seekVideo(video: HTMLVideoElement, time: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => finish(() => reject(new Error('A captura do frame demorou mais que o esperado.'))), 5000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      signal.removeEventListener('abort', handleAbort);
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const handleSeeked = () => finish(resolve);
    const handleError = () => finish(() => reject(new Error(getVideoErrorMessage(video, 'Não foi possível capturar um frame deste vídeo.'))));
    const handleAbort = () => finish(() => reject(createAbortError()));

    video.addEventListener('seeked', handleSeeked, { once: true });
    video.addEventListener('error', handleError, { once: true });
    signal.addEventListener('abort', handleAbort, { once: true });
    try {
      throwIfAborted(signal);
      video.currentTime = time;
      if (Math.abs(video.currentTime - time) < 0.001) window.requestAnimationFrame(handleSeeked);
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error('Não foi possível posicionar o vídeo.')));
    }
  });
}

async function waitForDecodedVideoFrame(video: HTMLVideoElement, signal: AbortSignal): Promise<void> {
  const videoWithFrameCallback = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: () => void) => number;
  };

  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => finish(() => reject(new Error('O navegador não conseguiu preparar o frame do vídeo.'))), 5000);
      const cleanup = () => {
        window.clearTimeout(timeout);
        video.removeEventListener('loadeddata', handleReady);
        video.removeEventListener('canplay', handleReady);
        video.removeEventListener('error', handleError);
        signal.removeEventListener('abort', handleAbort);
      };
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };
      const handleReady = () => finish(resolve);
      const handleError = () => finish(() => reject(new Error(getVideoErrorMessage(video, 'Não foi possível decodificar o frame deste vídeo.'))));
      const handleAbort = () => finish(() => reject(createAbortError()));
      video.addEventListener('loadeddata', handleReady, { once: true });
      video.addEventListener('canplay', handleReady, { once: true });
      video.addEventListener('error', handleError, { once: true });
      signal.addEventListener('abort', handleAbort, { once: true });
      throwIfAborted(signal);
    });
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let frameRequest = 0;
    const timeout = window.setTimeout(() => finish(() => reject(new Error('O navegador não conseguiu preparar o frame do vídeo.'))), 5000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      if (frameRequest) window.cancelAnimationFrame(frameRequest);
      video.removeEventListener('error', handleError);
      signal.removeEventListener('abort', handleAbort);
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const handleError = () => finish(() => reject(new Error(getVideoErrorMessage(video, 'Não foi possível decodificar o frame deste vídeo.'))));
    const handleAbort = () => finish(() => reject(createAbortError()));
    const handleFrame = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish(resolve);
      else frameRequest = window.requestAnimationFrame(handleFrame);
    };

    video.addEventListener('error', handleError, { once: true });
    signal.addEventListener('abort', handleAbort, { once: true });
    throwIfAborted(signal);
    if (videoWithFrameCallback.requestVideoFrameCallback) videoWithFrameCallback.requestVideoFrameCallback(handleFrame);
    frameRequest = window.requestAnimationFrame(() => {
      frameRequest = window.requestAnimationFrame(handleFrame);
    });
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('O navegador não conseguiu gerar a miniatura do frame.'));
    }, 'image/jpeg', 0.88);
  });
}

async function captureVideoFrame(video: HTMLVideoElement, time: number, index: number, signal: AbortSignal): Promise<FrameCandidate> {
  throwIfAborted(signal);
  await seekVideo(video, time, signal);
  await waitForDecodedVideoFrame(video, signal);
  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    throw new Error('O navegador não conseguiu decodificar as dimensões deste vídeo.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = 540;
  canvas.height = 960;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('O navegador não disponibilizou o Canvas para capturar o frame.');
  const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
  const drawnWidth = video.videoWidth * scale;
  const drawnHeight = video.videoHeight * scale;
  context.drawImage(video, (canvas.width - drawnWidth) / 2, (canvas.height - drawnHeight) / 2, drawnWidth, drawnHeight);
  const blob = await canvasToBlob(canvas);
  return { id: `frame-${index + 1}`, time, imageUrl: URL.createObjectURL(blob) };
}

async function captureVideoFrames(
  objectUrl: string,
  onProgress: (progress: ProcessingProgress) => void,
  signal: AbortSignal,
  onCenterReady: (candidate: FrameCandidate) => void,
  registerFrameUrl: (url: string) => void,
): Promise<FrameCandidate[]> {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.style.position = 'fixed';
  video.style.left = '-10000px';
  video.style.width = '1px';
  video.style.height = '1px';
  video.style.opacity = '0';
  document.body.appendChild(video);

  try {
    video.src = objectUrl;
    video.load();
    await waitForMetadata(video, signal);
    const durationError = validateVideoDuration(video.duration);
    if (durationError) throw new Error(durationError);
    const times = getCandidateFrameTimes(video.duration);
    if (!times.length) throw new Error('O vídeo não possui uma duração válida.');

    const candidates: (FrameCandidate | undefined)[] = [];
    const order = [1, 0, 2].filter((index) => Boolean(times[index] !== undefined));
    onProgress({ completed: 0, total: order.length, label: 'Preparando o frame central…' });

    for (const index of order) {
      throwIfAborted(signal);
      let candidate: FrameCandidate;
      try {
        candidate = await captureVideoFrame(video, times[index], index, signal);
      } catch (captureError) {
        if (index !== 1 || times[index] <= 0) {
          if (signal.aborted) throw createAbortError();
          onProgress({ completed: candidates.filter(Boolean).length, total: order.length, label: 'Frame alternativo indisponível; mantendo o frame central.' });
          continue;
        }
        try {
          candidate = await captureVideoFrame(video, 0, index, signal);
        } catch {
          throw captureError;
        }
      }

      registerFrameUrl(candidate.imageUrl);
      candidates[index] = candidate;
      const completed = candidates.filter(Boolean).length;
      if (index === 1) {
        onCenterReady(candidate);
        onProgress({ completed, total: order.length, label: 'Frame central pronto. Preparando alternativas…' });
      } else {
        onProgress({ completed, total: order.length, label: `Frame alternativo ${completed} de ${order.length} pronto…` });
      }
    }

    const readyCandidates = candidates.filter((candidate): candidate is FrameCandidate => Boolean(candidate));
    if (!readyCandidates.length) throw new Error('O navegador não conseguiu gerar um frame deste vídeo.');
    return readyCandidates;
  } finally {
    video.removeAttribute('src');
    video.load();
    video.remove();
  }
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

export default function CoverStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const frameUrlsRef = useRef<string[]>([]);
  const processingControllerRef = useRef<AbortController | null>(null);
  const [stage, setStage] = useState<StageId>('media');
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(null);
  const [fileName, setFileName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [frames, setFrames] = useState<FrameCandidate[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState('');
  const [presetId, setPresetId] = useState<CoverPresetId>('carreira');
  const [copyPosition, setCopyPosition] = useState<CopyPosition>('bottom');
  const [copy, setCopy] = useState<CoverCopy>(INITIAL_COPY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [processingMedia, setProcessingMedia] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({ completed: 0, total: 3, label: '' });

  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const clearFrameUrls = () => {
    for (const frameUrl of frameUrlsRef.current) URL.revokeObjectURL(frameUrl);
    frameUrlsRef.current = [];
  };

  useEffect(() => () => {
    processingControllerRef.current?.abort();
    clearObjectUrl();
    clearFrameUrls();
  }, []);

  const resetMediaState = () => {
    clearObjectUrl();
    clearFrameUrls();
    setStage('media');
    setMediaKind(null);
    setFileName('');
    setImageUrl('');
    setFrames([]);
    setSelectedFrameId('');
    setProcessingMedia(false);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (file: File | undefined) => {
    setError('');
    setNotice('');
    if (!file) return;

    processingControllerRef.current?.abort();
    resetMediaState();
    const validationError = validateMediaFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    const isVideo = file.type.startsWith('video/');
    setFileName(file.name);
    setMediaKind(isVideo ? 'video' : 'image');
    setBusy(true);

    if (!isVideo) {
      setImageUrl(objectUrl);
      setStage('image');
      setBusy(false);
      setNotice('Mídia pronta para continuar.');
      return;
    }

    const controller = new AbortController();
    processingControllerRef.current = controller;
    setProcessingMedia(true);
    setProcessingProgress({ completed: 0, total: 3, label: 'Preparando o vídeo localmente…' });

    try {
      const candidates = await captureVideoFrames(
        objectUrl,
        setProcessingProgress,
        controller.signal,
        (centerCandidate) => {
          if (controller.signal.aborted) return;
          setFrames([centerCandidate]);
          setSelectedFrameId(centerCandidate.id);
          setImageUrl(centerCandidate.imageUrl);
          setStage('image');
          setNotice('Frame central pronto. Os frames alternativos continuam sendo preparados localmente.');
        },
        (frameUrl) => frameUrlsRef.current.push(frameUrl),
      );
      if (controller.signal.aborted) return;
      const selectedCandidate = candidates.find((candidate) => candidate.id === 'frame-2') ?? candidates[0];
      setFrames(candidates);
      setSelectedFrameId(selectedCandidate.id);
      setImageUrl(selectedCandidate.imageUrl);
      setStage('image');
      setNotice(candidates.length < 3 ? 'Mídia pronta para continuar; alguns frames alternativos não puderam ser gerados.' : 'Mídia pronta para continuar.');
      clearObjectUrl();
    } catch (captureError) {
      if (controller.signal.aborted) return;
      clearObjectUrl();
      clearFrameUrls();
      setMediaKind(null);
      setFileName('');
      setImageUrl('');
      setFrames([]);
      setSelectedFrameId('');
      setError(captureError instanceof Error ? captureError.message : 'Não foi possível processar a mídia.');
    } finally {
      if (processingControllerRef.current === controller) {
        processingControllerRef.current = null;
        setProcessingMedia(false);
        setBusy(false);
      }
    }
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void handleFile(event.dataTransfer.files?.[0]);
  };

  const cancelProcessing = () => {
    processingControllerRef.current?.abort();
    processingControllerRef.current = null;
    resetMediaState();
    setError('Processamento cancelado. Escolha o arquivo novamente.');
  };

  const retrySelection = () => {
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const replaceMedia = () => {
    processingControllerRef.current?.abort();
    processingControllerRef.current = null;
    resetMediaState();
    setCopyPosition('bottom');
    setError('');
    setNotice('');
  };

  const selectFrame = (frame: FrameCandidate) => {
    setSelectedFrameId(frame.id);
    setImageUrl(frame.imageUrl);
    setError('');
  };

  const selectPreset = (id: CoverPresetId) => {
    setPresetId(id);
    setCopy(copyFromPreset(id));
    setError('');
  };

  const selectCopyPosition = (position: CopyPosition) => {
    setCopyPosition(position);
    setError('');
  };

  const updateCopy = (field: CoverCopyField, value: string) => {
    setCopy((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const goToCopy = () => {
    if (!imageUrl) {
      setError('Adicione uma imagem ou vídeo antes de continuar.');
      return;
    }
    setStage('copy');
    setError('');
  };

  const goToReview = () => {
    const errors = validateCoverCopy(copy);
    if (errors.length) {
      setError(errors[0].message);
      return;
    }
    setStage('review');
    setError('');
  };

  const download = async (format: 'png' | 'jpeg') => {
    if (!imageUrl) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const blob = await renderCover({ imageUrl, copy, format, position: copyPosition });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const extension = format === 'png' ? 'png' : 'jpg';
      link.href = downloadUrl;
      link.download = `uli-zarzana-capa-${presetId}.${extension}`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setNotice(`Capa ${extension.toUpperCase()} gerada em 1080 × 1920 px.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Não foi possível gerar a capa.');
    } finally {
      setBusy(false);
    }
  };

  const copyErrors = validateCoverCopy(copy);
  const errorFor = (field: CoverCopyField) => copyErrors.find((item) => item.field === field)?.message;

  return (
    <section className="cover-studio" aria-label="Estúdio de capas para Instagram">
      <aside className="cover-steps" aria-label="Etapas da criação">
        <span className="eyebrow">ESTÚDIO EDITORIAL · LOCAL</span>
        <h2>Uma capa pronta para publicar.</h2>
        <p className="cover-helper">Escolha uma mídia, confirme a imagem, ajuste a mensagem e baixe a capa da Uli.</p>
        <ol className="cover-step-list">
          {STAGES.map((item) => (
            <li className={stage === item.id ? 'is-active' : ''} key={item.id}>
              <span>{item.label}</span><strong>{item.title}</strong>
            </li>
          ))}
        </ol>
        <p className="cover-privacy"><strong>Processamento local.</strong> O vídeo e a foto permanecem no navegador e não são enviados ao CRM.</p>
      </aside>

      <div className="cover-workspace">
        {processingMedia && (
          <div className="cover-status cover-processing" role="status" aria-live="polite">
            <div className="cover-processing-copy"><strong>Preparando a mídia no navegador</strong><span>{processingProgress.label}</span></div>
            <progress max={processingProgress.total} value={processingProgress.completed} aria-label="Progresso do processamento local" />
            <button className="button-secondary" type="button" onClick={cancelProcessing}>Cancelar</button>
          </div>
        )}

        {stage === 'media' && (
          <div className="cover-panel-stack">
            <div className="cover-panel-heading"><span className="eyebrow">ETAPA 01</span><h3>Adicione o vídeo ou a foto</h3><p>O vídeo é opcional. Se você enviar um vídeo, o CRM separa três frames e recomenda o frame central.</p></div>
            <div className="cover-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }} role="button" tabIndex={0}>
              <input ref={inputRef} className="visually-hidden" type="file" accept="video/*,image/*" onChange={handleInput} />
              <span className="cover-drop-icon">+</span>
              <strong>Adicionar vídeo ou foto</strong>
              <span>Arraste um arquivo aqui ou clique para escolher.</span>
              <small>O arquivo será usado apenas nesta sessão do navegador.</small>
            </div>
          </div>
        )}

        {stage === 'image' && (
          <div className="cover-panel-stack">
            <div className="cover-panel-heading"><span className="eyebrow">ETAPA 02</span><h3>Escolha a imagem da capa</h3><p>{mediaKind === 'video' ? 'O frame central foi selecionado automaticamente. Troque apenas se outro momento funcionar melhor.' : 'A foto será enquadrada automaticamente no formato vertical 9:16.'}</p></div>
            <div className="cover-image-choice">
              <CoverPreview imageUrl={imageUrl} copy={copy} position={copyPosition} showSafeZone />
              <div className="cover-choice-controls">
                <div className="cover-file-summary"><strong>{fileName}</strong><span>{mediaKind === 'video' ? `Vídeo · ${frames.length || 1} frames locais` : 'Imagem · recorte automático 9:16'}</span></div>
                {frames.length > 0 && <div className="cover-frame-grid" aria-label="Frames candidatos">{frames.map((frame) => <button className={frame.id === selectedFrameId ? 'is-selected' : ''} type="button" key={frame.id} onClick={() => selectFrame(frame)} aria-pressed={frame.id === selectedFrameId}><img src={frame.imageUrl} alt={`Frame em ${formatTime(frame.time)}`} /><span>{formatTime(frame.time)}</span></button>)}</div>}
                <fieldset className="cover-position-picker" aria-label="Posição da copy">
                  <legend>Posição da copy</legend>
                  <p className="cover-position-help">Escolha onde a mensagem deve aparecer dentro da área segura da capa.</p>
                  <div className="cover-position-grid">
                    {COPY_POSITIONS.map((position) => (
                      <button className={`cover-position-card${position.id === copyPosition ? ' is-selected' : ''}`} type="button" key={position.id} onClick={() => selectCopyPosition(position.id)} aria-pressed={position.id === copyPosition}>
                        <CoverPreview imageUrl={imageUrl} copy={copy} position={position.id} compact />
                        <strong>{position.label}</strong>
                        <small>{position.description}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="cover-actions"><button className="button-secondary" type="button" onClick={replaceMedia}>Trocar mídia</button><button className="button-primary" type="button" onClick={goToCopy}>Continuar para o conteúdo</button></div>
              </div>
            </div>
          </div>
        )}

        {stage === 'copy' && (
          <div className="cover-panel-stack">
            <div className="cover-panel-heading"><span className="eyebrow">ETAPA 03</span><h3>Defina o conteúdo da capa</h3><p>Use uma mensagem curta. O layout mantém automaticamente a hierarquia editorial aprovada.</p></div>
            <div className="cover-copy-layout">
              <div className="cover-copy-form">
                <fieldset><legend>Modelo editorial</legend><div className="cover-preset-grid">{COVER_PRESETS.map((preset) => <button className={preset.id === presetId ? 'is-selected' : ''} type="button" key={preset.id} onClick={() => selectPreset(preset.id)} aria-pressed={preset.id === presetId}><strong>{preset.label}</strong><span>{preset.context} {preset.headline}</span></button>)}</div></fieldset>
                <TextField field="context" label="Contexto" value={copy.context} limit={COVER_TEXT_LIMITS.context} error={errorFor('context')} onChange={updateCopy} />
                <TextField field="headline" label="Headline" value={copy.headline} limit={COVER_TEXT_LIMITS.headline} error={errorFor('headline')} onChange={updateCopy} />
                <TextField field="subtitle" label="Subtítulo" value={copy.subtitle} limit={COVER_TEXT_LIMITS.subtitle} error={errorFor('subtitle')} onChange={updateCopy} />
                <div className="cover-actions"><button className="button-secondary" type="button" onClick={() => setStage('image')}>Voltar para imagem</button><button className="button-primary" type="button" onClick={goToReview}>Revisar capa</button></div>
              </div>
              <CoverPreview imageUrl={imageUrl} copy={copy} position={copyPosition} />
            </div>
          </div>
        )}

        {stage === 'review' && (
          <div className="cover-panel-stack">
            <div className="cover-panel-heading"><span className="eyebrow">ETAPA 04</span><h3>Revise e baixe a capa</h3><p>O arquivo final será exportado em 1080 × 1920 px, pronto para Reels, Stories e conteúdo social.</p></div>
            <div className="cover-review-layout"><CoverPreview imageUrl={imageUrl} copy={copy} position={copyPosition} /><div className="cover-review-copy"><div className="cover-file-summary"><span>MODELO EDITORIAL</span><strong>{COVER_PRESETS.find((preset) => preset.id === presetId)?.label}</strong><small>{fileName} · proporção 9:16 · posição {COPY_POSITIONS.find((position) => position.id === copyPosition)?.label}</small></div><div className="cover-actions cover-downloads"><button className="button-primary" type="button" disabled={busy} onClick={() => void download('png')}>Baixar PNG</button><button className="button-secondary" type="button" disabled={busy} onClick={() => void download('jpeg')}>Baixar JPG</button></div><button className="text-link cover-edit-link" type="button" onClick={() => setStage('copy')}>Voltar e editar conteúdo</button><button className="text-link cover-edit-link" type="button" onClick={() => setStage('image')}>Voltar e escolher outra imagem</button></div></div>
          </div>
        )}

        {error && <div className="cover-error" role="alert"><span>{error}</span>{!imageUrl && <button className="button-secondary" type="button" onClick={retrySelection}>Tentar novamente</button>}</div>}
        {notice && <p className="cover-notice" role="status">{notice}</p>}
      </div>
    </section>
  );
}

function TextField({ field, label, value, limit, error, onChange }: { field: CoverCopyField; label: string; value: string; limit: number; error?: string; onChange: (field: CoverCopyField, value: string) => void }) {
  const inputId = `cover-${field}`;
  return <div className="cover-field"><label htmlFor={inputId}>{label}</label><input id={inputId} value={value} maxLength={limit} onChange={(event) => onChange(field, event.target.value)} aria-describedby={`${inputId}-hint`} aria-invalid={Boolean(error)} /><div className="cover-field-meta" id={`${inputId}-hint`}><span>{error ?? `Até ${limit} caracteres para preservar a leitura.`}</span><small>{value.length}/{limit}</small></div></div>;
}

function CoverPreview({ imageUrl, copy, position = 'bottom', showSafeZone = false, compact = false }: { imageUrl: string; copy: CoverCopy; position?: CopyPosition; showSafeZone?: boolean; compact?: boolean }) {
  return <figure className={`cover-preview${compact ? ' is-compact' : ''}`}><div className="cover-preview-media">{imageUrl ? <img src={imageUrl} alt="Prévia da imagem selecionada para a capa" /> : <span>Prévia 9:16</span>}<div className={`cover-preview-shade is-${position}`} /><div className={`cover-preview-copy is-${position}`}><span>{copy.context}</span><strong>{copy.headline}</strong><em>{copy.subtitle}</em></div>{showSafeZone && <div className="cover-safe-zone-guide"><span className="cover-safe-zone-label">GUIA SAFE ZONE · NÃO EXPORTADO</span></div>}</div><figcaption>{COVER_DIMENSIONS.width} × {COVER_DIMENSIONS.height} px · 9:16</figcaption></figure>;
}
