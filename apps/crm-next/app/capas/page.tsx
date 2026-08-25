import { redirect } from 'next/navigation';
import { SignOutButton } from '../../components/sign-out-button';
import CoverStudio from '../../components/cover-studio';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CoversPage() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return <AccessState title="Configuração do Supabase" detail="As variáveis públicas do ambiente ainda não estão disponíveis neste runtime." />;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle();
  if (error || !profile) {
    return <AccessState title="Perfil operacional pendente" detail="Seu usuário Auth existe, mas ainda não está associado a um perfil administrador ou comercial." />;
  }

  return (
    <main className="crm-page cover-page">
      <header className="crm-header cover-header">
        <div><a className="text-link cover-back-link" href="/">← Voltar para Visão Geral</a><span className="eyebrow">ECOSSISTEMA DIGITAL · CONTEÚDO</span><h1>Estúdio de capas</h1><p className="lede">Transforme a mídia que você acabou de gravar em uma capa editorial pronta para o Instagram.</p></div>
        <div className="header-actions"><span className="user-badge">{profile.full_name} · {profile.role === 'administradora' ? 'Usuário administrador' : 'Usuário comercial'}</span><SignOutButton /></div>
      </header>
      <CoverStudio />
    </main>
  );
}

function AccessState({ title, detail }: { title: string; detail: string }) {
  return <main className="auth-page"><section className="auth-card"><span className="eyebrow">ECOSSISTEMA DIGITAL · ACESSO INTERNO</span><h1>{title}</h1><p className="lede">{detail}</p><a className="text-link" href="/login">Voltar para o login</a></section></main>;
}
