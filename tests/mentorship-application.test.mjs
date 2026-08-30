import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { validateMentorshipApplication } from '../apps/crm-next/lib/applications/mentorship-application.ts';

function validApplication() {
  return {
    full_name: 'Pessoa de teste',
    whatsapp: '+55 11 99999-9999',
    email: 'pessoa@example.com',
    city_state: 'São Paulo/SP',
    birth_date: '1990-01-15',
    discovery_source: 'instagram',
    discovery_source_other: '',
    professional_situation: 'Diretora em uma empresa de serviços.',
    motivation: 'Quero estruturar meu próximo movimento profissional.',
    desired_result: 'Assumir uma posição de liderança em até 12 meses.',
    main_obstacle: 'Ainda não comunico meu valor com clareza.',
    preferred_format: 'individual',
    previous_mentoring_experience: 'Participei de uma mentoria de carreira.',
    expectations: 'Quero clareza e um plano de implementação.',
    selection_reason: 'Tenho disponibilidade e disposição para executar.',
    additional_information: '',
    financial_availability: 'sim',
    preferred_session_period: 'noite',
    schedule_notes: '',
    commitment_level: '7-8',
    terms_accepted: true,
  };
}

test('accepts a complete application with terms accepted', () => {
  assert.deepEqual(validateMentorshipApplication(validApplication()), []);
});

test('rejects missing required fields, invalid options and terms not accepted', () => {
  const errors = validateMentorshipApplication({
    ...validApplication(),
    full_name: '',
    commitment_level: '11-12',
    terms_accepted: false,
  });

  assert.ok(errors.some((error) => error.field === 'full_name'));
  assert.ok(errors.some((error) => error.field === 'commitment_level'));
  assert.ok(errors.some((error) => error.field === 'terms_accepted'));
});

test('requires the free-text origin only when discovery_source is outro', () => {
  const errors = validateMentorshipApplication({
    ...validApplication(),
    discovery_source: 'outro',
    discovery_source_other: '',
  });

  assert.ok(errors.some((error) => error.field === 'discovery_source_other'));
});

test('accepts the conditional format and origin values', () => {
  const errors = validateMentorshipApplication({
    ...validApplication(),
    discovery_source: 'outro',
    discovery_source_other: 'Podcast',
    preferred_format: 'orientacao',
    financial_availability: 'talvez',
    preferred_session_period: 'manha',
    commitment_level: '0-3',
  });

  assert.deepEqual(errors, []);
});

test('defines a public submission route and preserves protected CRM routes', async () => {
  const route = await readFile(new URL('../apps/crm-next/app/api/aplicacoes/mentoria-entre-potencial-e-resultado/route.ts', import.meta.url), 'utf8');
  const middleware = await readFile(new URL('../apps/crm-next/middleware.ts', import.meta.url), 'utf8');

  assert.match(route, /export async function POST/);
  assert.match(route, /validateMentorshipApplication/);
  assert.match(route, /mentoria_entre_potencial_resultado_applications/);
  assert.match(route, /status: 400/);
  assert.match(route, /status: 500/);
  assert.match(middleware, /aplicacao\/mentoria-entre-potencial-e-resultado/);
  assert.match(middleware, /api\/aplicacoes\/mentoria-entre-potencial-e-resultado/);
});

