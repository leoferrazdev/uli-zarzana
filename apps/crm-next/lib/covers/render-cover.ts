import {
  COPY_POSITION_ANCHORS,
  COVER_DIMENSIONS,
  META_SAFE_ZONE,
  type CopyPosition,
  type CoverCopy,
} from './cover-presets';

const COLORS = {
  ink: '#332A26',
  paper: '#F7F0E7',
  champagne: '#CDAE85',
} as const;

type TextLayout = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
};

const MAX_TEXT_WIDTH = META_SAFE_ZONE.width;

export function loadCoverImage(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    image.src = imageUrl;
  });
}

async function loadApprovedFonts() {
  if (!document.fonts?.load) return;
  await Promise.all([
    document.fonts.load('700 92px "Libre Baskerville"'),
    document.fonts.load('500 38px "Source Sans 3"'),
  ]);
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && context.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  options: { family: string; weight: number; initialSize: number; minSize: number; lineHeight: number; maxLines: number },
): TextLayout {
  for (let fontSize = options.initialSize; fontSize >= options.minSize; fontSize -= 2) {
    context.font = `${options.weight} ${fontSize}px ${options.family}`;
    const lines = wrapText(context, text, MAX_TEXT_WIDTH);
    if (lines.length <= options.maxLines) {
      return { lines, fontSize, lineHeight: Math.round(fontSize * options.lineHeight) };
    }
  }

  context.font = `${options.weight} ${options.minSize}px ${options.family}`;
  return {
    lines: wrapText(context, text, MAX_TEXT_WIDTH).slice(0, options.maxLines),
    fontSize: options.minSize,
    lineHeight: Math.round(options.minSize * options.lineHeight),
  };
}

function drawLines(
  context: CanvasRenderingContext2D,
  layout: TextLayout,
  text: string,
  x: number,
  y: number,
  color: string,
  family: string,
  weight: number,
) {
  context.font = `${weight} ${layout.fontSize}px ${family}`;
  context.fillStyle = color;
  context.textBaseline = 'top';
  layout.lines.forEach((line, index) => context.fillText(line, x, y + index * layout.lineHeight));
  return y + layout.lines.length * layout.lineHeight;
}

function drawBackground(context: CanvasRenderingContext2D, image: HTMLImageElement, position: CopyPosition) {
  const { width, height } = COVER_DIMENSIONS;
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const scale = Math.max(width / naturalWidth, height / naturalHeight);
  const drawnWidth = naturalWidth * scale;
  const drawnHeight = naturalHeight * scale;
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;

  context.drawImage(image, offsetX, offsetY, drawnWidth, drawnHeight);

  const readingGradient = position === 'top'
    ? context.createLinearGradient(0, 0, 0, 900)
    : position === 'center'
      ? context.createRadialGradient(width / 2, height / 2, 120, width / 2, height / 2, 780)
      : position === 'bottom'
        ? context.createLinearGradient(0, 540, 0, height)
        : context.createLinearGradient(0, 540, 0, height);

  if (position === 'top') {
    readingGradient.addColorStop(0, 'rgba(51,42,38,0.86)');
    readingGradient.addColorStop(0.38, 'rgba(51,42,38,0.64)');
    readingGradient.addColorStop(0.78, 'rgba(51,42,38,0.12)');
    readingGradient.addColorStop(1, 'rgba(51,42,38,0)');
  } else if (position === 'center') {
    readingGradient.addColorStop(0, 'rgba(51,42,38,0.08)');
    readingGradient.addColorStop(0.38, 'rgba(51,42,38,0.52)');
    readingGradient.addColorStop(0.58, 'rgba(51,42,38,0.72)');
    readingGradient.addColorStop(0.82, 'rgba(51,42,38,0.18)');
    readingGradient.addColorStop(1, 'rgba(51,42,38,0)');
  } else {
    readingGradient.addColorStop(0, 'rgba(51,42,38,0)');
    readingGradient.addColorStop(0.34, 'rgba(51,42,38,0.18)');
    readingGradient.addColorStop(0.72, 'rgba(51,42,38,0.88)');
    readingGradient.addColorStop(1, COLORS.ink);
  }
  context.fillStyle = readingGradient;
  context.fillRect(0, 0, width, height);
}

export async function renderCover(options: {
  imageUrl: string;
  copy: CoverCopy;
  format: 'png' | 'jpeg';
  position: CopyPosition;
}): Promise<Blob> {
  await loadApprovedFonts();
  const image = await loadCoverImage(options.imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = COVER_DIMENSIONS.width;
  canvas.height = COVER_DIMENSIONS.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('O navegador não disponibilizou o Canvas para exportação.');

  drawBackground(context, image, options.position);

  const x = META_SAFE_ZONE.left;
  const { contextY, headlineY } = COPY_POSITION_ANCHORS[options.position];
  const contextLayout = fitText(context, options.copy.context, {
    family: '"Source Sans 3", sans-serif',
    weight: 600,
    initialSize: 40,
    minSize: 28,
    lineHeight: 1.15,
    maxLines: 1,
  });
  const headlineLayout = fitText(context, options.copy.headline, {
    family: '"Libre Baskerville", Georgia, serif',
    weight: 700,
    initialSize: 96,
    minSize: 62,
    lineHeight: 1.08,
    maxLines: 2,
  });
  const subtitleLayout = fitText(context, options.copy.subtitle, {
    family: '"Source Sans 3", sans-serif',
    weight: 500,
    initialSize: 42,
    minSize: 30,
    lineHeight: 1.15,
    maxLines: 1,
  });

  drawLines(context, contextLayout, options.copy.context, x, contextY, COLORS.champagne, '"Source Sans 3", sans-serif', 600);
  const headlineEnd = drawLines(context, headlineLayout, options.copy.headline, x, headlineY, COLORS.paper, '"Libre Baskerville", Georgia, serif', 700);
  context.fillStyle = COLORS.champagne;
  context.beginPath();
  context.arc(x + Math.min(MAX_TEXT_WIDTH, context.measureText(headlineLayout.lines[headlineLayout.lines.length - 1] ?? '').width) + 22, headlineEnd - headlineLayout.lineHeight / 2, 8, 0, Math.PI * 2);
  context.fill();
  drawLines(context, subtitleLayout, options.copy.subtitle, x, headlineEnd + 44, COLORS.champagne, '"Source Sans 3", sans-serif', 500);

  const mime = options.format === 'png' ? 'image/png' : 'image/jpeg';
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Não foi possível gerar o arquivo da capa.'));
    }, mime, options.format === 'jpeg' ? 0.94 : undefined);
  });
}
