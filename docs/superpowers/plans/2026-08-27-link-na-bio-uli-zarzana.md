# Página de link na bio — Uli Zarzana Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and publish the static, mobile-first page at `http://ulizarzana.com/bio` with three tracked destinations for the Uli Zarzana project.

**Architecture:** Add a self-contained static page under `web/bio/`, consuming the existing A1/B1 design tokens from `web/assets/design-tokens.css`. Keep presentation in `web/assets/bio.css` and interaction/tracking in `web/assets/bio.js`; do not modify the Next.js CRM or the existing landing, identity, or brandbook pages.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, existing Google Fonts loading pattern, PowerShell contract test, Hostinger static hosting via FTP.

## Global Constraints

- The page must be a static document separated from the CRM Next.js application.
- The public destination is `http://ulizarzana.com/bio`.
- The page uses A1 + B1 + F1: `#332A26`, `#F7F0E7`, `#CDAE85`, `#B46F52`, Libre Baskerville 700 and Source Sans 3.
- The page has one centered column, no menu, no secondary navigation and no distracting sections.
- The page contains exactly three primary CTAs in this order: sales page, mentoring application and WhatsApp group.
- The sales page target is `https://ulizarzana.com/`.
- The application target is `https://form.respondi.app/eKphXGUV`.
- The WhatsApp target is the documented provisional URL `https://chat.whatsapp.com/ULI-GRUPO-PROVISORIO` and must be replaceable before definitive promotion.
- The approved headline is `Experiência que vira autoridade.`.
- The approved subheadline is `Estratégia para profissionais e empresários experientes avançarem com clareza, influência e consistência.`.
- Each CTA must include a stable identifier, UTM parameters and the `uli_bio_cta_click` event hook.
- No analytics script or credential may be invented, loaded or stored.
- Touch targets must be at least 44 px, with a preferred CTA height of 52–56 px.
- The implementation must have visible focus, WCAG AA contrast, descriptive image alternative text and reduced-motion support.
- The implementation must be verified at 320, 360, 375, 390, 414, 768, 1024 and 1440 px with no horizontal overflow or clipped content.
- The implementation must be published via FTP to the static root after local verification, then the public URL and assets must be checked separately.
- Existing unrelated worktree changes must not be staged or overwritten.

---

### Task 1: Create the static contract test first

**Files:**
- Create: `tests/validate-bio-page.ps1`
- Test: `web/bio/index.html`, `web/assets/bio.css`, `web/assets/bio.js`

**Interfaces:**
- Produces a PowerShell contract that later implementation must satisfy.
- Checks exact copy, exact destinations, CTA order, tracking identifiers, asset references and accessibility markers.

- [ ] **Step 1: Write the failing contract test**

Create `tests/validate-bio-page.ps1` with the following contract:

```powershell
param([string]$Root = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = 'Stop'

function Read-ProjectFile([string]$RelativePath) {
  $path = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Arquivo obrigatório ausente: $RelativePath"
  }
  return Get-Content -Raw -LiteralPath $path
}

function Assert-Contains([string]$Content, [string]$Needle, [string]$Description) {
  if ($Content.IndexOf($Needle, [System.StringComparison]::Ordinal) -lt 0) {
    throw "Contrato inválido: $Description ($Needle)"
  }
}

$html = Read-ProjectFile 'web/bio/index.html'
$css = Read-ProjectFile 'web/assets/bio.css'
$js = Read-ProjectFile 'web/assets/bio.js'

@(
  'lang="pt-BR"',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  'href="../assets/design-tokens.css"',
  'href="../assets/bio.css"',
  'src="../assets/bio.js"',
  'Experiência que vira autoridade.',
  'Estratégia para profissionais e empresários experientes avançarem com clareza, influência e consistência.',
  'Conhecer a Mentoria',
  'Aplicar para a Mentoria',
  'Entrar no grupo do WhatsApp',
  'https://ulizarzana.com/?utm_source=instagram&amp;utm_medium=bio&amp;utm_campaign=uli_bio&amp;utm_content=cta_mentoria',
  'https://form.respondi.app/eKphXGUV?utm_source=instagram&amp;utm_medium=bio&amp;utm_campaign=uli_bio&amp;utm_content=cta_aplicacao',
  'https://chat.whatsapp.com/ULI-GRUPO-PROVISORIO?utm_source=instagram&amp;utm_medium=bio&amp;utm_campaign=uli_bio&amp;utm_content=cta_whatsapp',
  'data-bio-cta="cta_mentoria"',
  'data-bio-cta="cta_aplicacao"',
  'data-bio-cta="cta_whatsapp"',
  'alt="Retrato editorial de Uli Zarzana"',
  'Link provisório de demonstração'
) | ForEach-Object { Assert-Contains $html $_ "HTML" }

Assert-Contains $html '<h1>' 'um único título principal'
if (($html | Select-String -Pattern '<h1\b' -AllMatches).Matches.Count -ne 1) {
  throw 'Contrato inválido: a página deve ter exatamente um h1'
}

@(
  '--color-ink',
  '--color-paper',
  '--color-accent-champagne',
  '--color-accent-terracotta',
  'min-height: 52px',
  ':focus-visible',
  'prefers-reduced-motion',
  'overflow-x: hidden',
  '@media (min-width: 768px)'
) | ForEach-Object { Assert-Contains $css $_ "CSS" }

@(
  'uli_bio_cta_click',
  'window.dataLayer',
  'cta_mentoria',
  'cta_aplicacao',
  'cta_whatsapp',
  'navigator.sendBeacon'
) | ForEach-Object { Assert-Contains $js $_ "JavaScript de tracking" }

$ctaOrder = [regex]::Matches($html, 'data-bio-cta="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$expectedOrder = @('cta_mentoria', 'cta_aplicacao', 'cta_whatsapp')
if (($ctaOrder -join '|') -ne ($expectedOrder -join '|')) {
  throw "Contrato inválido: ordem dos CTAs encontrada [$($ctaOrder -join ', ')]"
}

Write-Output 'Bio page contract: PASS'
```

