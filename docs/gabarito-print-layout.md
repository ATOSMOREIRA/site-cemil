# Gabarito — Layout e Impressão (Guia de Implementação)

Este guia descreve uma abordagem prática para criar um template de gabarito (folha de prova/gabarito) com plano de fundo e áreas substituíveis (placeholders), e gerar saída pronta para impressão/PDF. Pode ser adaptado a PHP (server-side) ou a um fluxo cliente (JS + impressão via janela ou PDF via headless browser).

**Resumo**
- Usar um template HTML que contém placeholders legíveis (ex.: `{{NOME}}`, `{{TURMA}}`, `{{RESP_1}}`).
- Posicionar cada placeholder com CSS absoluto usando unidades de impressão (mm) para precisão.
- Usar uma imagem de plano de fundo (template visual) como `img` intra-page (recomendado para impressão) e/ou via `background-image` para visualização em tela.
- Substituir placeholders no servidor (PHP/Twig) ou no cliente (JS) e gerar PDF com `wkhtmltopdf`, `Puppeteer` (headless Chrome) ou bibliotecas PHP como `Dompdf`.

---

## Estrutura mínima do template HTML

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Gabarito — {{ID}}</title>
  <link rel="stylesheet" href="/assets/css/gabarito.css">
</head>
<body>
  <div class="gabarito-page">
    <!-- Imagem de fundo (sempre incluída no DOM; torna confiável a impressão de background) -->
    <img class="gabarito-bg" src="/uploads/gabaritos/bg-template-1.png" alt="" aria-hidden="true">

    <!-- Placeholders: posicionados com CSS; data-placeholder identifica a chave para substituição -->
    <div class="placeholder" data-placeholder="NOME" style="top:25mm; left:20mm; width:120mm; height:8mm">{{NOME}}</div>
    <div class="placeholder" data-placeholder="TURMA" style="top:35mm; left:20mm; width:60mm; height:6mm">{{TURMA}}</div>

    <!-- Exemplo de imagem de aluno (substituir src) -->
    <img class="placeholder-img" data-placeholder-img="FOTO" src="{{FOTO_URL}}" style="top:20mm; left:140mm; width:40mm; height:50mm;" alt="Foto">
  </div>
</body>
</html>
```

Observações:
- Use `data-placeholder` / `data-placeholder-img` para localizar facilmente os elementos que serão substituídos por código.
- O conteúdo inicial `{{NOME}}` é opcional — facilita depuração se a substituição falhar.

---

## CSS de layout e impressão (exemplo)

```css
/* arquivo: public/assets/css/gabarito.css */
@page { size: A4; margin: 0; }
html, body { height: 297mm; width: 210mm; margin:0; }
.gabarito-page {
  width: 210mm;
  height: 297mm;
  position: relative;
  overflow: hidden;
  font-family: "Helvetica Neue", Arial, sans-serif;
  -webkit-print-color-adjust: exact; /* garante impressão de cores/background */
  color-adjust: exact;
}
.gabarito-bg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  z-index: 0;
}
.placeholder, .placeholder-img {
  position: absolute;
  z-index: 2; /* acima do background */
  box-sizing: border-box;
}
.placeholder { font-size: 10pt; }
.placeholder-img { object-fit: cover; }

/* Impressão: cada .gabarito-page em um papel */
@media print {
  .gabarito-page { page-break-after: always; }
}
```

Dicas:
- Use unidades `mm` para obter maior correlação com o A4 físico.
- Defina `@page { margin: 0 }` e peça ao usuário configurar "Sem margens" (ou use ferramentas de geração de PDF que controlem margens).

---

## Substituição de placeholders — Server-side (PHP simples)

```php
// Carrega template HTML
$template = file_get_contents(__DIR__ . '/templates/gabarito-template.html');
// Dados do estudante
$data = [
  'NOME' => 'João da Silva',
  'TURMA' => '6º ano A',
  'FOTO_URL' => '/uploads/fotos/123.png'
];
// Segurança: escape dos valores para HTML
$safe = array_map(function($v){ return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }, $data);
// Constrói mapa de substituição das chaves entre {{KEY}}
$map = [];
foreach($safe as $k=>$v) $map['{{'.$k.'}}'] = $v;

$output = strtr($template, $map);
// Envia HTML pronto para impressão ou para conversão em PDF
echo $output;
```

Observações:
- Para projetos maiores, prefira engines de template (Twig, Blade) e passe dados no `render()` — isso evita substituições à mão e melhora manutenção.
- Sempre escape dados do usuário.

---

## Substituição de placeholders — Client-side (JS)

```js
// `data` objeto com chaves correspondentes (NOME, TURMA, etc.)
function preencherPlaceholders(rootEl, data){
  rootEl.querySelectorAll('[data-placeholder]').forEach(el=>{
    const key = el.dataset.placeholder;
    el.textContent = data[key] || '';
  });
  // imagens
  rootEl.querySelectorAll('[data-placeholder-img]').forEach(img=>{
    const key = img.dataset.placeholderImg;
    if(data[key]) img.src = data[key];
  });
}

