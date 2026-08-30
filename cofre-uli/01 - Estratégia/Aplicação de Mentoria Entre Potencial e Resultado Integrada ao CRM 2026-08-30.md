---
title: Aplicação de Mentoria Entre Potencial e Resultado Integrada ao CRM
date: 2026-08-30
tags:
  - uli
  - crm
  - mentoria
  - supabase
  - aplicacao
status: implementado
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

## Implementação realizada

- rota pública: `/aplicacao/mentoria-entre-potencial-e-resultado`;
- endpoint server-side: `/api/aplicacoes/mentoria-entre-potencial-e-resultado`;
- wizard responsivo em oito etapas, com validação por etapa e envio único ao final;
- migration versionada em `supabase/migrations/202608300001_mentorship_application.sql`;
- fila autenticada em `/aplicacoes` e detalhe integral em `/aplicacoes/[id]`;
- indicador de aplicações recebidas no dia adicionado à Visão Geral;
- testes automatizados: 24 aprovados; build de produção Next.js concluído;
- validação visual local realizada no primeiro passo, na navegação para identificação e em viewport mobile;
- migration aplicada no projeto Supabase `uli-zarzana`: tabela confirmada, 24 colunas e 2 políticas, sem aplicações fictícias inseridas.

A publicação foi concluída pelo deploy automático do commit `da41a55` no aplicativo Node.js da Hostinger. Verificação pós-deploy: formulário público retornando HTTP 200; `/aplicacoes` redirecionando para `/login`; endpoint público rejeitando POST vazio com HTTP 400; nenhuma aplicação fictícia foi criada.

## Publicação no domínio principal

- endereço público definido: `https://ulizarzana.com/mentoria-entre-potencial-e-resultado/`;
- a página pública foi criada como pacote estático em `web/mentoria-entre-potencial-e-resultado/`, sem mover ou sobrescrever as demais páginas do domínio;
- workflow dedicado em `.github/workflows/deploy-mentorship-application.yml`, com sincronização somente da pasta da aplicação e deploy automático a cada alteração na `main`;
- envio cross-origin feito pelo navegador para o endpoint do CRM, sem expor chave do Supabase na página pública;
- CORS configurado no endpoint com allowlist exata para `https://ulizarzana.com` e `https://www.ulizarzana.com`, aceitando apenas `POST` e `OPTIONS` com `Content-Type`;
- RLS permanece como proteção efetiva do banco: inserção anônima somente com termos aceitos e leitura restrita aos usuários administradores e comerciais autenticados;
- a validação de produção não envia uma aplicação válida: o preflight e o POST vazio são usados apenas para confirmar CORS e rejeição segura.

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
