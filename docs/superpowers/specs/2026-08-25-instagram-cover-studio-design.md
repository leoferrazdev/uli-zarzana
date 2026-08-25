# Especificação de design — módulo de capas para Instagram

**Data:** 2026-08-25
**Status:** aprovado para especificação e planejamento
**Projeto:** CRM do ecossistema digital da Uli Zarzana

## 1. Contexto

O projeto da Uli já possui um padrão visual aprovado para capas sociais na seção Instagram dos mockups públicos de identidade visual e brandbook. Esse padrão determina o formato 9:16, a combinação A1 + B1 + T1 + F1, a estrutura de três blocos textuais e o uso de degradê de proteção em marrom profundo.

O CRM precisa oferecer uma maneira simples e guiada para que a Uli transforme um vídeo recém-gravado ou uma foto escolhida em uma capa pronta para publicação no Instagram, sem depender de captura de tela, editor externo ou envio de arquivos para o servidor.

## 2. Decisão central

O módulo aceitará uma única entrada de mídia: vídeo ou foto.

- Quando receber um vídeo, extrairá localmente três frames candidatos e selecionará automaticamente um deles como recomendação inicial.
- Quando receber uma foto, usará a foto diretamente como imagem de fundo.
- A seleção manual de frame será opcional.
- O processamento será local no navegador.
- A entrega final será um arquivo PNG ou JPG baixado pela usuária.

O vídeo não será obrigatório e nenhuma mídia será persistida no Supabase, no CRM ou no servidor no MVP.

## 3. Objetivos

- Reduzir ao mínimo o número de ações necessárias para gerar uma capa.
- Orientar a usuária por etapas claras, sem exigir conhecimento de design.
- Preservar automaticamente o sistema visual aprovado da Uli.
- Permitir edição controlada de contexto, headline e subtítulo.
- Entregar uma arte 1080 × 1920 px pronta para uso em Reels, Stories e conteúdos sociais.
- Evitar armazenamento de vídeos e fotos pessoais no backend.

## 4. Não objetivos do MVP

O MVP não incluirá:

- histórico de capas;
- armazenamento de vídeos ou imagens;
- publicação automática no Instagram;
- integração com a API do Instagram;
- edição avançada de imagem;
- múltiplos layouts independentes;
- animação ou exportação de capa em vídeo;
- colaboração, aprovação ou comentários de equipe.

## 5. Entrada e fluxo do usuário

### Rota

O módulo será disponibilizado na rota autenticada:

`/capas`

A Visão Geral terá um acesso destacado com o rótulo **Criar capa para Instagram**.

### Etapa 1 — Adicionar mídia

Interface com um único campo de seleção ou arrastar e soltar:

**Adicionar vídeo ou foto**

Formatos previstos:

- vídeo compatível com o elemento HTML `<video>`;
- imagens compatíveis com o elemento HTML `<img>`.

Após a seleção, a interface deve informar o nome do arquivo e avançar para a etapa de escolha da imagem.

### Etapa 2 — Escolher imagem

Para foto:

- mostrar a foto adaptada ao quadro 9:16;
- aplicar automaticamente o enquadramento de cobertura;
- permitir substituição do arquivo.

Para vídeo:

- carregar o vídeo a partir de um `Object URL` local;
- obter a duração e capturar frames em aproximadamente 25%, 50% e 75% do tempo;
- selecionar automaticamente o frame central como recomendação inicial;
- apresentar os três frames como miniaturas selecionáveis;
- atualizar a prévia ao selecionar outra miniatura.

A seleção manual deve ser opcional. O fluxo padrão deve permitir que a usuária continue sem tocar nas miniaturas.

### Etapa 3 — Definir conteúdo

A tela oferecerá quatro modelos editoriais baseados nas aplicações aprovadas:

1. **Carreira e reconhecimento**
2. **Liderança e decisão**
3. **Autoridade e influência**
4. **Ascensão e próximo passo**

Ao escolher um modelo, os campos são preenchidos com uma sugestão editável. Os valores iniciais são:

| Modelo | Contexto | Headline | Subtítulo |
| --- | --- | --- | --- |
| Carreira e reconhecimento | capacidade que vira | autoridade. | para o próximo passo |
| Liderança e decisão | decisões maiores pedem | presença. | na liderança |
| Autoridade e influência | o que você construiu | percebido. | com consistência |
| Ascensão e próximo passo | o próximo passo pede | direção. | sem perder identidade |

Todos os campos permanecem editáveis. O sistema deve orientar a escrita curta e bloquear ou sinalizar textos que prejudiquem a leitura no quadro final.

### Etapa 4 — Revisar e baixar

A etapa final apresentará:

- prévia grande da capa;
- indicação visual de que a proporção é 9:16;
- resumo do arquivo de origem;
- botão **Baixar PNG**;
- botão **Baixar JPG**;
- ação para voltar e editar mídia ou conteúdo.

O nome do arquivo exportado será gerado localmente a partir do modelo escolhido, sem incluir dados pessoais além do necessário para identificar a peça.

## 6. Sistema visual

O renderizador seguirá a regra de aplicabilidade aprovada:

- canvas final de 1080 × 1920 px;
- imagem de fundo ocupando toda a área;
- degradê de leitura concentrado atrás da área textual;
- marrom profundo `#332A26` como proteção e base;
- marfim `#F7F0E7` para leitura principal;
- champagne `#CDAE85` e terracota `#B46F52` como acentos;
- Libre Baskerville 700 para headline;
- Source Sans 3 para contexto e subtítulo;
- exatamente três blocos textuais: contexto, headline e subtítulo;
- sem nome da expert, métricas, rodapé técnico, ícones ou indicação de formato dentro da arte;
- sem cobrir rosto, olhos ou mãos quando a composição permitir identificar essas áreas.

O layout será fixo no MVP. A usuária editará conteúdo e mídia, não regras de composição.

## 7. Arquitetura técnica

### Componentes

- `app/capas/page.tsx`: rota protegida e entrada do módulo.
- `components/cover-studio.tsx`: fluxo client-side, etapas, seleção de mídia e estado do formulário.
- `lib/covers/cover-presets.ts`: modelos editoriais e limites de texto.
- `lib/covers/render-cover.ts`: composição da arte no canvas e exportação PNG/JPG.
- `app/globals.css`: tokens e estilos responsivos do módulo, reutilizando A1/B1.

### Processamento local

- `URL.createObjectURL(file)` para vídeo e imagem.
- `HTMLVideoElement` para carregar o vídeo e buscar tempos candidatos.
- `HTMLCanvasElement` para capturar frames e renderizar a capa final.
- `document.fonts.load()` antes da exportação, quando disponível, para priorizar Libre Baskerville e Source Sans 3.
- `URL.revokeObjectURL()` ao substituir ou finalizar a mídia para liberar memória.

Nenhum endpoint novo do Supabase será criado nesta etapa. A sessão atual do CRM continuará protegendo a rota, mas os arquivos não sairão do navegador.

## 8. Estados e erros

O módulo deverá tratar claramente:

- nenhum arquivo selecionado;
- formato não suportado;
- arquivo sem leitura pelo navegador;
- vídeo sem duração válida;
- falha ao buscar frame;
- imagem muito estreita ou muito larga, com aviso de recorte automático;
- headline ou subtítulo longos demais;
- falha de exportação do canvas;
- troca de mídia antes da conclusão.

Mensagens de erro devem ser curtas, orientadas à ação e apresentadas na própria etapa em que o problema ocorre.

## 9. Responsividade e acessibilidade

- Desktop: painel de etapas à esquerda e prévia ampla à direita.
- Mobile: etapas empilhadas, controles de texto antes da prévia final e botões de download em largura confortável.
- Todos os campos terão `label` explícito.
- Miniaturas de frames serão botões com estado selecionado acessível.
- A prévia terá texto alternativo ou descrição equivalente.
- Foco, contraste e estados de erro devem permanecer visíveis.
- A interface não dependerá apenas de cor para indicar etapa ou seleção.

## 10. Critérios de aceite

1. Usuário autenticado acessa `/capas` pela Visão Geral.
2. Uma foto pode gerar uma capa sem necessidade de vídeo.
3. Um vídeo pode gerar uma capa sem necessidade de foto externa.
4. O vídeo gera três frames candidatos no navegador.
5. Um frame é selecionado automaticamente e pode ser trocado opcionalmente.
6. Os quatro modelos editoriais preenchem campos editáveis.
7. A prévia mantém proporção 9:16 e o sistema visual aprovado.
8. A exportação gera arquivos PNG e JPG em 1080 × 1920 px.
9. Nenhum vídeo ou foto é enviado ao Supabase ou a um endpoint do CRM.
10. O fluxo permanece utilizável em desktop e mobile.
11. Testes estruturais e build do Next.js passam antes da publicação.

## 11. Fora do escopo e evolução posterior

Depois da validação real do fluxo, poderão ser avaliados:

- salvamento voluntário da capa no histórico;
- biblioteca de modelos aprovados;
- detecção automática de rosto e área livre para texto;
- seleção de frame por nitidez e composição;
- integração com biblioteca de fotos F1;
- exportação com presets para outras redes;
- publicação ou agendamento via integração oficial do Instagram.
