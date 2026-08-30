import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SignOutButton } from '../../components/sign-out-button';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const TABLE = 'mentoria_entre_potencial_resultado_applications';
const sourceLabels: Record<string, string> = {
  instagram: 'Instagram',
  aula_gratuita: 'Aula gratuita',
  indicacao: 'Indicação',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  outro: 'Outro',
};

type ApplicationSummary = {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string;
  city_state: string;
  discovery_source: string;
  preferred_format: string;
  commitment_level: string;
  submitted_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
}

function formatOption(value: string) {
  return value === 'individual' ? 'Individual' : value === 'grupo' ? 'Em grupo' : value === 'orientacao' ? 'Orientação' : value;
}

export default async function ApplicationsPage() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return <AccessState title="Configuração do Supabase" detail="As variáveis públicas do ambiente ainda não estão disponíveis neste runtime." />;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle();
  if (!profile || !['administradora', 'comercial'].includes(profile.role)) {
    return <AccessState title="Acesso restrito" detail="Esta área está disponível apenas para usuários administradores ou comerciais." />;
  }

  const { data, error } = await supabase.from(TABLE).select('id, full_name, whatsapp, email, city_state, discovery_source, preferred_format, commitment_level, submitted_at').order('submitted_at', { ascending: false });
  const applications = (data ?? []) as ApplicationSummary[];

  return (
    <main className="crm-page applications-page">
      <header className="crm-header">
        <div><Link className="cover-back-link" href="/">← Voltar para Visão Geral</Link><span className="eyebrow">APLICAÇÕES · MENTORIA</span><h1>Aplicações recebidas</h1><p className="lede">Leia cada história com contexto antes de decidir qual é o próximo contato.</p></div>
        <div className="applications-header-actions"><span className="user-badge">{profile.full_name} · {profile.role === 'administradora' ? 'Usuário administrador' : 'Usuário comercial'}</span><SignOutButton /></div>
      </header>

      <section className="panel">
        <div className="applications-toolbar"><div><span className="eyebrow">MENTORIA ENTRE POTENCIAL E RESULTADO</span><p>{applications.length} {applications.length === 1 ? 'aplicação recebida' : 'aplicações recebidas'}</p></div><span className="application-status">Aguardando análise</span></div>
        {error ? <div className="application-empty"><p className="empty-state">Não foi possível consultar as aplicações neste momento.</p></div> : applications.length === 0 ? <div className="application-empty"><p className="empty-state">As novas aplicações aparecerão aqui assim que forem enviadas.</p></div> : <div className="applications-table-wrap"><table className="applications-table"><caption className="visually-hidden">Aplicações recebidas para análise</caption><thead><tr><th>Aplicante</th><th>Contato</th><th>Origem</th><th>Formato</th><th>Comprometimento</th><th>Recebida em</th><th><span className="visually-hidden">Ação</span></th></tr></thead><tbody>{applications.map((application) => <tr key={application.id}><td><Link href={`/aplicacoes/${application.id}`}><strong>{application.full_name}</strong></Link><span>{application.city_state}</span></td><td><strong>{application.email}</strong><span>{application.whatsapp}</span></td><td>{sourceLabels[application.discovery_source] ?? application.discovery_source}</td><td>{formatOption(application.preferred_format)}</td><td>{application.commitment_level}</td><td>{formatDate(application.submitted_at)}</td><td><Link href={`/aplicacoes/${application.id}`}>Ler aplicação →</Link></td></tr>)}</tbody></table></div>}
      </section>
    </main>
  );
}

function AccessState({ title, detail }: { title: string; detail: string }) {
  return <main className="auth-page"><section className="auth-card"><span className="eyebrow">ECOSSISTEMA DIGITAL · APLICAÇÕES</span><h1>{title}</h1><p className="lede">{detail}</p><Link className="text-link" href="/">Voltar para a Visão Geral</Link></section></main>;
}
