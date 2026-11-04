// Copia as CMaps e as fontes padrão do pdf.js para public/pdfjs/ (servidas pelo app).
// Sem elas o pdf.js não decodifica fontes CID (comuns em livros diagramados no
// InDesign) nem fontes padrão não embutidas, e o texto extraído sai com
// caracteres trocados ou faltando. Roda no postinstall e antes do build (Vercel).
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const root = dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
const out = join(process.cwd(), "public", "pdfjs");
mkdirSync(out, { recursive: true });
for (const dir of ["cmaps", "standard_fonts"]) {
  const from = join(root, dir);
  if (existsSync(from)) cpSync(from, join(out, dir), { recursive: true });
}
console.log("pdf.js: CMaps e fontes padrão copiadas para public/pdfjs/");
