import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { SignOutButton } from '../../../components/sign-out-button';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const TABLE = 'mentoria_entre_potencial_resultado_applications';
const sourceLabels: Record<string, string> = { instagram: 'Instagram', aula_gratuita: 'Aula gratuita', indicacao: 'Indicação', whatsapp: 'WhatsApp', linkedin: 'LinkedIn', outro: 'Outro' };
const formatLabels: Record<string, string> = { individual: 'Mentoria individual', grupo: 'Mentoria em grupo', orientacao: 'Ainda não sei · gostaria de orientação' };
const financialLabels: Record<string, string> = { sim: 'Sim', talvez: 'Talvez', nao: 'Não' };
const periodLabels: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };

type Application = {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string;
  city_state: string;
  birth_date: string;
  discovery_source: string;
  discovery_source_other: string | null;
  professional_situation: string;
  motivation: string;
  desired_result: string;
  main_obstacle: string;
  preferred_format: string;
  previous_mentoring_experience: string | null;
  expectations: string;
  selection_reason: string;
  additional_information: string | null;
  financial_availability: string;
  preferred_session_period: string;
  schedule_notes: string | null;
  commitment_level: string;
  terms_accepted: boolean;
  submitted_at: string;
};

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
}

function formatBirthDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}

function answer(label: string, value: string | null | undefined, wide = false) {
  return <div className={`application-answer ${wide ? 'application-answer-wide' : ''}`}><dt>{label}</dt><dd>{value?.trim() || 'Não informado'}</dd></div>;
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return <AccessState title="Configuração do Supabase" detail="As variáveis públicas do ambiente ainda não estão disponíveis neste runtime." />;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle();
  if (!profile || !['administradora', 'comercial'].includes(profile.role)) return <AccessState title="Acesso restrito" detail="Esta área está disponível apenas para usuários administradores ou comerciais." />;

  const { id } = await params;
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error || !data) notFound();
  const application = data as Application;

  return <main className="crm-page applications-page"><header className="crm-header"><div><Link className="cover-back-link" href="/aplicacoes">← Voltar para aplicações</Link><span className="eyebrow">APLICAÇÃO · ANÁLISE INDIVIDUAL</span><h1>{application.full_name}</h1><p className="application-detail-meta">Recebida em {formatSubmittedAt(application.submitted_at)} · <span className="application-status">Aguardando análise</span></p></div><div className="applications-header-actions"><span className="user-badge">{profile.full_name} · {profile.role === 'administradora' ? 'Usuário administrador' : 'Usuário comercial'}</span><SignOutButton /></div></header><section className="application-detail-sections"><article className="panel application-detail-section"><span className="eyebrow">IDENTIFICAÇÃO</span><h2>Dados da aplicação</h2><dl className="application-answer-grid">{answer('Nome completo', application.full_name)}{answer('WhatsApp', application.whatsapp)}{answer('E-mail', application.email)}{answer('Cidade/Estado', application.city_state)}{answer('Data de nascimento', formatBirthDate(application.birth_date))}{answer('Como conheceu a mentoria', application.discovery_source === 'outro' && application.discovery_source_other ? `Outro · ${application.discovery_source_other}` : sourceLabels[application.discovery_source] ?? application.discovery_source)}</dl></article><article className="panel application-detail-section"><span className="eyebrow">CONTEXTO E DIREÇÃO</span><h2>O momento profissional</h2><dl className="application-answer-grid">{answer('Situação profissional atual', application.professional_situation, true)}{answer('Por que busca mentoria agora', application.motivation, true)}{answer('Resultado desejado em 6 a 12 meses', application.desired_result, true)}{answer('Principal obstáculo', application.main_obstacle, true)}</dl></article><article className="panel application-detail-section"><span className="eyebrow">ADERÊNCIA À MENTORIA</span><h2>Formato, expectativas e disponibilidade</h2><dl className="application-answer-grid">{answer('Formato de maior interesse', formatLabels[application.preferred_format] ?? application.preferred_format)}{answer('Experiência prévia com mentoria', application.previous_mentoring_experience)}{answer('Expectativas', application.expectations, true)}{answer('Por que deveria ser selecionado', application.selection_reason, true)}{answer('Disponibilidade financeira', financialLabels[application.financial_availability] ?? application.financial_availability)}{answer('Melhor período para sessão', periodLabels[application.preferred_session_period] ?? application.preferred_session_period)}{answer('Considerações sobre horário', application.schedule_notes)}{answer('Nível de comprometimento', application.commitment_level)}</dl></article><article className="panel application-detail-section"><span className="eyebrow">INFORMAÇÕES FINAIS</span><h2>Todas as respostas</h2><dl className="application-answer-grid">{answer('Informação adicional', application.additional_information, true)}{answer('Termos e condições', application.terms_accepted ? 'Concordou com os termos e condições.' : 'Não concordou', true)}</dl></article></section></main>;
}

function AccessState({ title, detail }: { title: string; detail: string }) {
  return <main className="auth-page"><section className="auth-card"><span className="eyebrow">ECOSSISTEMA DIGITAL · APLICAÇÕES</span><h1>{title}</h1><p className="lede">{detail}</p><Link className="text-link" href="/">Voltar para a Visão Geral</Link></section></main>;
}