- [ ] **Step 2: Run the contract to prove it fails before implementation**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tests/validate-bio-page.ps1`

Expected: FAIL because `web/bio/index.html`, `web/assets/bio.css` and `web/assets/bio.js` do not yet exist.

- [ ] **Step 3: Commit the test contract**

```bash
git add -- tests/validate-bio-page.ps1
git commit -m "test: definir contrato da pagina bio da uli"
```

### Task 2: Implement the HTML structure and approved copy

**Files:**
- Create: `web/bio/index.html`
- Use unchanged: `web/assets/design-tokens.css`
- Test: `tests/validate-bio-page.ps1`

**Interfaces:**
- Consumes the existing A1 design tokens and the F1 derivative `web/assets/fotografia/uli-f1-015-presenca-720x900.jpg`.
- Produces the semantic DOM consumed by `bio.css`, `bio.js` and the contract test.

- [ ] **Step 1: Add the document shell and metadata**

Create a Portuguese HTML document with:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#332A26">
  <meta name="description" content="Carreira, liderança e ascensão profissional com clareza, influência e direção.">
  <title>Uli Zarzana — Carreira, liderança e ascensão</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&amp;family=Source+Sans+3:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/design-tokens.css">
  <link rel="stylesheet" href="../assets/bio.css">
  <script src="../assets/bio.js" defer></script>
</head>
```

- [ ] **Step 2: Add the one-column semantic main content**

The body must contain a skip link, one `main`, one `h1`, a small F1 portrait, the approved identification/headline/subheadline and exactly three CTA anchors in this order. Use this exact CTA data:

```html
<a class="bio-cta bio-cta--primary"
   href="https://ulizarzana.com/?utm_source=instagram&amp;utm_medium=bio&amp;utm_campaign=uli_bio&amp;utm_content=cta_mentoria"
   target="_blank" rel="noopener noreferrer"
   data-bio-cta="cta_mentoria">
  <span class="bio-cta__copy"><small>OFERTA PRINCIPAL</small><strong>Conhecer a Mentoria</strong><em>Entenda o método para transformar capacidade em autoridade, influência e crescimento sustentável.</em></span>
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M7 17 17 7M8 7h9v9"/></svg>
</a>
<a class="bio-cta"
   href="https://form.respondi.app/eKphXGUV?utm_source=instagram&amp;utm_medium=bio&amp;utm_campaign=uli_bio&amp;utm_content=cta_aplicacao"
   target="_blank" rel="noopener noreferrer"
   data-bio-cta="cta_aplicacao">
  <span class="bio-cta__copy"><small>APLICAÇÃO</small><strong>Aplicar para a Mentoria</strong><em>Conte seu momento profissional ou empresarial e avalie se a mentoria faz sentido para você.</em></span>
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M7 17 17 7M8 7h9v9"/></svg>
</a>
<a class="bio-cta"
   href="https://chat.whatsapp.com/ULI-GRUPO-PROVISORIO?utm_source=instagram&amp;utm_medium=bio&amp;utm_campaign=uli_bio&amp;utm_content=cta_whatsapp"
   target="_blank" rel="noopener noreferrer"
   data-bio-cta="cta_whatsapp">
  <span class="bio-cta__copy"><small>CONTEÚDO E AVISOS</small><strong>Entrar no grupo do WhatsApp</strong><em>Acompanhe conteúdos, avisos e próximas oportunidades.</em></span>
  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M7 17 17 7M8 7h9v9"/></svg>
</a>
```

The footer must show `Instagram · @uli.zarzana` and the exact notice `Link provisório de demonstração — o destino do WhatsApp será substituído antes da divulgação definitiva.`.

