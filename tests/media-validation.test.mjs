import assert from 'node:assert/strict';
import test from 'node:test';
import { validateMediaFile, validateVideoDuration } from '../apps/crm-next/lib/covers/media-validation.ts';

test('aceita imagem e vídeo compatíveis dentro do limite local', () => {
  assert.equal(validateMediaFile({ type: 'video/mp4', size: 1024 }), null);
  assert.equal(validateMediaFile({ type: 'image/jpeg', size: 1024 }), null);
});

test('rejeita arquivos incompatíveis com orientação acionável', () => {
  assert.match(validateMediaFile({ type: 'application/pdf', size: 1024 }) ?? '', /vídeo|imagem/i);
});

test('rejeita vídeo acima do limite de processamento local', () => {
  assert.match(validateMediaFile({ type: 'video/mp4', size: 200 * 1024 * 1024 + 1 }) ?? '', /200 MB/i);
});

test('rejeita vídeo sem duração e acima do limite de duração', () => {
  assert.match(validateVideoDuration(0) ?? '', /duração/i);
  assert.match(validateVideoDuration(15 * 60 + 1) ?? '', /15 minutos/i);
  assert.equal(validateVideoDuration(140), null);
});
