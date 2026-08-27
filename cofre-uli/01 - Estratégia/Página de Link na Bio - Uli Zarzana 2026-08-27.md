---
title: Página de Link na Bio - Uli Zarzana
date: 2026-08-27
status: implementado-publicado
tipo: decisão-estratégica
tags:
  - uli-zarzana
  - link-na-bio
  - conversao
  - instagram
  - landing-page
aliases:
  - Bio Uli Zarzana
  - Página /bio
---

# Página de link na bio — Uli Zarzana

> [!success] Decisão determinística
> Criar uma página pública estática em `http://ulizarzana.com/bio`, separada do CRM Next.js, para centralizar os três principais destinos comerciais do projeto.

## Base consultada

A decisão utiliza [[Posicionamento e ICP Atual - Projeto Uli Zarzana]], [[Briefing Estratégico - Personalidade e Percepção da Marca]], [[Paleta Técnica Definitiva - A1]] e [[Regras de Uso do Sistema Visual - A1 B1 F1]].

O público prioritário continua sendo formado por profissionais e empresários experientes que buscam clareza, influência, reconhecimento, ascensão e crescimento sustentável. A página deve reduzir fricção para quem chega pelas redes sociais e não ampliar a mensagem para desenvolvimento pessoal genérico.

## Estrutura determinada

- Uma única coluna central, sem menu e sem navegação secundária.
- Experiência prioritariamente mobile-first, mantendo a mesma hierarquia no desktop.
- Identificação da Uli com fotografia F1 pequena, nome e etiqueta `CARREIRA · LIDERANÇA · ASCENSÃO`.
- Headline: **Experiência que vira autoridade.**
- Subheadline: `Estratégia para profissionais e empresários experientes avançarem com clareza, influência e consistência.`
- Três CTAs em ordem de intenção e fricção:
  1. **Conhecer a Mentoria** — página de vendas: `https://ulizarzana.com/`;
  2. **Aplicar para a Mentoria** — formulário: `https://form.respondi.app/eKphXGUV`;
  3. **Entrar no grupo do WhatsApp** — destino provisório: `https://chat.whatsapp.com/ULI-GRUPO-PROVISORIO`.

## Sistema visual

- Fundo marfim `#F7F0E7` e texto marrom profundo `#332A26`.
- Champagne `#CDAE85` em etiquetas e detalhes seletivos.
- Terracota `#B46F52` somente como acento de apoio.
- Libre Baskerville 700 em títulos e Source Sans 3 em textos e interface.
- Monograma institucional fora da composição final enquanto permanecer provisório.

## Tracking e requisitos

Cada CTA terá identificador estável (`cta_mentoria`, `cta_aplicacao` e `cta_whatsapp`), UTMs da campanha `uli_bio` e o evento `uli_bio_cta_click`, emitido para `dataLayer` ou `gtag` somente se já existir configuração externa. Nenhum analytics será inventado ou carregado sem identificador aprovado.

A página deve manter links reais, foco visível, áreas de toque de pelo menos 44 px, contraste WCAG AA, texto legível em 320 px, ausência de rolagem horizontal e funcionamento nos breakpoints de 320 a 1440 px.

## Estado da entrega

- Especificação detalhada: `docs/superpowers/specs/2026-08-27-link-na-bio-uli-zarzana-design.md`.
- Arquivos implementados: `web/bio/index.html`, `web/assets/bio.css` e `web/assets/bio.js`.
- Contrato local: `tests/validate-bio-page.ps1` aprovado; sintaxe de `web/assets/bio.js` aprovada.
- Validação responsiva real em Chrome headless: 320, 360, 375, 390, 414, 768, 1024 e 1440 px; três CTAs, imagem carregada, título visível e sem overflow horizontal em todas as larguras.
- Tracking local validado: o CTA de aplicação emite `uli_bio_cta_click`, `cta_aplicacao`, destino e UTMs no `dataLayer`.
- Git: implementação em `5e08ac4` e publicação automatizada por FTP em `0731190`, ambos na `main` e enviados para `origin/main`.
- FTP: workflow `Deploy bio static`, execução `33083409959`, concluída com sucesso. Foram enviados somente `bio/index.html`, `assets/bio.css` e `assets/bio.js` para a raiz pública, sem limpeza do diretório.
- Verificação pública: `https://ulizarzana.com/bio/`, `https://ulizarzana.com/bio/index.html`, `https://ulizarzana.com/assets/bio.css` e `https://ulizarzana.com/assets/bio.js` retornaram HTTP 200 e conteúdo atualizado.
- Publicação futura: alterações em `web/bio/**`, `web/assets/bio.css` ou `web/assets/bio.js` na `main` acionam automaticamente o mesmo workflow FTP.
- O link do WhatsApp é provisório e deverá ser substituído antes da divulgação pública definitiva.
