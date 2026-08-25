# Posições da copy e Safe Zone no Estúdio Editorial — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o usuário escolha entre Topo, Centro e Base para posicionar a copy da capa, aplicando uma Safe Zone operacional de Reels sem exportar o guia visual.

**Architecture:** A posição será um tipo fechado compartilhado pelo preset, pelo componente e pelo renderizador. O Estúdio manterá `bottom` como padrão, exibirá três cartões de prévia na Etapa 02 e encaminhará a posição escolhida até a prévia final e `renderCover`. O renderizador usará a mesma Safe Zone de 1080 × 1920 px para limitar largura, âncoras e degradê; a guia será exclusivamente DOM/CSS.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Canvas 2D, CSS existente em `app/globals.css`, Node.js built-in test runner, ESLint e Supabase SSR já configurados.

## Global Constraints

- O canvas final permanece em `1080 × 1920 px` e proporção `9:16`.
- As posições disponíveis são exatamente `top`, `center` e `bottom`.
- A posição inicial é `bottom`.
- A Safe Zone operacional é `x: 64–920` e `y: 220–1620`.
- A largura máxima do texto é `856 px`.
- A guia Safe Zone aparece na interface com `GUIA SAFE ZONE · NÃO EXPORTADO` e nunca é desenhada no PNG/JPG.
- O processamento da mídia permanece local no navegador; nenhuma nova chamada ao Supabase ou armazenamento externo entra no MVP.
- A identidade visual permanece com Libre Baskerville, Source Sans 3, `#332A26`, `#F7F0E7` e `#CDAE85`.
- Alterações não relacionadas no worktree permanecem intocadas.

---

### Task 1: Criar o contrato testável de posições e Safe Zone

**Files:**
- Modify: `tests/cover-studio.test.mjs`
- Test: `tests/cover-studio.test.mjs`

**Interfaces:**
- Consumes: `cover-presets.ts` e os arquivos atuais do Estúdio.
- Produces: expectativas para `COPY_POSITIONS`, `META_SAFE_ZONE`, `copyPosition`, `position` e o guia não exportado.

- [ ] **Step 1: Write the failing tests**

Adicionar os testes abaixo depois do teste de presets:

```js
test('define três posições de copy dentro da Safe Zone operacional', async () => {
  const source = await readFile(new URL('../apps/crm-next/lib/covers/cover-presets.ts', import.meta.url), 'utf8');
  assert.match(source, /COPY_POSITIONS/);
  assert.match(source, /top/);
  assert.match(source, /center/);
  assert.match(source, /bottom/);
  assert.match(source, /META_SAFE_ZONE/);
  assert.match(source, /top:\s*220/);
  assert.match(source, /right:\s*160/);
  assert.match(source, /bottom:\s*300/);
});

test('propaga posição e mantém a guia Safe Zone fora da exportação', async () => {
  const component = await readFile(new URL('../apps/crm-next/components/cover-studio.tsx', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('../apps/crm-next/lib/covers/render-cover.ts', import.meta.url), 'utf8');
  assert.match(component, /copyPosition/);
  assert.match(component, /Topo/);
  assert.match(component, /Centro/);
  assert.match(component, /Base/);
  assert.match(component, /GUIA SAFE ZONE · NÃO EXPORTADO/);
  assert.match(renderer, /position/);
  assert.doesNotMatch(renderer, /GUIA SAFE ZONE/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm --prefix apps/crm-next test -- --test-name-pattern="posições|Safe Zone"
```

Expected: FAIL porque os contratos `COPY_POSITIONS`, `META_SAFE_ZONE`, `copyPosition` e `position` ainda não existem.

- [ ] **Step 3: Commit**

Não criar commit nesta etapa; o ciclo red/green será fechado nas tarefas de implementação e verificado antes do commit final.

### Task 2: Definir posições, margens e âncoras compartilhadas

**Files:**
- Modify: `apps/crm-next/lib/covers/cover-presets.ts`
- Test: `tests/cover-studio.test.mjs`

**Interfaces:**
- Consumes: `COVER_DIMENSIONS` já existente.
- Produces: `CopyPosition`, `COPY_POSITIONS`, `META_SAFE_ZONE` e `COPY_POSITION_ANCHORS` exportados.

- [ ] **Step 1: Write the minimal implementation**

Adicionar ao arquivo de presets:

