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
$expectedOrder = @('cta_mentoria', 'cta_aplicacao', 'cta_whatsapp')
if (($ctaOrder -join '|') -ne ($expectedOrder -join '|')) {
  throw "Contrato inválido: ordem dos CTAs encontrada [$($ctaOrder -join ', ')]"
}

Write-Output 'Bio page contract: PASS'
