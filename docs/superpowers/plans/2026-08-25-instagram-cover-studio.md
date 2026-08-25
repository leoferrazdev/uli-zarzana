# Estúdio de Capas para Instagram do CRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a rota autenticada `/capas`, capaz de transformar localmente um vídeo ou uma foto em uma capa social da Uli, com quatro modelos editoriais, prévia 9:16 e exportação PNG/JPG em 1080 × 1920 px.

**Architecture:** A página server-side protegida reutiliza a sessão Supabase existente e monta um componente client-side para o fluxo de quatro etapas. A mídia permanece em `Object URL` no navegador; o renderizador usa `HTMLCanvasElement` para enquadrar a imagem, aplicar degradê de leitura, desenhar os três blocos textuais e entregar um `Blob` para download. Nenhuma mídia ou metadado da capa será persistido.

**Tech Stack:** Next.js 16.3.0 App Router, React 19, TypeScript, Supabase SSR apenas para autenticação, Canvas 2D, CSS existente com tokens A1/B1, Node 22 built-in test runner.

## Global Constraints

- Canvas final de `1080 × 1920 px`, proporção `9:16`.
- O módulo aceitará uma única mídia: vídeo ou foto.
- Vídeos terão três frames locais em aproximadamente `25%`, `50%` e `75%` da duração, com recomendação automática do frame central.
- A mídia não será enviada ao Supabase, a endpoint do CRM ou a qualquer armazenamento no MVP.
- A composição terá exatamente três blocos textuais: contexto, headline e subtítulo.
- A headline usará Libre Baskerville 700; contexto e subtítulo usarão Source Sans 3.
- As cores de interface e exportação usarão somente `#332A26`, `#F7F0E7`, `#CDAE85` e `#B46F52`, além de transparências dessas cores.
- A arte não conterá nome da expert, métricas, ícones, rodapé técnico ou indicação de formato.
- O layout da arte será fixo; a usuária editará apenas mídia e textos curtos.
- A rota exigirá sessão Auth e perfil operacional existente, como a Visão Geral.
- Alterações não relacionadas já presentes no worktree não devem ser incluídas nos commits.

---

### Task 1: Criar o contrato testável dos presets e das dimensões

**Files:**
- Create: `apps/crm-next/lib/covers/cover-presets.ts`
- Create: `tests/cover-studio.test.mjs`
- Modify: `apps/crm-next/package.json: scripts`

**Interfaces:**
- Produces `COVER_DIMENSIONS: { readonly width: 1080; readonly height: 1920 }`.
- Produces `CoverPresetId = 'carreira' | 'lideranca' | 'autoridade' | 'ascensao'`.
- Produces `CoverPreset = { id, label, context, headline, subtitle }`.
- Produces `COVER_PRESETS: readonly CoverPreset[]` com os quatro textos aprovados na especificação.
- Produces `COVER_TEXT_LIMITS` para `context`, `headline` e `subtitle`.
- Produces `getCandidateFrameTimes(duration: number): number[]`, retornando tempos finitos e limitados entre `0` e `duration`.
- Produces `validateCoverCopy(copy): { field: string; message: string }[]`, com mensagens para campo vazio ou texto acima do limite.

- [ ] **Step 1: Write the failing test**

Criar testes Node com `node:test` e `node:assert/strict`. O teste deve importar o módulo TypeScript com `--experimental-strip-types` e verificar:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COVER_DIMENSIONS,
  COVER_PRESETS,
  getCandidateFrameTimes,
  validateCoverCopy,
} from '../apps/crm-next/lib/covers/cover-presets.ts';

test('mantém o canvas social aprovado e os quatro modelos editoriais', () => {
  assert.deepEqual(COVER_DIMENSIONS, { width: 1080, height: 1920 });
  assert.deepEqual(COVER_PRESETS.map((preset) => preset.id), [
    'carreira', 'lideranca', 'autoridade', 'ascensao',
  ]);
  for (const preset of COVER_PRESETS) {
    assert.ok(preset.context && preset.headline && preset.subtitle);
  }
});

