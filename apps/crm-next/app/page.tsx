import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '../lib/supabase/server';
import { SignOutButton } from '../components/sign-out-button';

export const dynamic = 'force-dynamic';

const statusLabels = [
  ['novo', 'Novo'],
  ['qualificando', 'Qualificando'],
  ['oferta', 'Oferta'],
  ['ganho', 'Ganho'],
  ['perdido', 'Perdido'],
] as const;

const metricLabels = [
  ['newLeads', 'Novos leads hoje', 'entradas desde 00:00'],
  ['applications', 'Aplicações de mentoria', 'recebidas hoje'],
  ['qualifying', 'Leads em qualificação', 'estado atual'],
  ['offers', 'Ofertas apresentadas hoje', 'registros no dia'],
  ['won', 'Ganhos hoje', 'conversões confirmadas'],
  ['lost', 'Perdidos hoje', 'encerramentos no dia'],
  ['pendingTasks', 'Tarefas pendentes hoje', 'prazo até o fim do dia'],
] as const;

type LeadRow = { id: string; status: string; created_at: string };
type OfferRow = { presented_at: string };
type FunnelEventRow = { to_status: string; created_at: string };
type TaskRow = { id: string; title: string; due_at: string | null; completed_at: string | null };
type ApplicationRow = { submitted_at: string };

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function isToday(value: string | null, today: string) {
  return value ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(value)) === today : false;
}

export default async function HomePage() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return <AccessState title="Configuração do Supabase" detail="As variáveis públicas do ambiente ainda não estão disponíveis neste runtime." />;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle();
  if (profileError || !profile) {
    return <AccessState title="Perfil operacional pendente" detail="Seu usuário Auth existe, mas ainda não está associado a um perfil administrador ou comercial." />;
  }

  const [{ data: leads, error: leadsError }, { data: offers, error: offersError }, { data: events, error: eventsError }, { data: tasks, error: tasksError }, { data: applications, error: applicationsError }] = await Promise.all([
    supabase.from('leads').select('id, status, created_at'),
    supabase.from('offers').select('presented_at'),
    supabase.from('funnel_events').select('to_status, created_at'),
    supabase.from('tasks').select('id, title, due_at, completed_at').order('due_at', { ascending: true }).limit(5),
    supabase.from('mentoria_entre_potencial_resultado_applications').select('submitted_at'),
  ]);

  const queryError = leadsError || offersError || eventsError || tasksError || applicationsError;
  if (queryError) {
    return <AccessState title="Não foi possível consultar o CRM" detail="A sessão existe, mas as tabelas ainda não estão acessíveis para este perfil." />;
  }

  const today = todayInSaoPaulo();
  const leadRows = (leads ?? []) as LeadRow[];
  const offerRows = (offers ?? []) as OfferRow[];
  const eventRows = (events ?? []) as FunnelEventRow[];
  const taskRows = (tasks ?? []) as TaskRow[];
  const applicationRows = (applications ?? []) as ApplicationRow[];
  const metrics = {
    newLeads: leadRows.filter((lead) => isToday(lead.created_at, today)).length,
    applications: applicationRows.filter((application) => isToday(application.submitted_at, today)).length,
    qualifying: leadRows.filter((lead) => lead.status === 'qualificando').length,
    offers: offerRows.filter((offer) => isToday(offer.presented_at, today)).length,
    won: eventRows.filter((event) => event.to_status === 'ganho' && isToday(event.created_at, today)).length,
    lost: eventRows.filter((event) => event.to_status === 'perdido' && isToday(event.created_at, today)).length,
    pendingTasks: taskRows.filter((task) => !task.completed_at && isToday(task.due_at, today)).length,
  };
  const pipeline = statusLabels.map(([key, label]) => ({ key, label, count: leadRows.filter((lead) => lead.status === key).length }));
  const visibleTasks = taskRows.filter((task) => !task.completed_at).slice(0, 3);

  return (
    <main className="crm-page">
      <header className="crm-header">
        <div><span className="eyebrow">OPERAÇÃO COMERCIAL · HOJE</span><h1>Visão Geral</h1><p className="lede">Uma leitura clara do que está acontecendo na operação comercial da Uli.</p></div>
        <div className="header-actions"><Link className="primary-action" href="/capas">Criar capa para Instagram</Link><Link className="button-secondary" href="/aplicacoes">Aplicações recebidas</Link><span className="user-badge">{profile.full_name} · {profile.role === 'administradora' ? 'Usuário administrador' : 'Usuário comercial'}</span><SignOutButton /></div>
      </header>
      <section className="metric-grid" aria-label="Indicadores de hoje">
        {metricLabels.map(([key, label, detail]) => <article className="metric-card" key={key}><small>{label}</small><strong>{metrics[key]}</strong><em>{detail}</em></article>)}
      </section>
      <section className="content-grid">
        <article className="panel"><span className="eyebrow">MOVIMENTAÇÃO</span><h2>Visão do pipeline</h2><div className="pipeline-bars">{pipeline.map((item) => <div className="pipeline-bar" key={item.key}><b>{item.count}</b><i style={{ height: `${Math.max(28, item.count * 54)}px` }} /><span>{item.label}</span></div>)}</div></article>
        <article className="panel"><span className="eyebrow">ATENÇÃO</span><h2>Tarefas de hoje</h2>{visibleTasks.length ? <ul className="task-list">{visibleTasks.map((task) => <li key={task.id}><span className="task-check" />{task.title}</li>)}</ul> : <p className="empty-state">Nenhuma tarefa pendente encontrada.</p>}</article>
      </section>
      <p className="principle">“Diagnóstico antes de recomendação.” O CRM organiza a decisão comercial sem perder a leitura humana de cada relacionamento.</p>
    </main>
  );
}

function AccessState({ title, detail }: { title: string; detail: string }) {
  return <main className="auth-page"><section className="auth-card"><span className="eyebrow">ECOSSISTEMA DIGITAL · ACESSO INTERNO</span><h1>{title}</h1><p className="lede">{detail}</p><a className="text-link" href="/login">Voltar para o login</a></section></main>;
}
