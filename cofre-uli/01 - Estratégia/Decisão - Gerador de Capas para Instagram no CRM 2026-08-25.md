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

O código será especificado e implementado no repositório do CRM em `apps/crm-next`. A especificação formal correspondente está em `docs/superpowers/specs/2026-08-25-instagram-cover-studio-design.md`. A implementação permanece pendente da revisão dessa especificação formal.

## Critério de sucesso

Uma usuária autenticada deve conseguir, sem conhecimento de design, selecionar uma foto ou vídeo, aceitar o frame recomendado, preencher ou ajustar os três textos, revisar a arte e baixar uma capa legível e coerente com o sistema visual aprovado, sem que a mídia saia do navegador.
