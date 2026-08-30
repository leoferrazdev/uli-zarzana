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
$head = [regex]::Match($html, '(?is)<head>(.*?)</head>').Groups[1].Value

@(
  'lang="pt-BR"',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  'href="../assets/design-tokens.css"',
  'href="../assets/bio.css"',
  'src="../assets/bio.js"',
  'Experiência que vira autoridade.',
  'Estratégia para profissionais e empresários experientes avançarem com clareza, influência e consistência.',
  'Aplicar para a Mentoria',
  'https://form.respondi.app/eKphXGUV?utm_source=instagram&amp;utm_medium=bio&amp;utm_campaign=uli_bio&amp;utm_content=cta_aplicacao',
  'data-bio-cta="cta_aplicacao"',
  'alt="Retrato editorial de Uli Zarzana"',
  'Aplicação em demonstração'
) | ForEach-Object { Assert-Contains $html $_ "HTML" }

@(
  '<script type="text/javascript">',
  'https://www.clarity.ms/tag/',
  'yan9fnetv0',
  'c[a]=c[a]||function()'
) | ForEach-Object { Assert-Contains $head $_ "rastreamento Clarity no head" }

@(
  'https://www.googletagmanager.com/gtag/js?id=G-LTYMBWVDD5',
  "gtag('config', 'G-LTYMBWVDD5')"
) | ForEach-Object { Assert-Contains $head $_ "rastreamento Google Analytics 4 no head" }

@(
  'Conhecer a Mentoria',
  'Entrar no grupo do WhatsApp',
  'data-bio-cta="cta_mentoria"',
  'data-bio-cta="cta_whatsapp"',
  'chat.whatsapp.com/ULI-GRUPO-PROVISORIO'
) | ForEach-Object {
  if ($html.IndexOf($_, [System.StringComparison]::Ordinal) -ge 0) {
    throw "Contrato inválido: CTA removido ainda presente ($_ )"
  }
}

Assert-Contains $html '<h1 id="bio-title">' 'um único título principal'
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
  'flex: 0 1 600px',
  'max-width: 600px',
  '@media (min-width: 768px)'
) | ForEach-Object { Assert-Contains $css $_ "CSS" }

if ($css -notmatch 'body\s*\{[^}]*min-width:\s*0;') {
  throw 'Contrato inválido: o body deve aceitar a largura disponível sem overflow no viewport mínimo'
}

@(
  'uli_bio_cta_click',
  'window.dataLayer',
  "getAttribute('data-bio-cta')",
  'navigator.sendBeacon'
) | ForEach-Object { Assert-Contains $js $_ "JavaScript de tracking" }

$ctaOrder = [regex]::Matches($html, 'data-bio-cta="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$expectedOrder = @('cta_aplicacao')
if (($ctaOrder -join '|') -ne ($expectedOrder -join '|')) {
  throw "Contrato inválido: ordem dos CTAs encontrada [$($ctaOrder -join ', ')]"
}

if (($ctaOrder | Measure-Object).Count -ne 1) {
  throw "Contrato inválido: a página deve exibir exatamente um CTA de conversão"
}

Write-Output 'Bio page contract: PASS'