```ts
export type CopyPosition = 'top' | 'center' | 'bottom';

export const COPY_POSITIONS = [
  { id: 'top', label: 'Topo', description: 'Mensagem no início da área segura.' },
  { id: 'center', label: 'Centro', description: 'Mensagem no centro da área segura.' },
  { id: 'bottom', label: 'Base', description: 'Posição editorial padrão da Uli.' },
] as const satisfies readonly { id: CopyPosition; label: string; description: string }[];

export const META_SAFE_ZONE = {
  top: 220,
  right: 160,
  bottom: 300,
  left: 64,
  width: COVER_DIMENSIONS.width - 64 - 160,
  height: COVER_DIMENSIONS.height - 220 - 300,
} as const;

export const COPY_POSITION_ANCHORS: Record<CopyPosition, { contextY: number; headlineY: number }> = {
  top: { contextY: 280, headlineY: 370 },
  center: { contextY: 760, headlineY: 850 },
  bottom: { contextY: 1160, headlineY: 1250 },
};
```

- [ ] **Step 2: Run tests to verify they pass**

Run:

```powershell
npm --prefix apps/crm-next test -- --test-name-pattern="posições|Safe Zone"
```

Expected: the constants contract passes; the component/renderer propagation test remains failing until Tasks 3 and 4.

### Task 3: Aplicar posição e degradê no renderizador Canvas

**Files:**
- Modify: `apps/crm-next/lib/covers/render-cover.ts`
- Test: `tests/cover-studio.test.mjs`

**Interfaces:**
- Consumes: `CopyPosition`, `COPY_POSITION_ANCHORS` e `META_SAFE_ZONE` de `cover-presets.ts`.
- Produces: `renderCover({ imageUrl, copy, format, position })` com o mesmo contrato de Blob.

- [ ] **Step 1: Write the failing renderer contract**

Ampliar o teste do renderizador para exigir os tokens:

```js
for (const token of ['COPY_POSITION_ANCHORS', 'META_SAFE_ZONE', 'top', 'center', 'bottom']) {
  assert.match(source, new RegExp(escapeRegExp(token)));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm --prefix apps/crm-next test -- --test-name-pattern="renderizador"
```

Expected: FAIL porque o renderizador ainda usa coordenadas fixas e não recebe `position`.

- [ ] **Step 3: Implement the minimal renderer change**

Alterar `renderCover` para receber `position: CopyPosition`, usar `COPY_POSITION_ANCHORS[position]`, limitar `MAX_TEXT_WIDTH` a `META_SAFE_ZONE.width` e transformar `drawBackground` em `drawBackground(context, image, position)`. O degradê deve seguir estas regras:

```ts
const gradient = position === 'top'
  ? context.createLinearGradient(0, 0, 0, 820)
  : position === 'center'
    ? context.createRadialGradient(width / 2, height / 2, 120, width / 2, height / 2, 780)
    : context.createLinearGradient(0, 720, 0, height);
```

