'use client';

import { useMemo, useState } from 'react';
import {
  COMMITMENT_LEVELS,
  DISCOVERY_SOURCES,
  FINANCIAL_AVAILABILITIES,
  PREFERRED_FORMATS,
  SESSION_PERIODS,
  type MentorshipApplicationInput,
  validateMentorshipApplication,
} from '../lib/applications/mentorship-application';

type Step = {
  eyebrow: string;
  title: string;
  description: string;
  fields: (keyof MentorshipApplicationInput)[];
};

const steps: Step[] = [
  {
    eyebrow: 'ETAPA 01 · ORIENTAÇÃO',
    title: 'Entre potencial e resultado.',
    description: 'Antes de começar, leia com atenção para entender o momento da mentoria e o processo de seleção.',
    fields: [],
  },
  {
    eyebrow: 'ETAPA 02 · IDENTIFICAÇÃO',
    title: 'Começamos por você.',
    description: 'Esses dados nos ajudam a reconhecer sua aplicação e a entrar em contato se houver um próximo passo.',
    fields: ['full_name', 'whatsapp', 'email', 'city_state', 'birth_date', 'discovery_source', 'discovery_source_other'],
  },
  {
    eyebrow: 'ETAPA 03 · CONTEXTO PROFISSIONAL',
    title: 'Onde você está hoje?',
    description: 'Conte o suficiente para que a análise considere sua experiência, seu setor e o momento que você está vivendo.',
    fields: ['professional_situation'],
  },
  {
    eyebrow: 'ETAPA 04 · MOMENTO E OBJETIVO',
    title: 'O próximo resultado precisa ser claro.',
    description: 'Quanto mais específico for o seu objetivo, melhor conseguimos compreender a transformação que você procura.',
    fields: ['motivation', 'desired_result'],
  },
  {
    eyebrow: 'ETAPA 05 · DESAFIO E FORMATO',
    title: 'O que precisa mudar?',
    description: 'Reconhecer o obstáculo atual e o formato que faz sentido para você é parte importante desta aplicação.',
    fields: ['main_obstacle', 'preferred_format', 'previous_mentoring_experience'],
  },
  {
    eyebrow: 'ETAPA 06 · EXPECTATIVAS E SELEÇÃO',
    title: 'Por que este é o seu momento?',
    description: 'Esta etapa ajuda a entender sua disposição para implementar mudanças reais, além do seu desejo de receber informação.',
    fields: ['expectations', 'selection_reason', 'additional_information'],
  },
  {
    eyebrow: 'ETAPA 07 · DISPONIBILIDADE',
    title: 'Transformação também pede espaço.',
    description: 'Suas respostas orientam a análise de aderência e ajudam a entender a disponibilidade para este compromisso.',
    fields: ['financial_availability', 'preferred_session_period', 'schedule_notes', 'commitment_level'],
  },
  {
    eyebrow: 'ETAPA 08 · REVISÃO E ENVIO',
    title: 'Pronto para enviar sua aplicação?',
    description: 'Revise sua declaração e envie as respostas. Cada inscrição será analisada individualmente.',
    fields: ['terms_accepted'],
  },
];

const initialApplication: MentorshipApplicationInput = {
  full_name: '',
  whatsapp: '',
  email: '',
  city_state: '',
  birth_date: '',
  discovery_source: 'instagram',
  discovery_source_other: '',
  professional_situation: '',
  motivation: '',
  desired_result: '',
  main_obstacle: '',
  preferred_format: 'individual',
  previous_mentoring_experience: '',
  expectations: '',
  selection_reason: '',
  additional_information: '',
  financial_availability: 'sim',
  preferred_session_period: 'manha',
  schedule_notes: '',
  commitment_level: '7-8',
  terms_accepted: false,
};

const sourceLabels: Record<(typeof DISCOVERY_SOURCES)[number], string> = {
  instagram: 'Instagram',
  aula_gratuita: 'Aula gratuita',
  indicacao: 'Indicação',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  outro: 'Outro',
};