// imprimir: abre nova janela com HTML pronto (inclui CSS)
function imprimirGabaritoHtml(html){
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  // w.close(); // opcional
}
```

Fluxo cliente comum:
1. Carrega o template (via fetch ou direto no DOM).
2. Chama `preencherPlaceholders()` com os dados.
3. Abre a janela/iframe e chama `print()`.

---

## Geração de PDF (opções e exemplos)

1) Puppeteer (Headless Chrome) — recomendado para fidelidade e suporte a fundos

```js
// node script
const puppeteer = require('puppeteer');
(async()=>{
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file:///c:/xampp/htdocs/output/gabarito-preenchido.html', {waitUntil: 'networkidle0'});
  await page.pdf({ path: 'gabarito.pdf', format: 'A4', printBackground: true });
  await browser.close();
})();
```

2) wkhtmltopdf — simples, mas atenção às versões e CSS suportado

```bash
wkhtmltopdf --enable-local-file-access --print-media-type --background gabarito-preenchido.html gabarito.pdf
```

3) Dompdf (PHP) — bom para integrações rápidas em PHP, limita CSS avançado

```php
use Dompdf\Dompdf;
$dompdf = new Dompdf();
$dompdf->loadHtml($outputHtml);
$dompdf->setPaper('A4','portrait');
$dompdf->render();
$dompdf->stream('gabarito.pdf', ['Attachment'=>false]);
```

Observações sobre fundos e imagens:
- Muitos navegadores exigem a opção "Print backgrounds" habilitada — para PDFs automatizados, use Puppeteer (`printBackground:true`) ou wkhtmltopdf com `--background`.
- Se o motor PDF ignorar `background-image`, inclua explicitamente um `<img class="gabarito-bg">` no DOM (como no exemplo acima).

---

## Upload e seleção de plano de fundo (fluxo recomendado)

- Ao adicionar novos templates visuais (plano de fundo), salve as imagens em uma pasta pública (`/uploads/gabaritos/`) e armazene metadados (nome, dimensões, margens) no banco.
- No editor/admin, permita posicionar placeholders sobre a imagem (drag & drop) e salve as coordenadas (top/left/width/height em mm ou em percentual).
- Ao renderizar, aplique essas coordenadas como estilos inline (ou gere um CSS dinâmico) para cada placeholder.

---

## Precisão de posicionamento (workflow prático)

1. Monte o template no Figma/Illustrator/Photoshop em A4 (210×297 mm).
2. Exporte a imagem final com resolução média/alta (300 DPI para impressão de alta qualidade).
3. Para cada placeholder, copie suas coordenadas e converta para mm (ou exporte direto em mm quando a ferramenta permitir).
4. Ao salvar coordenadas no servidor, armazene como `top_mm`, `left_mm`, `width_mm`, `height_mm`.
5. Ao renderizar, gere o atributo `style="top:XXmm;left:YYmm; width:ZZmm; height:WWmm;"`.

Dica: trabalhar em mm evita cálculos de conversão entre pixels e mm durante a impressão.

---

## Boas práticas e segurança

- Escape sempre dados do usuário antes de injetar em HTML.
- Evite permitir HTML arbitrário nos placeholders; use apenas texto e imagens controladas.
- Teste impressão em diferentes navegadores e confirme que o `printBackground` funciona no fluxo escolhido.
- Use fontes incorporadas ou garanta que as fontes estejam disponíveis no ambiente de render (especialmente para geração de PDF em servidores).

---

## Checklist rápido antes de gerar PDF/Impressão

- [ ] Template em A4 correto e com qualidade adequada.
- [ ] Plano de fundo presente como `<img>` para compatibilidade de impressão.
- [ ] Coordenadas dos placeholders medidas em `mm` e aplicadas como `style` inline.
- [ ] Dados preenchidos e escapados (server/client).
- [ ] Teste local de `print()` e geração via Puppeteer/wkhtmltopdf.

---

## Exemplo completo mínimo

- templates/gabarito-template.html — template com `{{KEY}}`
- public/assets/css/gabarito.css — estilos do exemplo acima
- scripts/gabarito-fill.php — faz `strtr()` e gera o HTML preenchido
- scripts/gabarito-to-pdf.js — Puppeteer para converter em PDF

---

Se quiser, eu posso:
- Gerar um exemplo pronto (template + CSS + script PHP ou Node) adaptado ao seu projeto atual.
- Adaptar o fluxo para Twig, Blade, React ou outro stack que você use.

---

Fim do guia.
