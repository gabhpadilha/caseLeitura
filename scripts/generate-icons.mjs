// Gera os ícones do app instalável (PWA) a partir do símbolo caseLeitura.
// Uso: node scripts/generate-icons.mjs   (o sharp já vem instalado com o Next)
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const TERRACOTA = "#D6604E";
const WHITE = "#FFFFFF";

// Mesmo desenho de src/components/brand/Logo.tsx (grade 48), em branco sobre terracota.
const glyph = `
  <path d="M8 19 24 7l16 12" stroke="${WHITE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M33 9.5V6h3.5v6.2" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round" fill="none"/>
  <path d="M24 21c-4-2.6-8.6-3.3-13-2.4v19.6c4.4-.9 9-.2 13 2.4 4-2.6 8.6-3.3 13-2.4V18.6c-4.4-.9-9-.2-13 2.4Z" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round" fill="none"/>
  <path d="M24 21v19.6" stroke="${WHITE}" stroke-width="3"/>
`;

// scale: fração da largura ocupada pelo símbolo (48 unidades → 512 px).
const svg = ({ radius, scale }) => {
  const s = (512 * scale) / 48;
  const offset = (512 - 48 * s) / 2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${TERRACOTA}"/>
  <g transform="translate(${offset} ${offset}) scale(${s})">${glyph}</g>
</svg>`;
};

const out = new URL("../public/icons/", import.meta.url);
await mkdir(out, { recursive: true });

const targets = [
  // "any": cantos arredondados próprios.
  { file: "icon-192.png", size: 192, radius: 112, scale: 0.72 },
  { file: "icon-512.png", size: 512, radius: 112, scale: 0.72 },
  // "maskable": fundo até a borda e desenho dentro da zona segura (80%).
  { file: "icon-maskable-512.png", size: 512, radius: 0, scale: 0.6 },
  // iPadOS aplica a própria máscara: fundo sólido até a borda. O Next serve
  // src/app/apple-icon.png como <link rel="apple-touch-icon">.
  { file: "../../src/app/apple-icon.png", size: 180, radius: 0, scale: 0.68 },
];

for (const { file, size, radius, scale } of targets) {
  await sharp(Buffer.from(svg({ radius, scale })))
    .resize(size, size)
    .png()
    .toFile(new URL(file, out).pathname);
  console.log("✓", file.replace("../../", ""));
}

await writeFile(new URL("../src/app/icon.svg", import.meta.url), svg({ radius: 112, scale: 0.78 }).trim());
console.log("✓ src/app/icon.svg (favicon)");
