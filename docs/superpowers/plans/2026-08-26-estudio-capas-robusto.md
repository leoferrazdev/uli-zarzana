# Estúdio de Capas Robusto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a hierarquia do cabeçalho e tornar o processamento local de vídeo do Estúdio de Capas incremental, cancelável e resiliente em desktop e mobile, preservando o fluxo aprovado.

**Architecture:** O navegador continuará sendo o limite do MVP: a mídia será lida por `ObjectURL`, o frame central será extraído primeiro e os frames alternativos serão processados progressivamente. A interface exibirá estado real de processamento, permitirá cancelamento/repetição e usará URLs temporárias de Blob para reduzir a pressão de memória; nenhum upload de mídia ou endpoint novo será introduzido.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS existente com tokens da marca, Node test runner, Supabase Auth já existente.

## Global Constraints

- Preservar a identidade visual, a paleta e a copy aprovadas do Estúdio de Capas.
- Processar vídeo e imagem somente no navegador no MVP; não criar upload, Storage ou API de mídia.
- Manter saída editorial de 1080 × 1920 px, proporção 9:16, e permitir o avanço com o frame central assim que ele estiver pronto.
- Aceitar os formatos suportados pelo navegador e orientar o usuário para MP4/H.264 ou foto quando o codec não puder ser decodificado.
- Não armazenar dados sensíveis, credenciais ou mídia no cofre.
- Publicar o CRM após a validação local por push na `main`; atualizar o cofre e verificar a rota pública separadamente.

### Task 1: Contrato testável de validação e processamento

**Files:**
- Create: `apps/crm-next/lib/covers/media-validation.ts`
- Modify: `apps/crm-next/components/cover-studio.tsx`
- Test: `tests/media-validation.test.mjs`

**Interfaces:**
- `validateMediaFile({ type, size })` retorna `string | null` para rejeição determinística de tipo e tamanho.
- `MAX_VIDEO_FILE_SIZE_BYTES` é 200 MiB e `MAX_VIDEO_DURATION_SECONDS` é 15 minutos.
- O componente consumirá candidatos com `{ id, time, imageUrl }`, em URLs temporárias de Blob.

- [ ] **Step 1: Write the failing tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { validateMediaFile } from '../lib/covers/media-validation.ts';

test('accepts supported image and video MIME families under the size limit', () => {
  assert.equal(validateMediaFile({ type: 'video/mp4', size: 1024 }), null);
  assert.equal(validateMediaFile({ type: 'image/jpeg', size: 1024 }), null);
});

test('rejects unsupported files with an actionable message', () => {
  assert.match(validateMediaFile({ type: 'application/pdf', size: 1024 }) ?? '', /vídeo|imagem/i);
});

