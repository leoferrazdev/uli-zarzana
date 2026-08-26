---
title: Diagnóstico de Robustez Mobile - Estúdio de Capas
date: 2026-08-26
tags:
  - uli
  - crm
  - produto
  - ux-ui
  - mobile
  - conteúdo-social
status: implementado-publicado
aliases:
  - Diagnóstico Mobile do Estúdio de Capas
---

# Diagnóstico de Robustez Mobile — Estúdio de Capas

> [!info] Escopo
> Diagnóstico pré-implementação da rota autenticada `/capas`, solicitado para corrigir a hierarquia do cabeçalho, revisar a responsividade e estabilizar a preparação de vídeos em dispositivos móveis.

## Evidências levantadas

### Cabeçalho e hierarquia

O link `← Voltar para Visão Geral` e o eyebrow `ECOSSISTEMA DIGITAL · CONTEÚDO` são filhos inline do mesmo contêiner. O `margin-bottom` existente no link não cria separação vertical porque os dois elementos permanecem na mesma linha. Na largura de 320 px, o eyebrow compartilha a linha do link e quebra de forma inadequada; isso prejudica a ordem visual ação de navegação → identificação da seção → título → descrição.

### Responsividade observada

Foram verificadas as larguras `320`, `360`, `375`, `390`, `414`, `768`, `1024` e `1440 px` na sessão autenticada. Não foi observado overflow horizontal do documento nem corte dos contêineres principais. A página já reorganiza o estúdio em uma coluna até `900 px` e empilha os controles até `640 px`.

O principal defeito comprovado é o cabeçalho. Em `320 px`, os cartões de frame e de posição permanecem em três colunas estreitas, mas conservam área vertical de toque; a interface deve ser refinada sem introduzir rolagem horizontal ou reduzir a acessibilidade das ações.

### Fluxo atual de mídia

O código executa esta sequência no cliente:

1. cria um `ObjectURL` para o arquivo selecionado;
2. cria um elemento `video` fora da árvore visual;
3. aguarda `loadedmetadata`;
4. busca os tempos de `25%`, `50%` e `75%` da duração, sequencialmente;
5. aguarda `seeked` e uma confirmação de frame decodificado;
6. rasteriza cada frame em Canvas `540 × 960`;
7. serializa cada frame com `toDataURL('image/jpeg', 0.92)`;
8. somente depois de concluir os três frames exibe a Etapa 02.

Não existe upload remoto nesta versão: não foram encontrados `fetch`, `XMLHttpRequest`, `FormData`, upload de Storage, endpoint de mídia ou indicador de progresso de rede. A sessão autenticada atual exibiu três frames de um vídeo no Chrome e os logs do console estavam vazios.

### Causa provável da lentidão e do erro

A causa primária é o custo combinado de decodificação, três operações de seek, espera de frame, Canvas e serialização Base64 no thread principal. Em dispositivos móveis, esse custo aumenta com vídeos longos, 4K, alta taxa de quadros e pouca memória disponível.

O erro `O navegador não conseguiu preparar o frame do vídeo.` é emitido pelo timeout de `3 s` de `waitForDecodedVideoFrame`. O fluxo depende de `seeked` e, quando disponível, `requestVideoFrameCallback`, sem utilizar uma cadeia explícita de `loadeddata`/`canplay` nem fallback para `currentTime = 0`. Codec não suportado é uma causa secundária possível, especialmente em MOV/HEVC/H.265 gravados em iPhone; não há, no acervo local atual, um arquivo MOV/HEVC para validar esse caso.

Os arquivos de referência disponíveis foram identificados como H.264: um vídeo vertical de `1,0 MB`, `1080 × 1920`, `5 s`, e um vídeo H.264/AAC de `31,9 MB`, `1280 × 720`, aproximadamente `140 s`. Isso não comprova compatibilidade com HEVC/iPhone.

## Solução técnica recomendada para validação

### Decisão para o MVP

Manter o processamento local, sem enviar a mídia ao servidor. Essa decisão preserva a privacidade, evita dependência de rede e mantém a arquitetura aprovada do Estúdio Editorial. A interface não deve afirmar “Enviando vídeo” quando nenhum upload ocorre; deve informar honestamente `Preparando vídeo`, `Processando frame`, `Mídia pronta`, erro de formato ou arquivo grande.

### Implementação proposta

