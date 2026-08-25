---
title: Gerador de Capas para Instagram no CRM
date: 2026-08-25
tags:
  - uli
  - crm
  - produto
  - conteúdo-social
  - identidade-visual
status: aprovado-para-especificação
aliases:
  - Estúdio de Capas do CRM
---

# Gerador de Capas para Instagram no CRM

> [!success] Decisão determinística
> O CRM terá um módulo guiado para transformar um vídeo ou uma foto em uma capa social padronizada da Uli. O processamento ocorrerá localmente no navegador, sem enviar a mídia ao Supabase ou ao servidor no MVP.

## Por que este módulo existe

A Uli grava o vídeo, define previamente a mensagem e precisa da capa como última etapa antes da publicação. O módulo reduz a intervenção necessária, evita editor externo e mantém as capas coerentes com o sistema visual aprovado.

## Fluxo aprovado

1. Acessar a rota autenticada `/capas` pela Visão Geral do CRM.
2. Selecionar uma única mídia: vídeo ou foto.
3. Se for vídeo, o navegador extrai três frames locais, aproximadamente em 25%, 50% e 75% da duração, recomendando automaticamente o frame central. A troca de frame fica disponível, mas não é obrigatória.
4. Se for foto, a imagem é usada diretamente e enquadrada automaticamente no formato 9:16.
5. Escolher um modelo editorial e editar os três campos curtos: contexto, headline e subtítulo.
6. Revisar a capa e baixar PNG ou JPG em 1080 × 1920 px.

## Modelos editoriais iniciais

| Modelo | Contexto | Headline | Subtítulo |
| --- | --- | --- | --- |
| Carreira e reconhecimento | capacidade que vira | autoridade. | para o próximo passo |
| Liderança e decisão | decisões maiores pedem | presença. | na liderança |
| Autoridade e influência | o que você construiu | percebido. | com consistência |
| Ascensão e próximo passo | o próximo passo pede | direção. | sem perder identidade |

Os quatro modelos são sugestões editáveis, não novos posicionamentos. Eles seguem a [[Mockups de Aplicação do Sistema Visual - A1 B1 T1 F1 2026-08-12|estrutura de capas sociais aprovada]].

## Regras visuais preservadas

- proporção fixa 9:16;
- arte final em 1080 × 1920 px;
- imagem ocupando toda a área;
- degradê de proteção com base em `#332A26` atrás do texto;
- `#F7F0E7` para leitura principal;
- `#CDAE85` e `#B46F52` como acentos;
- Libre Baskerville 700 para a headline;
- Source Sans 3 para contexto e subtítulo;
- exatamente três blocos textuais;
- sem nome da expert, métricas, ícones, rodapé técnico ou indicação de formato dentro da arte;
- layout fixo no MVP para proteger legibilidade e consistência.

As regras completas permanecem em [[Regras de Uso do Sistema Visual - A1 B1 F1]] e [[Paleta Técnica Definitiva - A1]].

## Limites do MVP

Não entram nesta primeira versão: histórico, armazenamento de mídia, publicação automática, integração com API do Instagram, editor avançado, múltiplos layouts, animação ou colaboração.

O código foi especificado e implementado no repositório do CRM em `apps/crm-next`. A especificação formal correspondente está em `docs/superpowers/specs/2026-08-25-instagram-cover-studio-design.md` e o plano executado está em `docs/superpowers/plans/2026-08-25-instagram-cover-studio.md`.

## Critério de sucesso

Uma usuária autenticada deve conseguir, sem conhecimento de design, selecionar uma foto ou vídeo, aceitar o frame recomendado, preencher ou ajustar os três textos, revisar a arte e baixar uma capa legível e coerente com o sistema visual aprovado, sem que a mídia saia do navegador.

## Implementação e validação — 2026-08-25

### Entregas

- rota autenticada `/capas` conectada à Visão Geral;
- seleção única de vídeo ou foto;
- extração local de três frames em 25%, 50% e 75%, com recomendação automática do frame central;
- quatro modelos editoriais editáveis;
- três posições de copy: Topo, Centro e Base, com Base como padrão;
- Safe Zone operacional aplicada na prévia e no renderizador, com guia visível somente na interface;
- prévia responsiva 9:16;
- renderização Canvas com degradê de proteção e tipografia aprovada;
- download local em PNG e JPG, ambos em 1080 × 1920 px;
- nenhuma chamada de mídia ao Supabase, ao CRM ou a armazenamento externo.

