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
});

test('componente expõe o fluxo guiado e mantém a mídia local', async () => {
  const source = await readFile(new URL('../apps/crm-next/components/cover-studio.tsx', import.meta.url), 'utf8');
  for (const token of ['Adicionar vídeo ou foto', 'Escolher imagem', 'Definir conteúdo', 'Revisar e baixar', 'createObjectURL', 'revokeObjectURL', 'Baixar PNG', 'Baixar JPG', 'accept="video/*,image/*"']) {
    assert.match(source, new RegExp(escapeRegExp(token)));
  }
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
});