- [ ] **Step 3: Run the contract and verify the HTML contract is the only remaining failure**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tests/validate-bio-page.ps1`

Expected: FAIL only because `bio.css` and `bio.js` have not been created yet; the HTML file and all copy/URLs are present.

### Task 3: Implement the responsive A1/B1/F1 presentation

**Files:**
- Create: `web/assets/bio.css`
- Test: `tests/validate-bio-page.ps1`

**Interfaces:**
- Consumes the token names `--color-ink`, `--color-paper`, `--color-accent-champagne`, `--color-accent-terracotta`, `--font-heading`, `--font-body`, `--leading-body` and `--tracking-label`.
- Produces a centered single-column layout with no horizontal scrolling at the required viewports.

- [ ] **Step 1: Add global layout and accessible focus rules**

Use `box-sizing: border-box`, `body { overflow-x: hidden; }`, a marfim canvas, a centered `.bio-shell` with `width: min(100% - 32px, 600px)`, and a skip link visible on focus. Use no gradients, decorative external icons or new brand colors.

- [ ] **Step 2: Add the mobile-first header and typography**

The avatar must be 88 px square with a 50% crop using the existing F1 image. Use Source Sans 3 for labels/body and Libre Baskerville 700 for `h1`. The headline must remain legible at 320 px with `font-size: clamp(2rem, 9vw, 3.25rem)`, `line-height: 1.06` and a controlled measure.

- [ ] **Step 3: Add CTA states and sizing**

Each `.bio-cta` must be a block-level anchor with `min-height: 52px`, at least 16 px internal spacing, an 8 px gap from adjacent CTAs, a visible border, `touch-action: manipulation`, cursor feedback, and a 150–300 ms color/transform transition that does not alter surrounding layout. The first CTA uses marrom profundo with marfim text; the other two use a light surface with marrom text. Champagne is limited to labels and the small accent rule.

- [ ] **Step 4: Add desktop scaling and reduced-motion behavior**

At `@media (min-width: 768px)`, increase the shell top spacing and headline scale without creating a second column. At `@media (prefers-reduced-motion: reduce)`, set transitions and scroll behavior to `none`/`0ms` while preserving focus and pressed states.

- [ ] **Step 5: Run the contract**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tests/validate-bio-page.ps1`

Expected: FAIL only on JavaScript markers until Task 4 is complete.

### Task 4: Implement deterministic click tracking without external analytics

**Files:**
- Create: `web/assets/bio.js`
- Test: `tests/validate-bio-page.ps1`

**Interfaces:**
- Consumes anchors with `data-bio-cta` values `cta_mentoria`, `cta_aplicacao` and `cta_whatsapp`.
- Produces a `uli_bio_cta_click` event in `window.dataLayer`, an optional `gtag` event when a host page already provides it, and a best-effort `navigator.sendBeacon` call only when a future first-party endpoint is configured in `window.ULI_BIO_TRACKING_ENDPOINT`.

- [ ] **Step 1: Add the tracking implementation**

Implement this behavior in `web/assets/bio.js`:

```javascript
(function () {
  'use strict';

  var anchors = document.querySelectorAll('[data-bio-cta]');
  var eventName = 'uli_bio_cta_click';

  function track(anchor) {
    var payload = {
      event: eventName,
      cta: anchor.getAttribute('data-bio-cta'),
      destination: anchor.href,
      path: window.location.pathname,
      timestamp: new Date().toISOString()
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        cta: payload.cta,
        destination: payload.destination
      });
    }

    if (typeof window.ULI_BIO_TRACKING_ENDPOINT === 'string' && navigator.sendBeacon) {
      navigator.sendBeacon(window.ULI_BIO_TRACKING_ENDPOINT, JSON.stringify(payload));
    }
  }

  anchors.forEach(function (anchor) {
    anchor.addEventListener('click', function () { track(anchor); });
  });
}());
```

- [ ] **Step 2: Run the contract and a browser-level event check**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tests/validate-bio-page.ps1`.

Expected: `Bio page contract: PASS`.

In a browser console on the local page, click each CTA and verify `window.dataLayer.at(-1).event === 'uli_bio_cta_click'` and that the three `cta` values match their anchors. Verify no network request is sent because `ULI_BIO_TRACKING_ENDPOINT` is not configured.

- [ ] **Step 3: Commit the implementation**

```bash
git add -- web/bio/index.html web/assets/bio.css web/assets/bio.js tests/validate-bio-page.ps1
git commit -m "feat: criar pagina de link na bio da uli"
```

### Task 5: Run the complete local quality and responsive verification

**Files:**
- Verify: `web/bio/index.html`
- Verify: `web/assets/bio.css`
- Verify: `web/assets/bio.js`
- Verify: `tests/validate-bio-page.ps1`

**Interfaces:**
- Consumes the complete static page and contract from Tasks 1–4.
- Produces measured local evidence required before publication.

- [ ] **Step 1: Run static contract and whitespace checks**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/validate-bio-page.ps1
git diff --check HEAD~1..HEAD
```

