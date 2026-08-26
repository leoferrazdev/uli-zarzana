import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  COVER_DIMENSIONS,
  COVER_PRESETS,
  getCandidateFrameTimes,
  validateCoverCopy,
} from '../apps/crm-next/lib/covers/cover-presets.ts';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('mantém o canvas social aprovado e os quatro modelos editoriais', () => {
  assert.deepEqual(COVER_DIMENSIONS, { width: 1080, height: 1920 });
  assert.deepEqual(COVER_PRESETS.map((preset) => preset.id), [
    'carreira', 'lideranca', 'autoridade', 'ascensao',
  ]);

  for (const preset of COVER_PRESETS) {
    assert.ok(preset.context && preset.headline && preset.subtitle);
  }
});

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

test('calcula frames em 25%, 50% e 75% sem sair da duração', () => {
  assert.deepEqual(getCandidateFrameTimes(20), [5, 10, 15]);
  assert.deepEqual(getCandidateFrameTimes(0), []);
});

test('sinaliza copy vazia ou longa e aceita um preset curto', () => {
  assert.equal(validateCoverCopy({ context: 'a', headline: 'b', subtitle: 'c' }).length, 0);
  assert.ok(validateCoverCopy({ context: '', headline: 'b', subtitle: 'c' }).some((error) => error.field === 'context'));
  assert.ok(validateCoverCopy({ context: 'a'.repeat(80), headline: 'b', subtitle: 'c' }).length > 0);
});

test('renderizador preserva o contrato visual e exporta blob', async () => {
  const source = await readFile(new URL('../apps/crm-next/lib/covers/render-cover.ts', import.meta.url), 'utf8');
  for (const token of ['COVER_DIMENSIONS', 'createLinearGradient', 'toBlob', 'document.fonts.load', 'context', 'headline', 'subtitle']) {
    assert.match(source, new RegExp(escapeRegExp(token)));
  }
  for (const token of ['COPY_POSITION_ANCHORS', 'META_SAFE_ZONE', 'top', 'center', 'bottom']) {
    assert.match(source, new RegExp(escapeRegExp(token)));
  }
});

test('centraliza contexto, headline e subtítulo na prévia e na exportação', async () => {
  const css = await readFile(new URL('../apps/crm-next/app/globals.css', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('../apps/crm-next/lib/covers/render-cover.ts', import.meta.url), 'utf8');
  assert.match(css, /\.cover-preview-copy\s*\{[^}]*text-align:\s*center/s);
  assert.match(renderer, /context\.textAlign\s*=\s*['"]center['"]/);
  assert.match(renderer, /headlineWidth/);
});

test('componente expõe o fluxo guiado e mantém a mídia local', async () => {
  const source = await readFile(new URL('../apps/crm-next/components/cover-studio.tsx', import.meta.url), 'utf8');
  for (const token of ['Adicionar vídeo ou foto', 'Escolher imagem', 'Definir conteúdo', 'Revisar e baixar', 'createObjectURL', 'revokeObjectURL', 'Baixar PNG', 'Baixar JPG', 'accept="video/*,image/*"']) {
    assert.match(source, new RegExp(escapeRegExp(token)));
  }
});

test('captura aguarda um frame de vídeo efetivamente decodificado', async () => {
  const source = await readFile(new URL('../apps/crm-next/components/cover-studio.tsx', import.meta.url), 'utf8');
  assert.match(source, /requestVideoFrameCallback/);
  assert.match(source, /readyState/);
  assert.match(source, /AbortController/);
  assert.match(source, /toBlob/);
  assert.match(source, /loadeddata/);
  assert.match(source, /canplay/);
});

test('separa semanticamente navegação, identificação e título do cabeçalho', async () => {
  const route = await readFile(new URL('../apps/crm-next/app/capas/page.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../apps/crm-next/app/globals.css', import.meta.url), 'utf8');
  assert.match(route, /cover-header-copy/);
  assert.match(route, /cover-navigation/);
  assert.match(css, /\.cover-header-copy/);
  assert.match(css, /\.cover-title-block/);
});

test('expõe estados honestos de processamento local e cancelamento', async () => {
  const source = await readFile(new URL('../apps/crm-next/components/cover-studio.tsx', import.meta.url), 'utf8');
  assert.match(source, /Cancelar/);
  assert.match(source, /Tentar novamente/);
  assert.match(source, /Frame central pronto|Mídia pronta para continuar/);
  assert.match(source, /role="status"/);
});

test('propaga posição e mantém a guia Safe Zone fora da exportação', async () => {
  const component = await readFile(new URL('../apps/crm-next/components/cover-studio.tsx', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('../apps/crm-next/lib/covers/render-cover.ts', import.meta.url), 'utf8');
  assert.match(component, /copyPosition/);
  assert.match(component, /COPY_POSITIONS/);
  assert.match(component, /GUIA SAFE ZONE · NÃO EXPORTADO/);
  assert.match(renderer, /position/);
  assert.doesNotMatch(renderer, /GUIA SAFE ZONE/);
});

test('rota e dashboard apontam para o estúdio de capas', async () => {
  const route = await readFile(new URL('../apps/crm-next/app/capas/page.tsx', import.meta.url), 'utf8');
  const home = await readFile(new URL('../apps/crm-next/app/page.tsx', import.meta.url), 'utf8');
  assert.match(route, /createSupabaseServerClient/);
  assert.match(route, /redirect\(['"]\/login['"]\)/);
  assert.match(route, /CoverStudio/);
  assert.match(home, /Criar capa para Instagram/);
});

test('CSS do estúdio reutiliza tokens da marca e possui layout mobile', async () => {
  const css = await readFile(new URL('../apps/crm-next/app/globals.css', import.meta.url), 'utf8');
  for (const token of ['.cover-studio', '--color-ink', '--color-paper', '--color-champagne', '--font-serif', '@media (max-width: 640px)', '.cover-preview']) {
    assert.match(css, new RegExp(escapeRegExp(token)));
  }
  for (const token of ['.cover-position-picker', '.cover-position-grid', '.cover-position-card', '.cover-safe-zone-guide', '.cover-safe-zone-label']) {
    assert.match(css, new RegExp(escapeRegExp(token)));
  }
});
