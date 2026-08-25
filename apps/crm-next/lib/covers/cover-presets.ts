export const COVER_DIMENSIONS = {
  width: 1080,
  height: 1920,
} as const;

export type CoverPresetId = 'carreira' | 'lideranca' | 'autoridade' | 'ascensao';

export type CoverPreset = {
  readonly id: CoverPresetId;
  readonly label: string;
  readonly context: string;
  readonly headline: string;
  readonly subtitle: string;
};

export type CoverCopy = Pick<CoverPreset, 'context' | 'headline' | 'subtitle'>;
export type CoverCopyField = keyof CoverCopy;

export const COVER_TEXT_LIMITS: Record<CoverCopyField, number> = {
  context: 42,
  headline: 36,
  subtitle: 42,
};

export const COVER_PRESETS: readonly CoverPreset[] = [
  {
    id: 'carreira',
    label: 'Carreira e reconhecimento',
    context: 'capacidade que vira',
    headline: 'autoridade.',
    subtitle: 'para o próximo passo',
  },
  {
    id: 'lideranca',
    label: 'Liderança e decisão',
    context: 'decisões maiores pedem',
    headline: 'presença.',
    subtitle: 'na liderança',
  },
  {
    id: 'autoridade',
    label: 'Autoridade e influência',
    context: 'o que você construiu',
    headline: 'percebido.',
    subtitle: 'com consistência',
  },
  {
    id: 'ascensao',
    label: 'Ascensão e próximo passo',
    context: 'o próximo passo pede',
    headline: 'direção.',
    subtitle: 'sem perder identidade',
  },
];

export function getCandidateFrameTimes(duration: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  return [0.25, 0.5, 0.75].map((ratio) => Number((duration * ratio).toFixed(3)));
}

export function validateCoverCopy(copy: CoverCopy): { field: CoverCopyField; message: string }[] {
  const errors: { field: CoverCopyField; message: string }[] = [];
  const labels: Record<CoverCopyField, string> = {
    context: 'contexto',
    headline: 'headline',
    subtitle: 'subtítulo',
  };

  for (const field of Object.keys(COVER_TEXT_LIMITS) as CoverCopyField[]) {
    const value = copy[field].trim();
    if (!value) {
      errors.push({ field, message: `Preencha o ${labels[field]} para continuar.` });
    } else if (value.length > COVER_TEXT_LIMITS[field]) {
      errors.push({ field, message: `Encurte o ${labels[field]} para preservar a leitura da capa.` });
    }
  }

  return errors;
}