### Arquivos principais

- `apps/crm-next/app/capas/page.tsx`
- `apps/crm-next/components/cover-studio.tsx`
- `apps/crm-next/lib/covers/cover-presets.ts`
- `apps/crm-next/lib/covers/render-cover.ts`
- `apps/crm-next/app/globals.css`
- `tests/cover-studio.test.mjs`
- `docs/superpowers/specs/2026-08-25-cover-copy-position-safe-zone-design.md`
- `docs/superpowers/plans/2026-08-25-cover-copy-position-safe-zone.md`

### Validação local

- `npm --prefix apps/crm-next test`: aprovado, 10 testes;
- `npm --prefix apps/crm-next run lint`: aprovado;
- `npm --prefix apps/crm-next run build`: aprovado;
- `git diff --check`: aprovado.

O build exibiu apenas o aviso já existente de migração da convenção `middleware` para `proxy` no Next.js; não houve erro de compilação, tipagem ou geração das rotas.

### Correção após teste real — 2026-08-25

O primeiro teste com vídeo mostrou thumbnails e prévia pretos, embora a mídia e os textos fossem reconhecidos. A causa foi a sincronização da captura: o evento `seeked` podia ocorrer antes de o frame estar efetivamente decodificado e disponível para o Canvas.

A captura agora aguarda `requestVideoFrameCallback`, utiliza dois ciclos de renderização como fallback em navegadores sem essa API e valida `readyState`, `videoWidth` e `videoHeight` antes de executar `drawImage`. O fluxo visual, a seleção automática do frame central, os textos e o processamento local permanecem inalterados.

O teste de contrato que protege essa regra foi adicionado em `tests/cover-studio.test.mjs`.

### Posições da copy e Safe Zone — 2026-08-25

O Estúdio Editorial passou a oferecer exatamente três posições verticais — Topo, Centro e Base — em cartões de prévia na Etapa 02. A posição Base permanece selecionada inicialmente e a escolha acompanha a prévia, a revisão e a exportação.

A Safe Zone operacional usa as margens `64 px` à esquerda, `160 px` à direita, `220 px` no topo e `300 px` na base, resultando na área útil `x: 64–920` e `y: 220–1620` no canvas de `1080 × 1920 px`. A regra é uma margem conservadora interna para reduzir colisões com a interface nativa da Meta; não é tratada como medida universal fixa da plataforma.

O guia `GUIA SAFE ZONE · NÃO EXPORTADO` aparece na prévia principal da Etapa 02 e é removido do PNG/JPG. O renderizador aplica degradê superior, central ou inferior conforme a posição escolhida e mantém a largura máxima da copy dentro da área útil.

### Publicação verificada

- commits publicados na branch `main`: `e5e5edf` (entrega do módulo), `e9a9149` (lint e navegação interna), `2074e7e` (sincronização do frame decodificado), `5652a57` (especificação de posições e Safe Zone), `7305277` (plano de implementação) e `234ada6` (posições, Safe Zone e renderização);
- `https://crm.ulizarzana.com/` redireciona para `/login` quando necessário;
- `https://crm.ulizarzana.com/login` responde `200 OK`;
- sessão autenticada verificou a Visão Geral com o acesso **Criar capa para Instagram**;
- sessão autenticada verificou a rota `/capas`, o fluxo de quatro etapas e a mensagem de processamento local.
- após a publicação de `2074e7e`, a rota autenticada `/capas` foi recarregada publicamente e permaneceu disponível com o módulo de capas.
- após a publicação de `234ada6`, `/login` respondeu `200 OK` e `/capas` respondeu `307 → /login` sem sessão, confirmando o deployment público do CRM.

O deployment do CRM permanece no fluxo Node.js conectado ao GitHub; não foi necessário FTP para esta atualização. A resposta pública após o commit final permanece `200 OK` em `/login` e `307 → /login` em `/capas` sem sessão.
