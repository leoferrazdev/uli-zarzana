---
title: Posições da copy e Safe Zone no Estúdio Editorial
date: 2026-08-25
status: aprovado-para-implementação
tags:
  - uli
  - crm
  - capas
  - instagram
  - meta
---

# Posições da copy e Safe Zone no Estúdio Editorial

## Decisão

O Estúdio Editorial oferecerá três posições verticais para a copy da capa:

1. **Topo** — grupo textual dentro da área superior protegida;
2. **Centro** — grupo textual centralizado verticalmente na área protegida;
3. **Base** — posição editorial atual, preservada como padrão inicial.

A posição será escolhida na Etapa 02, depois da seleção da foto ou do frame e antes da edição final dos textos. A escolha permanecerá ativa nas Etapas 03 e 04 e será aplicada tanto à prévia quanto ao arquivo exportado.

## Safe Zone operacional

A Meta recomenda manter os elementos criativos principais dentro da safe zone para Reels e disponibiliza um verificador próprio, mas a área ocupada pelos elementos nativos varia conforme superfície, dispositivo e estado da publicação. A referência oficial é [Meta for Business — Instagram & Facebook Reels](https://www.facebook.com/business/ads/facebook-instagram-reels-ads).

Para o MVP, será adotada uma margem operacional conservadora no canvas de 1080 × 1920 px:

| Margem | Pixels | Motivo |
| --- | ---: | --- |
| superior | 220 | evita o cabeçalho e informações superiores da interface |
| esquerda | 64 | preserva respiro editorial e evita a borda do dispositivo |
| direita | 160 | reserva espaço para ações e elementos laterais nativos |
| inferior | 300 | evita legenda, CTA e controles inferiores |

A área útil resultante é `x: 64–920` e `y: 220–1620`. Esses valores são uma regra de produção interna para reduzir colisões; não são apresentados como uma medida fixa universal da Meta.

## Experiência do usuário

- A prévia principal da Etapa 02 exibirá a safe zone como guia visual discreta, com a indicação `GUIA SAFE ZONE · NÃO EXPORTADO`.
- Três cartões selecionáveis exibirão a mesma imagem e copy em miniatura nas posições Topo, Centro e Base.
- A seleção terá estado ativo evidente e atualizará imediatamente a prévia principal.
- A posição Base virá selecionada por padrão para preservar o resultado já aprovado.
- A safe zone será removida do PNG/JPG exportado.
- A escolha de posição será preservada ao avançar, voltar, trocar o preset editorial e revisar a capa.

## Regras de renderização

- `copyPosition` será um tipo fechado: `top`, `center` ou `bottom`.
- O renderizador receberá a posição explicitamente; não haverá coordenada livre no MVP.
- A largura máxima do texto será limitada à largura útil da safe zone (`856 px`).
- Cada posição terá âncoras verticais próprias, sempre dentro de `y: 220–1620` mesmo quando a headline ocupar duas linhas.
- O degradê de proteção acompanhará a posição selecionada: proteção superior para Topo, proteção radial/central para Centro e proteção inferior para Base.
- O guia da safe zone existirá somente na interface; nunca será desenhado no arquivo final.
- O formato final continuará sendo 1080 × 1920 px, com as fontes, cores, hierarquia e três blocos textuais já aprovados.

## Arquivos e testes previstos

- `apps/crm-next/lib/covers/cover-presets.ts`: tipo, opções e constantes da safe zone;
- `apps/crm-next/lib/covers/render-cover.ts`: posição, âncoras, largura útil e degradês;
- `apps/crm-next/components/cover-studio.tsx`: estado, cartões, guia visual e fluxo;
- `apps/crm-next/app/globals.css`: cartões de posição, guia e responsividade;
- `tests/cover-studio.test.mjs`: contrato das três posições, margens, persistência no fluxo e ausência do guia na exportação.

## Critérios de aceite

- O usuário visualiza e escolhe exatamente três posições: Topo, Centro e Base.
- A posição Base é selecionada inicialmente.
- A posição escolhida aparece na prévia principal e no review.
- Nenhum bloco textual ultrapassa a safe zone operacional em nenhuma das três posições.
- O guia é visível na interface e não aparece nos arquivos exportados.
- Desktop e mobile mantêm seleção compreensível, contraste e leitura.
- Os testes, lint e build do CRM permanecem aprovados.
