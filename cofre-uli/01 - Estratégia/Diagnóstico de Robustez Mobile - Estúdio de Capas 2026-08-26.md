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
status: diagnóstico-aguardando-validação
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

## Riscos e limites

- nenhum navegador consegue decodificar um codec que não suporta sem conversão;
- ainda não é possível afirmar comportamento real de Safari/iOS sem um arquivo MOV/HEVC e teste em dispositivo correspondente;
- o desempenho do processamento local depende do hardware e da memória disponíveis;
- não existe percentual de upload honesto enquanto a mídia permanecer exclusivamente local; o progresso exibido deve ser de preparação/frames.

## Próximo passo

Implementar a solução proposta somente após validação deste diagnóstico e registrar os resultados dos testes reais de MP4, MOV, Android e iPhone separadamente das validações locais.

Relaciona-se a [[Decisão - Gerador de Capas para Instagram no CRM 2026-08-25]].