Para Topo, aplicar maior opacidade de `COLORS.ink` no início; para Centro, maior opacidade no raio central; para Base, preservar o degradê inferior atual. Nenhuma string ou traço de guia Safe Zone pode ser desenhado pelo Canvas.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm --prefix apps/crm-next test -- --test-name-pattern="renderizador|Safe Zone"
```

Expected: PASS para o renderer e para os contratos de margem.

### Task 4: Criar seleção guiada no Estúdio Editorial

**Files:**
- Modify: `apps/crm-next/components/cover-studio.tsx`
- Test: `tests/cover-studio.test.mjs`

**Interfaces:**
- Consumes: `COPY_POSITIONS`, `CopyPosition`, `renderCover(..., position)`.
- Produces: estado `copyPosition` iniciado em `bottom`, cartões Topo/Centro/Base na Etapa 02, prévia sincronizada e exportação na posição escolhida.

- [ ] **Step 1: Write the failing component contract**

Ampliar o teste do componente para exigir:

```js
for (const token of ['COPY_POSITIONS', "useState<CopyPosition>('bottom')", 'setCopyPosition', 'aria-label="Posição da copy"', 'GUIA SAFE ZONE · NÃO EXPORTADO']) {
  assert.match(source, new RegExp(escapeRegExp(token)));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm --prefix apps/crm-next test -- --test-name-pattern="componente|propaga posição"
```

Expected: FAIL porque a seleção e o estado da posição ainda não existem.

- [ ] **Step 3: Implement the minimal guided flow**

No componente:

1. importar `COPY_POSITIONS`, `CopyPosition` e `META_SAFE_ZONE`;
2. adicionar `const [copyPosition, setCopyPosition] = useState<CopyPosition>('bottom');`;
3. criar `selectCopyPosition(position)` para atualizar o estado e limpar `error`;
4. inserir, na Etapa 02, um `fieldset` com `aria-label="Posição da copy"` e três botões, cada um contendo uma mini `CoverPreview` com `position` e `showSafeZone={false}`;
5. alterar a prévia principal da Etapa 02 para `showSafeZone` e `position={copyPosition}`;
6. passar `position={copyPosition}` às prévias da Etapa 03 e 04;
7. passar `position: copyPosition` à chamada `renderCover` no download;
8. manter `bottom` ao trocar mídia, sem criar persistência fora da sessão;
9. renderizar a moldura/legenda da Safe Zone somente na prévia principal da Etapa 02, com a indicação exata `GUIA SAFE ZONE · NÃO EXPORTADO`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm --prefix apps/crm-next test -- --test-name-pattern="componente|propaga posição"
```

Expected: PASS.

### Task 5: Estilizar cartões e guia responsivos

**Files:**
- Modify: `apps/crm-next/app/globals.css`
- Test: `tests/cover-studio.test.mjs`

**Interfaces:**
- Consumes: classes do componente para `.cover-position-picker`, `.cover-position-grid`, `.cover-position-card`, `.cover-safe-zone-guide` e `.cover-safe-zone-label`.
- Produces: seleção legível em desktop e mobile, com a Safe Zone discreta e não confundida com a arte final.

- [ ] **Step 1: Write the failing CSS contract**

Adicionar ao teste CSS:

```js
for (const token of ['.cover-position-picker', '.cover-position-grid', '.cover-position-card', '.cover-safe-zone-guide', '.cover-safe-zone-label']) {
  assert.match(css, new RegExp(escapeRegExp(token)));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm --prefix apps/crm-next test -- --test-name-pattern="CSS"
```

Expected: FAIL porque as classes ainda não existem.

- [ ] **Step 3: Implement CSS**

Adicionar os estilos usando tokens existentes:

```css
.cover-position-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.cover-position-card { display: grid; gap: 8px; padding: 8px; border: 1px solid var(--color-line); border-radius: 14px; background: var(--color-paper); text-align: left; }
.cover-position-card.is-selected { border-color: var(--color-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 24%, transparent); }
.cover-safe-zone-guide { position: absolute; inset: 11.46% 14.81% 15.63% 5.93%; border: 1px dashed color-mix(in srgb, var(--color-paper) 72%, transparent); pointer-events: none; }
.cover-safe-zone-label { position: absolute; top: 8px; left: 8px; padding: 4px 7px; border-radius: 999px; background: color-mix(in srgb, var(--color-ink) 82%, transparent); color: var(--color-paper); font: 600 9px/1 var(--font-sans); letter-spacing: .08em; }
```

Adicionar regra mobile para empilhar os cartões quando a largura for menor que `640px`, sem reduzir a prévia principal abaixo da legibilidade mínima.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm --prefix apps/crm-next test -- --test-name-pattern="CSS"
```

Expected: PASS.

### Task 6: Atualizar registro Obsidian e validação de entrega

**Files:**
- Modify: `cofre-uli/01 - Estratégia/Decisão - Gerador de Capas para Instagram no CRM 2026-08-25.md`
- Test: `tests/cover-studio.test.mjs`

**Interfaces:**
- Consumes: comportamento implementado e resultados dos comandos de validação.
- Produces: registro de decisão, Safe Zone, posição padrão e evidências de publicação.

- [ ] **Step 1: Add the implementation record**

Adicionar uma seção datada registrando que o módulo passou a oferecer Topo/Centro/Base, que Base é o padrão, que a Safe Zone operacional é `64/160/220/300`, que o guia não é exportado e que a referência externa é a orientação de Safe Zone da Meta.

- [ ] **Step 2: Run complete validation**

Run:

```powershell
npm --prefix apps/crm-next test
npm --prefix apps/crm-next run lint
npm --prefix apps/crm-next run build
git diff --check
```

Expected: 0 test failures, lint sem erros, build com exit 0 e `git diff --check` sem erros. Warnings já existentes devem ser registrados, não tratados como falhas.

- [ ] **Step 3: Verify public deployment**

After pushing `main`, verify:

```powershell
curl.exe -sS -I https://crm.ulizarzana.com/login
curl.exe -sS -I https://crm.ulizarzana.com/capas
```

Expected: `/login` responde `200 OK` e `/capas` sem sessão responde `307` para `/login`. Na sessão autenticada, recarregar `/capas` e confirmar os três cartões de posição e a legenda de Safe Zone.

- [ ] **Step 4: Commit and push**

```powershell
git add -- 'apps/crm-next/lib/covers/cover-presets.ts' 'apps/crm-next/lib/covers/render-cover.ts' 'apps/crm-next/components/cover-studio.tsx' 'apps/crm-next/app/globals.css' 'tests/cover-studio.test.mjs' 'cofre-uli/01 - Estratégia/Decisão - Gerador de Capas para Instagram no CRM 2026-08-25.md'
git commit -m "feat: adicionar posicoes e safe zone ao estudio de capas"
git push origin main
```
