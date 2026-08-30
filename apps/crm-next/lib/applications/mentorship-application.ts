export const DISCOVERY_SOURCES = [
  'instagram',
  'aula_gratuita',
  'indicacao',
  'whatsapp',
  'linkedin',
  'outro',
] as const;

export const PREFERRED_FORMATS = ['individual', 'grupo', 'orientacao'] as const;
export const FINANCIAL_AVAILABILITIES = ['sim', 'talvez', 'nao'] as const;
export const SESSION_PERIODS = ['manha', 'tarde', 'noite'] as const;
export const COMMITMENT_LEVELS = ['0-3', '4-6', '7-8', '9-10'] as const;

export type DiscoverySource = (typeof DISCOVERY_SOURCES)[number];
export type PreferredFormat = (typeof PREFERRED_FORMATS)[number];
export type FinancialAvailability = (typeof FINANCIAL_AVAILABILITIES)[number];
export type SessionPeriod = (typeof SESSION_PERIODS)[number];
export type CommitmentLevel = (typeof COMMITMENT_LEVELS)[number];

export type MentorshipApplicationInput = {
  full_name: string;
  whatsapp: string;
  email: string;
  city_state: string;
  birth_date: string;
  discovery_source: DiscoverySource;
  discovery_source_other: string;
  professional_situation: string;
  motivation: string;
  desired_result: string;
  main_obstacle: string;
  preferred_format: PreferredFormat;
  previous_mentoring_experience: string;
  expectations: string;
  selection_reason: string;
  additional_information: string;
  financial_availability: FinancialAvailability;
  preferred_session_period: SessionPeriod;
  schedule_notes: string;
  commitment_level: CommitmentLevel;
  terms_accepted: boolean;
};

export type ApplicationValidationError = {
  field: keyof MentorshipApplicationInput;
  message: string;
};

const TEXT_LIMITS: Partial<Record<keyof MentorshipApplicationInput, number>> = {
  full_name: 120,
  whatsapp: 40,
  email: 254,
  city_state: 120,
  discovery_source_other: 120,
  professional_situation: 2000,
  motivation: 2000,
  desired_result: 2000,
  main_obstacle: 2000,
  previous_mentoring_experience: 2000,
  expectations: 2000,
  selection_reason: 2000,
  additional_information: 2000,
  schedule_notes: 1000,
};

const REQUIRED_TEXT_FIELDS: Array<keyof MentorshipApplicationInput> = [
  'full_name',
  'whatsapp',
  'email',
  'city_state',
  'birth_date',
  'professional_situation',
  'motivation',
  'desired_result',
  'main_obstacle',
  'expectations',
  'selection_reason',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function addTextErrors(
  errors: ApplicationValidationError[],
  input: Record<string, unknown>,
  field: keyof MentorshipApplicationInput,
) {
  const value = stringValue(input[field]);
  if (!value) {
    errors.push({ field, message: 'Preencha este campo.' });
    return;
  }

  const limit = TEXT_LIMITS[field];
  if (limit && value.length > limit) {
    errors.push({ field, message: `Use no máximo ${limit} caracteres.` });
  }
}

function hasValue<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value
    && date.getTime() <= Date.now();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function validateMentorshipApplication(input: unknown): ApplicationValidationError[] {
  const errors: ApplicationValidationError[] = [];
  if (!isRecord(input)) {
    return [{ field: 'full_name', message: 'O corpo da aplicação é inválido.' }];
  }

  for (const field of REQUIRED_TEXT_FIELDS) {
    addTextErrors(errors, input, field);
  }

  const email = stringValue(input.email);
  if (email && !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Informe um e-mail válido.' });
  }

  const whatsapp = stringValue(input.whatsapp);
  if (whatsapp && (whatsapp.length < 8 || whatsapp.length > 40)) {
    errors.push({ field: 'whatsapp', message: 'Informe um WhatsApp válido.' });
  }

  const birthDate = stringValue(input.birth_date);
  if (birthDate && !isValidBirthDate(birthDate)) {
    errors.push({ field: 'birth_date', message: 'Informe uma data de nascimento válida.' });
  }

  if (!hasValue(DISCOVERY_SOURCES, input.discovery_source)) {
    errors.push({ field: 'discovery_source', message: 'Selecione como conheceu a mentoria.' });
  }
  if (input.discovery_source === 'outro') {
    addTextErrors(errors, input, 'discovery_source_other');
  }

  if (!hasValue(PREFERRED_FORMATS, input.preferred_format)) {
    errors.push({ field: 'preferred_format', message: 'Selecione um formato de mentoria.' });
  }
  if (!hasValue(FINANCIAL_AVAILABILITIES, input.financial_availability)) {
    errors.push({ field: 'financial_availability', message: 'Selecione uma opção de investimento.' });
  }
  if (!hasValue(SESSION_PERIODS, input.preferred_session_period)) {
    errors.push({ field: 'preferred_session_period', message: 'Selecione um período.' });
  }
  if (!hasValue(COMMITMENT_LEVELS, input.commitment_level)) {
    errors.push({ field: 'commitment_level', message: 'Selecione seu nível de comprometimento.' });
  }

  if (input.terms_accepted !== true) {
    errors.push({ field: 'terms_accepted', message: 'É necessário concordar com os termos.' });
  }

  return errors;
}

export function normalizeMentorshipApplication(input: unknown): MentorshipApplicationInput {
  const value = isRecord(input) ? input : {};
  return {
    full_name: stringValue(value.full_name),
    whatsapp: stringValue(value.whatsapp),
    email: stringValue(value.email).toLowerCase(),
    city_state: stringValue(value.city_state),
    birth_date: stringValue(value.birth_date),
    discovery_source: value.discovery_source as DiscoverySource,
    discovery_source_other: stringValue(value.discovery_source_other),
    professional_situation: stringValue(value.professional_situation),
    motivation: stringValue(value.motivation),
    desired_result: stringValue(value.desired_result),
    main_obstacle: stringValue(value.main_obstacle),
    preferred_format: value.preferred_format as PreferredFormat,
    previous_mentoring_experience: stringValue(value.previous_mentoring_experience),
    expectations: stringValue(value.expectations),
    selection_reason: stringValue(value.selection_reason),
    additional_information: stringValue(value.additional_information),
    financial_availability: value.financial_availability as FinancialAvailability,
    preferred_session_period: value.preferred_session_period as SessionPeriod,
    schedule_notes: stringValue(value.schedule_notes),
    commitment_level: value.commitment_level as CommitmentLevel,
    terms_accepted: value.terms_accepted === true,
  };
}
