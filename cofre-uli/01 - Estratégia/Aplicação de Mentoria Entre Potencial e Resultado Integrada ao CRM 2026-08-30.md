---
title: Aplicação de Mentoria Entre Potencial e Resultado Integrada ao CRM
date: 2026-08-30
tags:
  - uli
  - crm
  - mentoria
  - supabase
  - aplicacao
status: aprovado-para-plano
aliases:
  - Aplicação da Mentoria Entre Potencial e Resultado
---

# Aplicação de Mentoria Entre Potencial e Resultado integrada ao CRM

> [!success] Decisão determinística
> A página de aplicação será pública, dividida em etapas e integrada diretamente ao CRM. Cada submissão será armazenada integralmente em uma tabela exclusiva da Mentoria Entre Potencial e Resultado no Supabase e ficará disponível para consulta autenticada por usuários administradores e comerciais.

## Fluxo aprovado

1. O candidato acessa a página pública sem login.
2. Avança por oito telas: orientação; identificação; contexto profissional; momento e objetivo; obstáculo e formato; expectativa e seleção; disponibilidade e comprometimento; termos e envio.
3. Os dados permanecem no navegador durante o preenchimento.
4. Somente o envio final chama o endpoint server-side.
5. O servidor valida os campos e grava a aplicação no Supabase.
6. O candidato recebe apenas uma confirmação de recebimento, sem promessa de aprovação ou prazo.
7. A equipe consulta as aplicações na rota autenticada `/aplicacoes` do CRM.

## Registro de dados

Tabela exclusiva:

`public.mentoria_entre_potencial_resultado_applications`

As respostas serão colunas normalizadas, incluindo identificação, contexto profissional, motivação, objetivo, obstáculo, formato desejado, experiência prévia, expectativas, critério de seleção, disponibilidade, horário, comprometimento, aceite dos termos e datas de envio.

O MVP não duplicará automaticamente a aplicação na tabela `leads`. A aplicação será consultada diretamente no CRM para preservar todas as respostas e evitar divergência entre registros.

## Segurança determinada

- rota pública limitada à aplicação e ao POST de submissão;
- validação no navegador e no servidor;
- RLS permitindo inserção pública somente com termos aceitos;
- bloqueio de leitura pública;
- leitura interna limitada a `administradora` e `comercial`;
- nenhum dado real, segredo ou token será registrado no cofre;
- nenhum dado será colocado na URL, no console ou em armazenamento persistente do navegador.

## Integração no CRM

O CRM terá:

- lista das aplicações mais recentes;
- detalhe com todas as respostas agrupadas;
- acesso pela Visão Geral;
- indicador simples de novas aplicações recebidas no dia.

Avaliação, aprovação, reprovação, conversão em lead, mensagens automáticas e agenda permanecem no roadmap futuro.

## Especificação relacionada

Documento técnico correspondente no repositório: `docs/superpowers/specs/2026-08-30-aplicacao-mentoria-entre-potencial-e-resultado-design.md`.