const formatLabels: Record<(typeof PREFERRED_FORMATS)[number], string> = {
  individual: 'Mentoria individual',
  grupo: 'Mentoria em grupo',
  orientacao: 'Ainda não sei · gostaria de orientação',
};

const financialLabels: Record<(typeof FINANCIAL_AVAILABILITIES)[number], string> = {
  sim: 'Sim',
  talvez: 'Talvez',
  nao: 'Não',
};

const periodLabels: Record<(typeof SESSION_PERIODS)[number], string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

const commitmentLabels: Record<(typeof COMMITMENT_LEVELS)[number], string> = {
  '0-3': '0–3',
  '4-6': '4–6',
  '7-8': '7–8',
  '9-10': '9–10',
};

const fieldLabels: Partial<Record<keyof MentorshipApplicationInput, string>> = {
  full_name: 'Nome completo',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  city_state: 'Cidade/Estado',
  birth_date: 'Data de nascimento',
  discovery_source: 'Como você conheceu a mentoria?',
  discovery_source_other: 'Conte qual foi a outra origem',
  professional_situation: 'Sua situação profissional atual',
  motivation: 'Por que você está interessado(a) em receber mentoria neste momento?',
  desired_result: 'Qual resultado profissional específico você deseja alcançar nos próximos 6 a 12 meses?',
  main_obstacle: 'Qual é hoje o principal obstáculo que está impedindo você de acessar seu próximo nível?',
  preferred_format: 'Qual formato de mentoria desperta mais o seu interesse?',
  previous_mentoring_experience: 'Você possui uma experiência prévia com mentoria?',
  expectations: 'Quais são suas expectativas em relação à mentoria?',
  selection_reason: 'Dentre todas as pessoas que estão aplicando, por que você deveria ser selecionado?',
  additional_information: 'Há mais alguma informação que você gostaria de compartilhar?',
  financial_availability: 'Você possui disponibilidade financeira para investir no seu desenvolvimento neste momento?',
  preferred_session_period: 'Qual seria o melhor horário para sua sessão de mentoria?',
  schedule_notes: 'Alguma consideração específica sobre horário?',
  commitment_level: 'Qual é seu nível de comprometimento para implementar mudanças nos próximos 6 meses?',
};

function fieldError(errors: ReturnType<typeof validateMentorshipApplication>, field: keyof MentorshipApplicationInput) {
  return errors.find((error) => error.field === field)?.message;
}

function inputClass(error?: string) {
  return error ? 'application-input has-error' : 'application-input';
}