Expected: contract PASS and no whitespace errors.

- [ ] **Step 2: Serve the static root locally**

Run from the repository root:

```powershell
python -m http.server 8088 --directory web
```

Open `http://127.0.0.1:8088/bio/` and verify the page uses the shared token CSS and the F1 image with HTTP 200 responses.

- [ ] **Step 3: Verify all required viewport widths**

At 320, 360, 375, 390, 414, 768, 1024 and 1440 px, verify:

- the headline and three CTA labels are visible;
- no horizontal scrollbar exists;
- the avatar and CTA content are not clipped;
- all anchors have at least 44 px effective touch height;
- focus moves through the skip link, three CTAs and footer link in visual order;
- reduced motion does not remove content or focus indication.

- [ ] **Step 4: Verify exact links and event payloads**

Inspect the DOM and confirm:

```text
cta_mentoria -> https://ulizarzana.com/?utm_source=instagram&utm_medium=bio&utm_campaign=uli_bio&utm_content=cta_mentoria
cta_aplicacao -> https://form.respondi.app/eKphXGUV?utm_source=instagram&utm_medium=bio&utm_campaign=uli_bio&utm_content=cta_aplicacao
cta_whatsapp -> https://chat.whatsapp.com/ULI-GRUPO-PROVISORIO?utm_source=instagram&utm_medium=bio&utm_campaign=uli_bio&utm_content=cta_whatsapp
```

Record the WhatsApp URL as provisional; do not report it as a live group.

### Task 6: Publish the static assets and record the release

**Files:**
- Publish: `web/bio/index.html` → remote `/public_html/bio/index.html`
- Publish: `web/assets/bio.css` → remote `/public_html/assets/bio.css`
- Publish: `web/assets/bio.js` → remote `/public_html/assets/bio.js`
- Modify: `cofre-uli/01 - Estratégia/Página de Link na Bio - Uli Zarzana 2026-08-27.md`

**Interfaces:**
- Consumes the locally verified static artifacts and the existing Hostinger FTP configuration.
- Produces a public page at `https://ulizarzana.com/bio/` and a vault record with separate local, Git, FTP and public-verification states.

- [ ] **Step 1: Upload only the three intended files via FTP**

Use the configured Hostinger FTP connection without printing or recording credentials. Upload only the three paths listed above. Do not delete or overwrite `index.html`, `default.php`, `/identidade-visual/`, `/brandbook/` or unrelated assets.

- [ ] **Step 2: Verify public HTTP responses**

Run:

```powershell
@(
  'https://ulizarzana.com/bio/',
  'https://ulizarzana.com/assets/bio.css',
  'https://ulizarzana.com/assets/bio.js'
) | ForEach-Object {
  $response = Invoke-WebRequest -UseBasicParsing -Uri $_
  if ($response.StatusCode -ne 200) { throw "HTTP inesperado em $_ : $($response.StatusCode)" }
  Write-Output "$($_) -> $($response.StatusCode)"
}
```

Open the public page at desktop and mobile widths, verify the same three CTAs and check the browser console for zero errors. Verify the sales page and Respondi form targets resolve; record the WhatsApp target as the configured placeholder rather than claiming group access.

- [ ] **Step 3: Update the vault note**

Change the note status to `implementado-publicado` and add the implementation files, exact publication paths, commit hash, public verification timestamp, local viewport evidence and the explicit warning that the WhatsApp destination remains provisional. Keep credentials out of the note.

- [ ] **Step 4: Commit and push the release record without staging unrelated work**

```bash
git add -- cofre-uli/01 - Estratégia/Página de Link na Bio - Uli Zarzana 2026-08-27.md
git commit -m "docs: registrar publicacao da pagina bio da uli"
git push origin main
```

Verify that the pushed `origin/main` hash equals local `HEAD` and report Git, FTP and public verification as separate states.

## Final acceptance checklist

- [ ] `http://ulizarzana.com/bio` resolves to the new page.
- [ ] The page is static and remains outside the CRM Next.js application.
- [ ] The three destinations are clear, ordered and clickable.
- [ ] The sales page and Respondi form use the exact approved URLs with UTMs.
- [ ] The WhatsApp destination is visibly documented as provisional.
- [ ] The A1/B1/F1 system is applied without new colors, fonts or the provisional monogram.
- [ ] The page is responsive and accessible at every required viewport.
- [ ] The contract test, local browser checks and public HTTP checks have fresh evidence.
- [ ] Only intended files were published and staged.
- [ ] The cofre note, Git `main`, FTP publication and public verification are all updated separately.