test('rejects videos over the local processing limit', () => {
  assert.match(validateMediaFile({ type: 'video/mp4', size: 200 * 1024 * 1024 + 1 }) ?? '', /200 MB/i);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/media-validation.test.mjs`

Expected: FAIL because `media-validation.ts` and `validateMediaFile` do not exist.

- [ ] **Step 3: Implement the minimal validation contract**

```ts
export const MAX_VIDEO_FILE_SIZE_BYTES = 200 * 1024 * 1024;

export function validateMediaFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
    return 'Envie um vídeo ou uma imagem para criar a capa.';
  }
  if (file.type.startsWith('video/') && file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
    return 'Este vídeo ultrapassa o limite local de 200 MB. Envie uma versão menor ou uma foto.';
  }
  return null;
}
```

- [ ] **Step 4: Run focused and existing tests**

Run: `node --experimental-strip-types --test tests/media-validation.test.mjs tests/cover-studio.test.mjs`

Expected: all focused and existing cover tests pass.

### Task 2: Correção do cabeçalho e processamento progressivo

**Files:**
- Modify: `apps/crm-next/app/capas/page.tsx`
- Modify: `apps/crm-next/components/cover-studio.tsx`
- Modify: `apps/crm-next/app/globals.css`

**Interfaces:**
- `captureVideoFrames(objectUrl, onProgress, signal, onCenterReady)` processa primeiro o frame central, chama `onCenterReady` imediatamente e retorna os candidatos disponíveis em ordem editorial.
- `cancelProcessing()` aborta apenas o processamento local em andamento e limpa seus recursos temporários.
- A interface usa `role="status"`, `progress` e uma ação explícita `Cancelar` enquanto os frames alternativos são preparados.

- [ ] **Step 1: Add source-level regression assertions before implementation**

Add assertions to `tests/cover-studio.test.mjs` for these stable contracts:

```js
assert.match(source, /cover-header-copy/);
assert.match(source, /cover-navigation/);
assert.match(source, /AbortController/);
assert.match(source, /requestVideoFrameCallback/);
assert.match(source, /toBlob/);
assert.match(source, /Cancelar/);
assert.match(source, /Mídia pronta para continuar|Frame central pronto/);
```

- [ ] **Step 2: Run the regression test and verify RED**

Run: `node --experimental-strip-types --test tests/cover-studio.test.mjs`

Expected: FAIL on the missing semantic header, cancellation, Blob conversion and user-state contracts.

- [ ] **Step 3: Implement the smallest production change**

Refactor the page header into navigation, title block and actions; add explicit mobile-safe CSS. In the client component, validate file metadata before creating the `ObjectURL`, append the hidden video to the document for reliable media events, wait for `loadedmetadata`/`loadeddata`/`canplay` with abort support, seek the center first, use `requestVideoFrameCallback` with `requestAnimationFrame` fallback, convert each canvas to a JPEG Blob URL with `toBlob`, and process alternatives independently so a failed alternative does not discard a valid center frame. Map unsupported codec errors to an actionable Portuguese message and expose `Cancelar`/`Tentar novamente`.

- [ ] **Step 4: Run the regression and full test suite**

Run: `node --experimental-strip-types --test tests/cover-studio.test.mjs tests/media-validation.test.mjs`

Expected: all tests pass with no unhandled warnings.

### Task 3: Build, visual QA and release

**Files:**
- Modify: `cofre-uli/01 - Estratégia/Diagnóstico de Robustez Mobile - Estúdio de Capas 2026-08-26.md`

- [ ] **Step 1: Build the CRM**

Run: `npm.cmd run build` in `apps/crm-next`.

Expected: exit code 0 and a production build containing `/capas`.

- [ ] **Step 2: Validate the responsive route**

Run the existing browser check at widths 320, 360, 375, 390, 414, 768, 1024 and 1440; verify no horizontal overflow, the link/eyebrow no longer share an accidental inline row, and the processing status remains readable on mobile.

- [ ] **Step 3: Record evidence in the Obsidian vault**

Update the diagnostic note with implementation status, changed files, tests/build results, browser widths, the explicit MVP boundary (local-only media), and any limitation that remains for real-device codec coverage. Use Obsidian frontmatter and wikilinks only for vault-internal notes; never record credentials or media contents.

- [ ] **Step 4: Commit and publish**

Stage only the implementation files, the focused tests, the plan and the diagnostic note. Commit with `fix: tornar estudio de capas resiliente` and push `main` to `origin`.

- [ ] **Step 5: Verify public deployment**

Reload `https://crm.ulizarzana.com/capas` with the authenticated browser session, verify the route renders and check the deployment/commit separately from local build evidence.

## Self-review checklist

- [ ] The plan keeps the MVP local-only and does not invent an upload backend.
- [ ] Validation, cancellation, progressive center-first extraction, fallback media events and Blob URLs each have a stated test or verification step.
- [ ] The plan does not alter the approved copy/layout beyond the header hierarchy and processing state required for the defect.
- [ ] The release step separates test/build evidence, Git state and public deployment evidence.