export function MentorshipApplicationWizard() {
  const [application, setApplication] = useState(initialApplication);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<ReturnType<typeof validateMentorshipApplication>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const step = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const currentStepErrors = useMemo(
    () => errors.filter((error) => step.fields.includes(error.field as keyof MentorshipApplicationInput)),
    [errors, step.fields],
  );

  function updateField<Field extends keyof MentorshipApplicationInput>(field: Field, value: MentorshipApplicationInput[Field]) {
    setApplication((current) => ({ ...current, [field]: value }));
    setErrors((current) => current.filter((error) => error.field !== field));
    setSubmitError('');
  }

  function validateStep() {
    const validation = validateMentorshipApplication(application);
    const relevant = validation.filter((error) => step.fields.includes(error.field as keyof MentorshipApplicationInput));
    setErrors(relevant);
    return relevant.length === 0;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function previousStep() {
    setStepIndex((current) => Math.max(current - 1, 0));
    setErrors([]);
    setSubmitError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitApplication() {
    const validation = validateMentorshipApplication(application);
    setErrors(validation);
    if (validation.length) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/aplicacoes/mentoria-entre-potencial-e-resultado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(application),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setSubmitError(payload?.message ?? 'Não foi possível enviar agora. Revise os dados e tente novamente.');
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSubmitError('Não foi possível conectar ao formulário agora. Tente novamente em instantes.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="application-page">
        <section className="application-success" aria-labelledby="application-success-title">
          <span className="application-mark" aria-hidden="true">UZ</span>
          <span className="eyebrow">APLICAÇÃO RECEBIDA</span>
          <h1 id="application-success-title">Seu próximo passo começa com clareza.</h1>
          <p>Obrigada por compartilhar seu momento. Sua aplicação foi recebida e será analisada individualmente.</p>
          <p>Se houver aderência entre seus objetivos e a proposta da mentoria, entraremos em contato pelos dados informados.</p>
          <a className="application-button application-button-primary" href="https://ulizarzana.com/bio">Voltar para Uli Zarzana</a>
        </section>
      </main>
    );
  }

  return (
    <main className="application-page">
      <header className="application-header">
        <a className="application-brand" href="https://ulizarzana.com/bio" aria-label="Voltar para Uli Zarzana">Uli Zarzana</a>
        <div className="application-header-meta"><span>MENTORIA</span><span>ENTRE POTENCIAL E RESULTADO</span></div>
      </header>

      <div className="application-layout">
        <aside className="application-aside">
          <span className="eyebrow">APLICAÇÃO · 2026</span>
          <h1>Potencial que encontra direção.</h1>
          <p>Uma conversa mais profunda sobre o momento que você vive e o resultado que deseja construir.</p>
          <div className="application-aside-rule" />
          <p className="application-aside-note"><strong>Leva cerca de 8 minutos.</strong> Responda com presença. Suas respostas serão usadas apenas para a análise desta aplicação.</p>
        </aside>

        <section className="application-card" aria-labelledby="application-step-title">
          <div className="application-progress-header">
            <span>Etapa {String(stepIndex + 1).padStart(2, '0')} de {String(steps.length).padStart(2, '0')}</span>
            <span>{progress}%</span>
          </div>
          <div className="application-progress-track" aria-label="Progresso da aplicação" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>

          <div className="application-step-heading">
            <span className="eyebrow">{step.eyebrow}</span>
            <h2 id="application-step-title">{step.title}</h2>
            <p>{step.description}</p>
          </div>

          <div className="application-step-content">
            {stepIndex === 0 && <OrientationStep />}
            {stepIndex === 1 && <IdentificationStep application={application} updateField={updateField} errors={errors} />}
            {stepIndex === 2 && <ProfessionalStep application={application} updateField={updateField} errors={errors} />}
            {stepIndex === 3 && <MomentStep application={application} updateField={updateField} errors={errors} />}
            {stepIndex === 4 && <ChallengeStep application={application} updateField={updateField} errors={errors} />}
            {stepIndex === 5 && <ExpectationsStep application={application} updateField={updateField} errors={errors} />}
            {stepIndex === 6 && <AvailabilityStep application={application} updateField={updateField} errors={errors} />}
            {stepIndex === 7 && <TermsStep application={application} updateField={updateField} error={fieldError(errors, 'terms_accepted')} />}
          </div>

          {currentStepErrors.length > 0 && <p className="application-error-summary" role="alert">Revise os campos destacados para continuar.</p>}
          {submitError && <p className="application-error-summary" role="alert">{submitError}</p>}

          <div className="application-actions">
            {stepIndex > 0 ? <button className="application-button application-button-secondary" type="button" onClick={previousStep}>Voltar</button> : <span />}
            {stepIndex < steps.length - 1 ? <button className="application-button application-button-primary" type="button" onClick={nextStep}>Continuar <span aria-hidden="true">→</span></button> : <button className="application-button application-button-primary" type="button" onClick={submitApplication} disabled={isSubmitting}>{isSubmitting ? 'Enviando…' : 'Enviar respostas'}</button>}
          </div>
          <p className="application-privacy">Não enviamos suas respostas antes da etapa final. Este formulário é uma aplicação, não uma confirmação de participação.</p>
        </section>
      </div>
    </main>
  );
}

function OrientationStep() {
  return <div className="application-orientation"><p>A Mentoria Entre Potencial e Resultado não é para todas as pessoas.</p><p>Ela foi criada para quem já percebeu que possui mais potencial do que os resultados que está vivendo hoje e está disposto a assumir responsabilidade pela própria transformação.</p><p>O preenchimento desta aplicação não garante sua participação. Cada inscrição será analisada individualmente e as vagas serão destinadas apenas às pessoas que demonstrarem clareza de objetivos, comprometimento e disposição para implementar mudanças reais.</p><p>Se você está buscando apenas informação, este talvez não seja o momento. Mas se está buscando transformação, seja bem-vindo(a).</p><p>Um abraço,<br /><strong>Uli Zarzana</strong></p></div>;
}

type StepProps = {
  application: MentorshipApplicationInput;
  updateField: <Field extends keyof MentorshipApplicationInput>(field: Field, value: MentorshipApplicationInput[Field]) => void;
  errors: ReturnType<typeof validateMentorshipApplication>;
};

function TextField({ field, application, updateField, errors, type = 'text', placeholder }: StepProps & { field: keyof MentorshipApplicationInput; type?: string; placeholder?: string }) {
  const error = fieldError(errors, field);
  const value = application[field];
  return <label className="application-field"><span>{fieldLabels[field]}{field !== 'additional_information' && field !== 'previous_mentoring_experience' && field !== 'schedule_notes' && <b aria-hidden="true">*</b>}</span><input className={inputClass(error)} type={type} value={String(value)} placeholder={placeholder} onChange={(event) => updateField(field, event.target.value as never)} aria-invalid={Boolean(error)} />{error && <small className="application-field-error">{error}</small>}</label>;
}

function TextAreaField({ field, application, updateField, errors, placeholder, optional = false }: StepProps & { field: keyof MentorshipApplicationInput; placeholder?: string; optional?: boolean }) {
  const error = fieldError(errors, field);
  return <label className="application-field"><span>{fieldLabels[field]}{!optional && <b aria-hidden="true">*</b>}</span><textarea className={inputClass(error)} value={String(application[field])} placeholder={placeholder} onChange={(event) => updateField(field, event.target.value as never)} aria-invalid={Boolean(error)} rows={5} />{error && <small className="application-field-error">{error}</small>}</label>;
}

function ChoiceGroup<Field extends keyof MentorshipApplicationInput>({ field, label, options, application, updateField, errors }: StepProps & { field: Field; label: string; options: readonly { value: MentorshipApplicationInput[Field]; label: string }[] }) {
  const error = fieldError(errors, field);
  return <fieldset className="application-choice-group"><legend>{label}<b aria-hidden="true">*</b></legend><div className="application-choice-grid">{options.map((option) => <label className={`application-choice ${application[field] === option.value ? 'is-selected' : ''}`} key={String(option.value)}><input type="radio" name={String(field)} value={String(option.value)} checked={application[field] === option.value} onChange={() => updateField(field, option.value)} /><span>{option.label}</span></label>)}</div>{error && <small className="application-field-error">{error}</small>}</fieldset>;
}

function IdentificationStep({ application, updateField, errors }: StepProps) {
  return <div className="application-fields"><div className="application-field-grid"><TextField field="full_name" application={application} updateField={updateField} errors={errors} /><TextField field="whatsapp" application={application} updateField={updateField} errors={errors} placeholder="(00) 00000-0000" /><TextField field="email" application={application} updateField={updateField} errors={errors} type="email" placeholder="voce@exemplo.com" /><TextField field="city_state" application={application} updateField={updateField} errors={errors} placeholder="Ex.: São Paulo/SP" /><TextField field="birth_date" application={application} updateField={updateField} errors={errors} type="date" /></div><ChoiceGroup field="discovery_source" label={fieldLabels.discovery_source ?? ''} options={DISCOVERY_SOURCES.map((value) => ({ value, label: sourceLabels[value] }))} application={application} updateField={updateField} errors={errors} />{application.discovery_source === 'outro' && <TextField field="discovery_source_other" application={application} updateField={updateField} errors={errors} placeholder="Ex.: podcast, evento…" />}</div>;
}

function ProfessionalStep({ application, updateField, errors }: StepProps) {
  return <div className="application-fields"><TextAreaField field="professional_situation" application={application} updateField={updateField} errors={errors} placeholder="Cargo ou atividade, setor e momento profissional…" /><p className="application-helper">Não precisa ser um currículo. Queremos entender o contexto a partir do qual você está buscando o próximo resultado.</p></div>;
}

function MomentStep({ application, updateField, errors }: StepProps) {
  return <div className="application-fields"><TextAreaField field="motivation" application={application} updateField={updateField} errors={errors} placeholder="O que fez você perceber que este é o momento de buscar mentoria?" /><TextAreaField field="desired_result" application={application} updateField={updateField} errors={errors} placeholder="Descreva um resultado profissional específico e observável…" /></div>;
}

function ChallengeStep({ application, updateField, errors }: StepProps) {
  return <div className="application-fields"><TextAreaField field="main_obstacle" application={application} updateField={updateField} errors={errors} placeholder="O que está entre você e o próximo nível hoje?" /><ChoiceGroup field="preferred_format" label={fieldLabels.preferred_format ?? ''} options={PREFERRED_FORMATS.map((value) => ({ value, label: formatLabels[value] }))} application={application} updateField={updateField} errors={errors} /><TextAreaField field="previous_mentoring_experience" application={application} updateField={updateField} errors={errors} placeholder="Se sim, descreva brevemente. Se não, escreva ‘não tive’." optional /></div>;
}

function ExpectationsStep({ application, updateField, errors }: StepProps) {
  return <div className="application-fields"><TextAreaField field="expectations" application={application} updateField={updateField} errors={errors} placeholder="O que você espera construir ou transformar com a mentoria?" /><TextAreaField field="selection_reason" application={application} updateField={updateField} errors={errors} placeholder="Fale sobre sua disposição, contexto e o que torna esta oportunidade importante para você." /><TextAreaField field="additional_information" application={application} updateField={updateField} errors={errors} placeholder="Opcional" optional /></div>;
}

function AvailabilityStep({ application, updateField, errors }: StepProps) {
  return <div className="application-fields"><ChoiceGroup field="financial_availability" label={fieldLabels.financial_availability ?? ''} options={FINANCIAL_AVAILABILITIES.map((value) => ({ value, label: financialLabels[value] }))} application={application} updateField={updateField} errors={errors} /><ChoiceGroup field="preferred_session_period" label={fieldLabels.preferred_session_period ?? ''} options={SESSION_PERIODS.map((value) => ({ value, label: periodLabels[value] }))} application={application} updateField={updateField} errors={errors} /><TextAreaField field="schedule_notes" application={application} updateField={updateField} errors={errors} placeholder="Opcional" optional /><ChoiceGroup field="commitment_level" label={fieldLabels.commitment_level ?? ''} options={COMMITMENT_LEVELS.map((value) => ({ value, label: commitmentLabels[value] }))} application={application} updateField={updateField} errors={errors} /></div>;
}

function TermsStep({ application, updateField, error }: { application: MentorshipApplicationInput; updateField: StepProps['updateField']; error?: string }) {
  return <div className="application-terms"><div className="application-review-note"><span className="eyebrow">ANTES DE ENVIAR</span><p>Ao preencher este formulário, você declara que as informações fornecidas são verdadeiras e compreende que a aprovação para a mentoria será realizada com base na análise individual de cada aplicação.</p></div><label className={`application-terms-check ${error ? 'has-error' : ''}`}><input type="checkbox" checked={application.terms_accepted} onChange={(event) => updateField('terms_accepted', event.target.checked)} /><span>Concordo com os termos e condições acima.</span></label>{error && <small className="application-field-error">{error}</small>}<p className="application-helper">Ao enviar, suas respostas serão registradas com segurança para análise interna da equipe da Uli.</p></div>;
}
