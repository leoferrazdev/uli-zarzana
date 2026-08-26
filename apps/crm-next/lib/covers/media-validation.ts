export const MAX_VIDEO_FILE_SIZE_BYTES = 200 * 1024 * 1024;
export const MAX_VIDEO_DURATION_SECONDS = 15 * 60;

export function validateMediaFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
    return 'Envie um vídeo ou uma imagem para criar a capa.';
  }

  if (file.type.startsWith('video/') && file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
    return 'Este vídeo ultrapassa o limite local de 200 MB. Envie uma versão menor ou uma foto.';
  }

  return null;
}

export function validateVideoDuration(duration: number): string | null {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 'O navegador não conseguiu identificar a duração deste vídeo.';
  }

  if (duration > MAX_VIDEO_DURATION_SECONDS) {
    return 'Este vídeo ultrapassa 15 minutos. Envie um trecho menor ou uma foto.';
  }

  return null;
}
