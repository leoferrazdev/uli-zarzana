'use client';

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

type StageId = 'media' | 'image' | 'copy' | 'review';
type MediaKind = 'image' | 'video';
type FrameCandidate = { id: string; time: number; dataUrl: string };

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

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1 && Number.isFinite(video.duration)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const handleLoaded = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error('O navegador não conseguiu ler a duração do vídeo.'));
    };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('error', handleError);
    };
    video.addEventListener('loadedmetadata', handleLoaded, { once: true });
    video.addEventListener('error', handleError, { once: true });
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      callback();
    };
    const handleSeeked = () => finish(resolve);
    const handleError = () => finish(() => reject(new Error('Não foi possível capturar um frame deste vídeo.')));
    const timeout = window.setTimeout(() => finish(() => reject(new Error('A captura do frame demorou mais que o esperado.'))), 6000);
    video.addEventListener('seeked', handleSeeked, { once: true });
    video.addEventListener('error', handleError, { once: true });
    video.currentTime = time;
    if (Math.abs(video.currentTime - time) < 0.001) window.requestAnimationFrame(handleSeeked);
  });
}

async function waitForDecodedVideoFrame(video: HTMLVideoElement): Promise<void> {
  const videoWithFrameCallback = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: () => void) => number;
  };

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeEventListener('error', handleError);
      callback();
    };
    const handleError = () => finish(() => reject(new Error('Não foi possível decodificar o frame deste vídeo.')));
    const handleFrame = () => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        window.requestAnimationFrame(handleFrame);
        return;
      }
      finish(resolve);
    };
    const timeout = window.setTimeout(() => finish(() => reject(new Error('O navegador não conseguiu preparar o frame do vídeo.'))), 3000);

    video.addEventListener('error', handleError, { once: true });
    if (videoWithFrameCallback.requestVideoFrameCallback) {
      videoWithFrameCallback.requestVideoFrameCallback(handleFrame);
    } else {
      window.requestAnimationFrame(() => window.requestAnimationFrame(handleFrame));
    }
  });
}

async function captureVideoFrames(objectUrl: string): Promise<FrameCandidate[]> {
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;
  await waitForMetadata(video);
  const times = getCandidateFrameTimes(video.duration);
  if (!times.length) throw new Error('O vídeo não possui uma duração válida.');

  const candidates: FrameCandidate[] = [];
  for (const [index, time] of times.entries()) {
    await seekVideo(video, time);
    await waitForDecodedVideoFrame(video);
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
    candidates.push({ id: `frame-${index + 1}`, time, dataUrl: canvas.toDataURL('image/jpeg', 0.92) });
  }
  video.removeAttribute('src');
  video.load();
  return candidates;
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

export default function CoverStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
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

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const handleFile = async (file: File | undefined) => {
    setError('');
    setNotice('');
    if (!file) return;
    if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
      setError('Selecione um vídeo ou uma imagem compatível.');
      return;
    }

    clearObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setFileName(file.name);
    setMediaKind(file.type.startsWith('video/') ? 'video' : 'image');
    setFrames([]);
    setSelectedFrameId('');
    setBusy(true);

    try {
      if (file.type.startsWith('video/')) {
        const candidates = await captureVideoFrames(objectUrl);
        setFrames(candidates);
        setSelectedFrameId(candidates[1]?.id ?? candidates[0].id);
        setImageUrl(candidates[1]?.dataUrl ?? candidates[0].dataUrl);
        clearObjectUrl();
      } else {
        setImageUrl(objectUrl);
      }
      setStage('image');
    } catch (captureError) {
      clearObjectUrl();
      setMediaKind(null);
      setFileName('');
      setError(captureError instanceof Error ? captureError.message : 'Não foi possível processar a mídia.');
    } finally {
      setBusy(false);
    }
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void handleFile(event.dataTransfer.files?.[0]);
  };

  const replaceMedia = () => {
    clearObjectUrl();
    setStage('media');
    setMediaKind(null);
    setFileName('');
    setImageUrl('');
    setFrames([]);
    setSelectedFrameId('');
    setCopyPosition('bottom');
    setError('');
    setNotice('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const selectFrame = (frame: FrameCandidate) => {
    setSelectedFrameId(frame.id);
    setImageUrl(frame.dataUrl);
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
            {busy && <p className="cover-status">Processando a mídia localmente…</p>}
          </div>
        )}

        {stage === 'image' && (
          <div className="cover-panel-stack">
            <div className="cover-panel-heading"><span className="eyebrow">ETAPA 02</span><h3>Escolha a imagem da capa</h3><p>{mediaKind === 'video' ? 'O frame central foi selecionado automaticamente. Troque apenas se outro momento funcionar melhor.' : 'A foto será enquadrada automaticamente no formato vertical 9:16.'}</p></div>
            <div className="cover-image-choice">
              <CoverPreview imageUrl={imageUrl} copy={copy} position={copyPosition} showSafeZone />
              <div className="cover-choice-controls">
                <div className="cover-file-summary"><strong>{fileName}</strong><span>{mediaKind === 'video' ? 'Vídeo · 3 frames locais' : 'Imagem · recorte automático 9:16'}</span></div>
                {frames.length > 0 && <div className="cover-frame-grid" aria-label="Frames candidatos">{frames.map((frame) => <button className={frame.id === selectedFrameId ? 'is-selected' : ''} type="button" key={frame.id} onClick={() => selectFrame(frame)} aria-pressed={frame.id === selectedFrameId}><img src={frame.dataUrl} alt={`Frame em ${formatTime(frame.time)}`} /><span>{formatTime(frame.time)}</span></button>)}</div>}
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

        {error && <p className="cover-error" role="alert">{error}</p>}
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