- separar semanticamente navegação e identificação da página em blocos de layout, usando uma escala de espaçamento consistente;
- manter a estrutura responsiva atual e ajustar cabeçalho, largura mínima, cards e áreas de toque nos limites móveis;
- validar tipo, duração, dimensões e tamanho antes de iniciar a decodificação;
- preparar primeiro o frame central recomendado, permitindo que a usuária avance assim que ele estiver pronto;
- carregar os frames alternativos de forma controlada, com progresso local real, sem bloquear a exibição inicial;
- aguardar `loadedmetadata`, `loadeddata`/`canplay`, `seeked` e frame efetivamente disponível, com fallback para `currentTime = 0`;
- usar `toBlob` e URLs temporárias em vez de manter três imagens Base64 grandes na memória;
- liberar vídeo, Canvas e URLs temporárias em sucesso, cancelamento, troca de mídia e desmontagem;
- adicionar cancelamento, tentativa novamente e mensagens de erro diferenciadas para arquivo grande, codec não suportado e falha de decodificação;
- manter o Canvas final em `1080 × 1920 px`; reduzir apenas os thumbnails intermediários, se necessário.

### Backend e fase posterior

Nenhuma alteração de backend é necessária para esta correção porque o MVP não recebe mídia. Se a compatibilidade com HEVC/MOV se tornar requisito obrigatório, a alternativa robusta será uma segunda fase com upload controlado, armazenamento temporário e normalização por FFmpeg no servidor. Essa alternativa muda a decisão de privacidade e precisa ser especificada separadamente.

## Implementação aprovada e realizada

O diagnóstico foi aprovado em `2026-08-26` e aplicado no CRM. A implementação preserva o limite do MVP — mídia somente no navegador — e corrige os pontos observados:

- o cabeçalho foi separado semanticamente em navegação, identificação da seção, título e descrição, com espaçamento explícito e comportamento seguro em telas estreitas;
- o vídeo agora é processado com `AbortController`, progresso local e cancelamento, sem apresentar um falso estado de upload;
- o frame central é preparado primeiro e a Etapa 02 pode ser exibida assim que ele estiver pronto; os frames alternativos continuam em segundo plano;
- a preparação aguarda `loadedmetadata`, `loadeddata`/`canplay`, `seeked` e frame decodificado, com fallback para `currentTime = 0`;
- os thumbnails usam `canvas.toBlob()` e URLs temporárias, que são revogadas na troca, cancelamento, erro e desmontagem;
- o sistema valida tipo, limite de vídeo de `200 MB`, duração máxima de `15 minutos`, dimensões decodificadas e codec não suportado, com orientação para MP4/H.264 ou foto;
- a interface oferece `Cancelar`, `Tentar novamente`, progresso local e mensagens de `Mídia pronta para continuar`.

### Evidência local

- `npm.cmd --prefix apps/crm-next test`: `17` testes aprovados, `0` falhas;
- `tsc --noEmit`: código `0`;
- lint focado nos arquivos alterados: código `0`, sem avisos;
- `npm.cmd run build`: código `0`, com a rota dinâmica `/capas` compilada;
- `git push origin main` publicou o commit `1ffde8f7e02fcbc44e339254f49e20c93627d2bf`; `git ls-remote` confirmou o mesmo SHA em `origin/main`;
- `https://crm.ulizarzana.com/capas` foi recarregada após o deployment; o cabeçalho publicado contém `.cover-header-copy`, `.cover-navigation` e `.cover-title-block`, e os logs de console permaneceram sem erros ou avisos;
- a validação responsiva publicada em `320`, `360`, `375`, `390`, `414`, `768`, `1024` e `1440 px` confirmou `horizontalOverflow: false`, título visível e navegação separada da identificação em todas as larguras.

## Limite de validação

O teste de codec MOV/HEVC e o teste em dispositivo físico iOS ainda não foram realizados nesta rodada. O fluxo publicado foi percorrido com um vídeo MP4 no navegador autenticado: três frames foram gerados, o frame central foi selecionado, a revisão foi aberta e o JPG foi gerado em `1080 × 1920 px`. O comportamento de MOV/HEVC permanece condicionado ao suporte do navegador; a normalização por FFmpeg segue como fase posterior, caso se torne requisito obrigatório. A validação pública não substitui um teste físico de codec/memória em iPhone ou Android.

## Riscos e limites

- nenhum navegador consegue decodificar um codec que não suporta sem conversão;
- ainda não é possível afirmar comportamento real de Safari/iOS sem um arquivo MOV/HEVC e teste em dispositivo correspondente;
- o desempenho do processamento local depende do hardware e da memória disponíveis;
- não existe percentual de upload honesto enquanto a mídia permanecer exclusivamente local; o progresso exibido deve ser de preparação/frames.

## Próximo passo

Implementar a solução proposta somente após validação deste diagnóstico e registrar os resultados dos testes reais de MP4, MOV, Android e iPhone separadamente das validações locais.

Relaciona-se a [[Decisão - Gerador de Capas para Instagram no CRM 2026-08-25]].