test('calcula frames em 25%, 50% e 75% sem sair da duração', () => {
  assert.deepEqual(getCandidateFrameTimes(20), [5, 10, 15]);
  assert.deepEqual(getCandidateFrameTimes(0), []);
});

test('sinaliza copy vazia ou longa e aceita um preset curto', () => {
  assert.equal(validateCoverCopy({ context: 'a', headline: 'b', subtitle: 'c' }).length, 0);
  assert.ok(validateCoverCopy({ context: '', headline: 'b', subtitle: 'c' }).some((error) => error.field === 'context'));
  assert.ok(validateCoverCopy({ context: 'a'.repeat(80), headline: 'b', subtitle: 'c' }).length > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/crm-next test`

Expected: FAIL because `cover-presets.ts` and the `test` script ainda não existem.

- [ ] **Step 3: Write minimal implementation**

Implementar os quatro presets exatamente como definidos na especificação:

```ts
export const COVER_PRESETS = [
  { id: 'carreira', label: 'Carreira e reconhecimento', context: 'capacidade que vira', headline: 'autoridade.', subtitle: 'para o próximo passo' },
  { id: 'lideranca', label: 'Liderança e decisão', context: 'decisões maiores pedem', headline: 'presença.', subtitle: 'na liderança' },
  { id: 'autoridade', label: 'Autoridade e influência', context: 'o que você construiu', headline: 'percebido.', subtitle: 'com consistência' },
  { id: 'ascensao', label: 'Ascensão e próximo passo', context: 'o próximo passo pede', headline: 'direção.', subtitle: 'sem perder identidade' },
] as const;
```

Definir limites curtos (`context: 42`, `headline: 36`, `subtitle: 42`), validar `trim()`, devolver mensagens orientadas à ação em português e calcular os três tempos somente quando `duration > 0`.

Adicionar ao `package.json`:

```json
"test": "node --experimental-strip-types --test ../../tests/cover-studio.test.mjs"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/crm-next test`

Expected: PASS nos três testes, sem acessar Supabase ou DOM.

- [ ] **Step 5: Commit**

```bash
git add apps/crm-next/lib/covers/cover-presets.ts apps/crm-next/package.json tests/cover-studio.test.mjs
git commit -m "test: definir contrato do estúdio de capas"
```

---

### Task 2: Implementar o renderizador local da capa

**Files:**
- Create: `apps/crm-next/lib/covers/render-cover.ts`
- Modify: `tests/cover-studio.test.mjs`

**Interfaces:**
- Consumes `COVER_DIMENSIONS`, `CoverCopy` e uma URL local de imagem.
- Produces `CoverCopy = { context: string; headline: string; subtitle: string }`.
- Produces `renderCover(options: { imageUrl: string; copy: CoverCopy; format: 'png' | 'jpeg' }): Promise<Blob>`.
- Produces `loadCoverImage(imageUrl: string): Promise<HTMLImageElement>`.

- [ ] **Step 1: Write the failing test**

Adicionar ao teste de contrato verificações do código do renderizador, pois o Node não possui Canvas 2D: o módulo deve conter `1080`, `1920`, `createLinearGradient`, `#332A26`/`#332a26`, `document.fonts.load`, `canvas.toBlob` e os três rótulos `context`, `headline`, `subtitle`.

```js
import { readFile } from 'node:fs/promises';

test('renderizador preserva o contrato visual e exporta blob', async () => {
  const source = await readFile(new URL('../apps/crm-next/lib/covers/render-cover.ts', import.meta.url), 'utf8');
  for (const token of ['1080', '1920', 'createLinearGradient', 'toBlob', 'document.fonts.load', 'context', 'headline', 'subtitle']) {
    assert.match(source, new RegExp(token.replace('.', '\\.'), 'i'));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/crm-next test`

Expected: FAIL porque `render-cover.ts` ainda não existe.

- [ ] **Step 3: Write minimal implementation**

Implementar:

1. `loadCoverImage` com `new Image()`, `crossOrigin = 'anonymous'` somente antes do `src`, resolução em `onload` e rejeição em `onerror`.
2. `renderCover` criando canvas `1080 × 1920`, carregando as fontes com `document.fonts.load('700 92px "Libre Baskerville"')` e `document.fonts.load('500 38px "Source Sans 3"')` quando a API existir.
3. Desenhar a imagem com `object-fit: cover` matemático: escala `Math.max(width / naturalWidth, height / naturalHeight)`, centralização e recorte simétrico.
4. Aplicar degradê vertical de leitura usando `#332A26` com transparência no alto e opacidade integral na faixa inferior, sem gradiente de cor decorativo.
5. Desenhar contexto e subtítulo com Source Sans 3 em champagne/papel e headline com Libre Baskerville 700 em marfim, com largura máxima de `936px`, quebra de linha controlada e redução até `62px` se necessário.
6. Compor os três blocos em uma zona inferior segura, sem ocupar olhos/rosto quando a imagem permitir, e desenhar um pequeno ponto champagne apenas como acento tipográfico da headline.
7. Converter com `canvas.toBlob(resolve, format === 'png' ? 'image/png' : 'image/jpeg', format === 'jpeg' ? 0.94 : undefined)` e rejeitar se o navegador não produzir blob.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/crm-next test`

Expected: PASS nos quatro testes e nenhum endpoint de mídia adicionado.

- [ ] **Step 5: Commit**

```bash
git add apps/crm-next/lib/covers/render-cover.ts tests/cover-studio.test.mjs
git commit -m "feat: adicionar renderizador local de capas"
```

---

### Task 3: Construir o componente client-side do fluxo guiado

**Files:**
- Create: `apps/crm-next/components/cover-studio.tsx`
- Modify: `tests/cover-studio.test.mjs`

**Interfaces:**
- Consumes `COVER_PRESETS`, `COVER_DIMENSIONS`, `getCandidateFrameTimes`, `validateCoverCopy` e `renderCover`.
- Produces a default export `CoverStudio()` com quatro etapas internas: mídia, imagem, conteúdo e revisão.

- [ ] **Step 1: Write the failing test**

Adicionar testes de contrato para garantir que o componente contenha os rótulos e mecanismos essenciais:

```js
test('componente expõe o fluxo guiado e mantém a mídia local', async () => {
  const source = await readFile(new URL('../apps/crm-next/components/cover-studio.tsx', import.meta.url), 'utf8');
  for (const token of ['Adicionar vídeo ou foto', 'Escolher imagem', 'Definir conteúdo', 'Revisar e baixar', 'createObjectURL', 'revokeObjectURL', 'Baixar PNG', 'Baixar JPG', 'accept="video/*,image/*"']) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/crm-next test`

Expected: FAIL porque `cover-studio.tsx` ainda não existe.

- [ ] **Step 3: Write minimal implementation**

Implementar o componente com:

1. `useState` para etapa, arquivo, tipo, URL de origem, candidatos, frame selecionado, preset, copy, mensagens e estado de exportação.
2. `useRef` para input, `HTMLVideoElement` e URL atual; revogar URLs anteriores ao substituir a mídia e no cleanup do componente.
3. Campo único `<input type="file" accept="video/*,image/*">` mais área de arrastar/soltar acessível por teclado.
4. Para foto, criar URL local, mostrar prévia 9:16 e avançar sem exigir etapa de frames.
5. Para vídeo, montar elemento de vídeo local, aguardar metadata, calcular tempos com `getCandidateFrameTimes`, buscar cada tempo com `currentTime`, capturar miniaturas por canvas e selecionar inicialmente o segundo candidato.
6. Mostrar miniaturas como botões com `aria-pressed`, nome do arquivo, troca de mídia e mensagens de erro específicas.
7. Na etapa de conteúdo, mostrar os quatro presets, preencher copy ao selecionar e manter os três campos editáveis com contagem de caracteres e `validateCoverCopy`.
8. Na etapa de revisão, exibir a capa em proporção 9:16, resumo de origem, retorno às etapas e downloads. O download deve chamar `renderCover`, criar um link temporário, clicar nele e revogar o link.
9. Não usar `fetch` para a mídia, não criar chamada Supabase e não guardar arquivo em estado global ou `localStorage`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/crm-next test`

Expected: PASS nos testes de contrato; os tipos serão validados na build da Task 5.

- [ ] **Step 5: Commit**

```bash
git add apps/crm-next/components/cover-studio.tsx tests/cover-studio.test.mjs
git commit -m "feat: criar fluxo guiado de capas no navegador"
```

---

### Task 4: Expor a rota autenticada e o acesso pela Visão Geral

**Files:**
- Create: `apps/crm-next/app/capas/page.tsx`
- Modify: `apps/crm-next/app/page.tsx`

**Interfaces:**
- Consumes a sessão Supabase server-side existente e `CoverStudio`.
- Produces a rota autenticada `/capas` e um acesso visível com o rótulo `Criar capa para Instagram`.

- [ ] **Step 1: Write the failing test**

Adicionar ao teste de contrato verificações da rota e do acesso no dashboard:

```js
test('rota e dashboard apontam para o estúdio de capas', async () => {
  const route = await readFile(new URL('../apps/crm-next/app/capas/page.tsx', import.meta.url), 'utf8');
  const home = await readFile(new URL('../apps/crm-next/app/page.tsx', import.meta.url), 'utf8');
  assert.match(route, /createSupabaseServerClient/);
  assert.match(route, /redirect\(['"]\/login['"]\)/);
  assert.match(route, /CoverStudio/);
  assert.match(home, /Criar capa para Instagram/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/crm-next test`

Expected: FAIL porque a rota e o acesso ainda não existem.

- [ ] **Step 3: Write minimal implementation**

Criar `app/capas/page.tsx` como server component dinâmico: instanciar `createSupabaseServerClient`, redirecionar para `/login` sem usuário, consultar `profiles` e mostrar um estado de acesso se o perfil não existir; em sucesso, renderizar cabeçalho com `Voltar para Visão Geral`, identificação do usuário e `<CoverStudio />`.

Adicionar à Visão Geral uma ação semântica próxima ao cabeçalho ou ao bloco de operação, usando `<a className="primary-action" href="/capas">Criar capa para Instagram</a>`, sem alterar as métricas reais nem as consultas existentes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/crm-next test`

Expected: PASS nos testes de contrato da rota e do dashboard.

- [ ] **Step 5: Commit**

```bash
git add apps/crm-next/app/capas/page.tsx apps/crm-next/app/page.tsx tests/cover-studio.test.mjs
git commit -m "feat: expor estúdio de capas no crm"
```

---

### Task 5: Aplicar o layout responsivo e a identidade visual do CRM

**Files:**
- Modify: `apps/crm-next/app/globals.css`
- Modify: `tests/cover-studio.test.mjs`

**Interfaces:**
- Consumes os tokens existentes `--color-ink`, `--color-paper`, `--color-champagne`, `--color-terracotta`, `--font-serif` e `--font-sans`.
- Produces classes estáveis para a página, etapas, dropzone, miniaturas, editor, prévia 9:16, mensagens de erro e downloads.

- [ ] **Step 1: Write the failing test**

Adicionar teste que confirme os tokens e breakpoints de comportamento:

```js
test('CSS do estúdio reutiliza tokens da marca e possui layout mobile', async () => {
  const css = await readFile(new URL('../apps/crm-next/app/globals.css', import.meta.url), 'utf8');
  for (const token of ['.cover-studio', '--color-ink', '--color-paper', '--color-champagne', '--font-serif', '@media (max-width: 640px)', '.cover-preview']) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/crm-next test`

Expected: FAIL porque as classes do estúdio ainda não existem.

- [ ] **Step 3: Write minimal implementation**

Adicionar estilos com escopo `.cover-*`: desktop em duas colunas (etapas/editor à esquerda e prévia à direita), cartões em papel translúcido, bordas ink de baixa opacidade, botões ink/champagne e prévia com `aspect-ratio: 9 / 16`. Em até `900px`, empilhar o editor e a prévia; em até `640px`, usar padding reduzido, campos e downloads em largura total, miniaturas roláveis horizontalmente e foco visível. Não criar nova paleta.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/crm-next test`

Expected: PASS nos testes de CSS e contrato do módulo.

- [ ] **Step 5: Commit**

```bash
git add apps/crm-next/app/globals.css tests/cover-studio.test.mjs
git commit -m "style: aplicar sistema visual ao estúdio de capas"
```

---

### Task 6: Validar tipagem, lint, build e entrega

**Files:**
- Modify: `apps/crm-next/package.json` somente se o lint ou build exigirem ajuste de script.
- Modify: `cofre-uli/01 - Estratégia/Decisão - Gerador de Capas para Instagram no CRM 2026-08-25.md` para registrar implementação e validação.

**Interfaces:**
- Consumes todos os arquivos das Tasks 1–5.
- Produces uma build Next.js bem-sucedida, registro no cofre, commit/push na `main` e deployment automático no Hostinger conectado ao GitHub.

- [ ] **Step 1: Run the complete local checks**

Run:

```bash
npm --prefix apps/crm-next test
npm --prefix apps/crm-next run lint
npm --prefix apps/crm-next run build
git diff --check
```

Expected: todos os comandos terminam com código `0`. Se o wrapper `npm run build` permanecer pendente, executar o equivalente direto `node apps/crm-next/node_modules/next/dist/bin/next build --webpack` e registrar o resultado real.

- [ ] **Step 2: Run the production smoke check**

Iniciar o servidor com as variáveis já configuradas no ambiente local, acessar `/login`, autenticar com sessão existente e verificar `/` e `/capas`. Confirmar que a rota sem sessão redireciona para `/login`, que uma foto chega à revisão e que o exportador disponibiliza PNG/JPG. Não enviar mídia real para o repositório, Supabase ou logs.

- [ ] **Step 3: Update the vault**

Atualizar a nota `cofre-uli/01 - Estratégia/Decisão - Gerador de Capas para Instagram no CRM 2026-08-25.md` com:

- status da implementação;
- arquivos principais;
- comandos de validação e seus resultados;
- commit final e situação do deployment;
- limitações mantidas no MVP.

Não registrar credenciais, tokens ou dados pessoais de arquivos de teste.

- [ ] **Step 4: Stage only intended files and commit**

Verificar `git status --short` e adicionar somente os arquivos do módulo, teste, plano/spec e nota do cofre. Preservar `cofre-uli/02 - Identidade Visual/Inventario-Fotografico-Acervo-Uli-2026-08-12.md`, o trabalho do monograma, `supabase/data-base.txt`, `assets/` e artefatos do Graphify se não forem parte desta implementação.

```bash
git add apps/crm-next/app/capas/page.tsx apps/crm-next/app/page.tsx apps/crm-next/app/globals.css apps/crm-next/components/cover-studio.tsx apps/crm-next/lib/covers/cover-presets.ts apps/crm-next/lib/covers/render-cover.ts apps/crm-next/package.json tests/cover-studio.test.mjs cofre-uli/01\ -\ Estratégia/Decisão\ -\ Gerador\ de\ Capas\ para\ Instagram\ no\ CRM\ 2026-08-25.md docs/superpowers/plans/2026-08-25-instagram-cover-studio.md
git diff --cached --check
git commit -m "feat: disponibilizar estúdio de capas no crm"
```

- [ ] **Step 5: Push and verify deployment**

```bash
git push origin main
```

Verificar no deployment do Hostinger para `crm.ulizarzana.com` se o commit final foi concluído e testar a rota pública `/capas` sem sessão. A publicação do CRM ocorre pelo deploy Node.js conectado ao GitHub; não usar FTP para este app.

---

## Self-review do plano

- A entrada foto/vídeo, três frames, seleção opcional e processamento local estão cobertos nas Tasks 1–3.
- Os quatro modelos, a composição 9:16, tipografia, paleta e degradê estão cobertos nas Tasks 1, 2 e 5.
- A rota protegida e o acesso pela Visão Geral estão cobertos na Task 4.
- Erros de mídia, texto longo, falha de captura e exportação serão tratados no componente da Task 3.
- Responsividade e acessibilidade estão cobertas nas Tasks 3 e 5.
- Testes, build, cofre, GitHub e deployment estão cobertos na Task 6.
- Não há dependência nova de runtime nem armazenamento de mídia.