test('defines the public application wizard as a guided eight-step flow', async () => {
  const page = await readFile(new URL('../apps/crm-next/app/aplicacao/mentoria-entre-potencial-e-resultado/page.tsx', import.meta.url), 'utf8');
  const wizard = await readFile(new URL('../apps/crm-next/components/mentorship-application-wizard.tsx', import.meta.url), 'utf8');

  assert.match(page, /MentorshipApplicationWizard/);
  assert.match(wizard, /Mentoria Entre Potencial e Resultado/);
  assert.match(wizard, /ORIENTAÇÃO/);
  assert.match(wizard, /ETAPA 08/);
  assert.match(wizard, /aria-label="Progresso da aplicação"/);
  assert.match(wizard, /Enviar respostas/);
  assert.match(wizard, /fetch\('\/api\/aplicacoes\/mentoria-entre-potencial-e-resultado'/);
  assert.match(wizard, /terms_accepted/);
  assert.match(wizard, /Não enviamos suas respostas antes da etapa final/);
});

test('defines authenticated CRM application list and detail routes', async () => {
  const list = await readFile(new URL('../apps/crm-next/app/aplicacoes/page.tsx', import.meta.url), 'utf8');
  const detail = await readFile(new URL('../apps/crm-next/app/aplicacoes/[id]/page.tsx', import.meta.url), 'utf8');

  assert.match(list, /mentoria_entre_potencial_resultado_applications/);
  assert.match(list, /Aplicações recebidas/);
  assert.match(list, /href=\{`\/aplicacoes\/\$\{application\.id\}`\}/);
  assert.match(detail, /params: Promise<\{ id: string \}>/);
  assert.match(detail, /Todas as respostas/);
  assert.match(detail, /mentoria_entre_potencial_resultado_applications/);
});

test('defines the static main-domain application package and its scoped deployment', async () => {
  const page = await readFile(new URL('../web/mentoria-entre-potencial-e-resultado/index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../web/mentoria-entre-potencial-e-resultado/application.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../web/mentoria-entre-potencial-e-resultado/application.css', import.meta.url), 'utf8');
  const workflow = await readFile(new URL('../.github/workflows/deploy-mentorship-application.yml', import.meta.url), 'utf8');

  assert.match(page, /Mentoria Entre Potencial e Resultado/);
  assert.match(page, /id="mentorship-application"/);
  assert.match(script, /crm\.ulizarzana\.com\/api\/aplicacoes\/mentoria-entre-potencial-e-resultado/);
  assert.match(script, /terms_accepted/);
  assert.match(script, /Não enviamos suas respostas antes da etapa final/);
  assert.match(styles, /--application-ink:\s*#332a26/);
  assert.match(styles, /@media \(max-width: 720px\)/);
  assert.match(workflow, /web\/mentoria-entre-potencial-e-resultado/);
  assert.match(workflow, /server-dir: \.\//);
});

test('adds explicit CORS handling for the public main-domain origin', async () => {
  const route = await readFile(new URL('../apps/crm-next/app/api/aplicacoes/mentoria-entre-potencial-e-resultado/route.ts', import.meta.url), 'utf8');

  assert.match(route, /export async function OPTIONS/);
  assert.match(route, /https:\/\/ulizarzana\.com/);
  assert.match(route, /Access-Control-Allow-Origin/);
  assert.match(route, /Access-Control-Allow-Methods/);
  assert.match(route, /Vary.*Origin/);
});

test('defines a branded dark mode toggle and mobile-safe layout', async () => {
  const page = await readFile(new URL('../web/mentoria-entre-potencial-e-resultado/index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../web/mentoria-entre-potencial-e-resultado/application.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../web/mentoria-entre-potencial-e-resultado/application.css', import.meta.url), 'utf8');

  assert.match(page, /data-theme-toggle/);
  assert.match(page, /Alternar tema/);
  assert.match(script, /data-theme/);
  assert.match(styles, /\[data-theme="dark"\]/);
  assert.match(styles, /prefers-color-scheme: dark/);
  assert.match(styles, /min-height: 100dvh/);
  assert.match(styles, /touch-action: manipulation/);
});

test('keeps the desktop aside title inside its available column width', async () => {
  const styles = await readFile(new URL('../web/mentoria-entre-potencial-e-resultado/application.css', import.meta.url), 'utf8');

  assert.match(styles, /\.application-aside h1\s*\{[\s\S]*max-width: 100%;[\s\S]*font-size: clamp\(2\.5rem, 3vw, 3\.5rem\);/);
});
