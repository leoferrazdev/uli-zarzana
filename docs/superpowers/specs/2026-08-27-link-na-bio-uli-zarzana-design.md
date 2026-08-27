# Página de link na bio — Uli Zarzana

> **Status:** arquitetura e copy aprovadas para especificação em 27/08/2026

## Objetivo

Criar uma página pública em `http://ulizarzana.com/bio` para centralizar os três principais destinos comerciais do projeto da Uli Zarzana. A experiência deve atender principalmente visitantes que chegam pelo Instagram ou por outras redes sociais, permitindo que escolham rapidamente entre conhecer a mentoria, aplicar para a mentoria ou entrar no grupo do WhatsApp.

## Decisão determinística

A página será um documento estático, separado do CRM Next.js e instalado na raiz pública do domínio. O layout será uma coluna central, mobile-first, sem menu, sem navegação secundária e sem seções que desviem da escolha dos três destinos.

O sistema visual aplicado será o conjunto aprovado A1 + B1 + F1:

- marrom profundo `#332A26`;
- marfim `#F7F0E7`;
- champagne `#CDAE85`;
- terracota `#B46F52` como acento seletivo;
- Libre Baskerville 700 em títulos;
- Source Sans 3 em textos, etiquetas e interface;
- fotografia F1 aprovada em avatar/retrato pequeno;
- monograma institucional fora da composição final, pois continua provisório.

## Base estratégica

A página deve traduzir o posicionamento aprovado: Uli Zarzana é uma especialista em carreira, liderança e ascensão profissional, aplicável a profissionais e empresários experientes. A mensagem deve preservar autoridade executiva, clareza, prática e crescimento sustentável, evitando desenvolvimento pessoal genérico, motivação vazia e exclusividade corporativa.

O visitante vindo de uma rede social tende a estar em um dos três estágios:

1. quer entender a oferta antes de decidir;
2. já tem intenção suficiente para preencher uma aplicação;
3. quer acompanhar conteúdos, avisos e oportunidades com menor fricção.

Por isso, os destinos serão apresentados nesta ordem:

1. página de vendas, como caminho principal para entendimento da oferta;
2. formulário de aplicação, como caminho de maior intenção;
3. grupo do WhatsApp, como caminho de relacionamento e nutrição.

## Copy aprovada

### Identificação

- Nome: `Uli Zarzana`
- Etiqueta: `CARREIRA · LIDERANÇA · ASCENSÃO`

### Mensagem principal

- Headline: **Experiência que vira autoridade.**
- Subheadline: `Estratégia para profissionais e empresários experientes avançarem com clareza, influência e consistência.`

### Destino 1 — página de vendas

- Etiqueta: `OFERTA PRINCIPAL`
- CTA: **Conhecer a Mentoria**
- Apoio: `Entenda o método para transformar capacidade em autoridade, influência e crescimento sustentável.`
- URL: `https://ulizarzana.com/`

### Destino 2 — aplicação

- Etiqueta: `APLICAÇÃO`
- CTA: **Aplicar para a Mentoria**
- Apoio: `Conte seu momento profissional ou empresarial e avalie se a mentoria faz sentido para você.`
- URL: `https://form.respondi.app/eKphXGUV`

### Destino 3 — WhatsApp

- Etiqueta: `CONTEÚDO E AVISOS`
- CTA: **Entrar no grupo do WhatsApp**
- Apoio: `Acompanhe conteúdos, avisos e próximas oportunidades.`
- URL provisória: `https://chat.whatsapp.com/ULI-GRUPO-PROVISORIO`

O destino do WhatsApp deverá ser substituído antes da divulgação pública. A página exibirá uma nota discreta de que esse link está configurado provisoriamente para demonstração.

## Wireframe mobile

```text
[retrato/avatar da Uli]
Uli Zarzana
CARREIRA · LIDERANÇA · ASCENSÃO

Experiência que vira autoridade.

Estratégia para profissionais e empresários
experientes avançarem com clareza,
influência e consistência.

[Conhecer a Mentoria]
[Aplicar para a Mentoria]
[Entrar no grupo do WhatsApp]

Instagram · @uli.zarzana
```

No viewport mínimo de 320 px, todos os elementos devem permanecer dentro da largura disponível, sem overflow horizontal ou texto cortado.

## Wireframe desktop

```text
                 [retrato/avatar]
                   Uli Zarzana
          CARREIRA · LIDERANÇA · ASCENSÃO

             Experiência que vira autoridade.
       Estratégia para profissionais e empresários
       experientes avançarem com clareza, influência
                    e consistência.

              [Conhecer a Mentoria]
              [Aplicar para a Mentoria]
           [Entrar no grupo do WhatsApp]

                  Instagram · @uli.zarzana
```

O desktop não receberá uma segunda coluna ou bloco decorativo independente. A restrição da largura central preserva escaneabilidade, equivalência com a experiência mobile e foco nos três destinos.

## Componentes

- `BioHeader`: retrato F1, nome e identificação editorial;
- `BioIntro`: headline e subheadline;
- `BioCtaLink`: componente repetível com etiqueta, CTA, texto de apoio, ícone SVG e destino;
- `BioFooter`: Instagram e aviso provisório do WhatsApp;
- `bio.js`: UTMs e rastreamento de cliques.

## Tracking

Cada CTA terá um identificador estável:

- `cta_mentoria`;
- `cta_aplicacao`;
- `cta_whatsapp`.

Os destinos receberão UTMs da campanha `uli_bio`:

- `utm_source=instagram`;
- `utm_medium=bio`;
- `utm_campaign=uli_bio`;
- `utm_content` específico de cada CTA.

O JavaScript emitirá o evento `uli_bio_cta_click` em `window.dataLayer`, quando disponível, e em `gtag`, quando já existir uma configuração externa. Nenhum script de analytics será inventado ou carregado sem identificador aprovado.

## Acessibilidade, responsividade e performance

- HTML semântico com um único `h1`;
- links reais, não containers clicáveis;
- áreas de toque com pelo menos 44 px, preferencialmente 52–56 px;
- foco visível e estados de hover/pressed sem deslocar o layout;
- contraste mínimo WCAG AA conforme a paleta técnica aprovada;
- `alt` descritivo para a fotografia;
- `prefers-reduced-motion` respeitado;
- fonte com `display=swap`;
- dimensões declaradas para evitar mudança de layout;
- uma imagem F1 pequena e otimizada, sem vídeo ou carrossel;
- validação em 320, 360, 375, 390, 414, 768, 1024 e 1440 px.

## Arquivos previstos

- `web/bio/index.html`;
- `web/assets/bio.css`;
- `web/assets/bio.js`;
- teste de contrato específico da página, se necessário para validar URLs, CTAs e estrutura.

Não serão alterados o CRM Next.js, as páginas `/identidade-visual/` e `/brandbook/`, nem a landing page da raiz além do necessário para publicar a nova pasta `/bio/`.

## Critérios de aceite

- `/bio` existe e responde publicamente;
- os três CTAs aparecem em ordem e com hierarquia clara;
- a página de vendas aponta para `https://ulizarzana.com/`;
- a aplicação aponta para `https://form.respondi.app/eKphXGUV`;
- o grupo usa o placeholder documentado e substituível;
- links abrem corretamente em desktop e celular;
- não existe rolagem horizontal nem conteúdo cortado nos breakpoints definidos;
- o título e os textos continuam legíveis em 320 px;
- o console não apresenta erros;
- os eventos e UTMs estão presentes nos três destinos;
- a implementação permanece estática e compatível com publicação via FTP.

