# caseLeitura

A casa dos seus livros: lidos, lendo e por ler. Galeria e leitor de PDFs que
extrai o texto, remove quebras de linha, hifenizações e cabeçalhos do layout e
exibe tudo num leitor paginado com nove temas, ajuste de fonte e alinhamento,
além de um diário de leituras com notas e resenhas.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 ·
Supabase (Postgres, Auth, Storage) · pdf.js · Lucide.

## Configuração

1. **Node 22+** (o `@supabase/supabase-js` já avisa que o Node 20 está obsoleto).
2. Crie um projeto no [Supabase](https://supabase.com/dashboard).
3. Rode as migrações de `supabase/migrations/`, em ordem:
   - `20261027000000_init.sql` — tabelas, RLS, trigger de cadastro, bucket
   - `20261028000000_reader_themes.sql` — os nove temas do leitor

   Pelo SQL Editor do dashboard (cole e execute cada uma) **ou** pela CLI:
   `npx supabase link --project-ref <ref>` e depois `npx supabase db push`.
4. `cp .env.example .env.local` e preencha a URL e a publishable key.
5. `npm install` e depois `npm run dev`.
6. (Opcional, depois de linkar) Regenere os tipos do banco:
   `npx supabase gen types typescript --linked > src/types/database.ts`

## Estrutura

```
supabase/migrations/        SQL: tabelas, enums, RLS, trigger de cadastro, bucket, temas
scripts/generate-icons.mjs  ícones do app instalável a partir do símbolo
src/
  proxy.ts                  renova a sessão e redireciona para /login (antigo middleware)
  app/
    layout.tsx              raiz (pt-BR, fontes do design system)
    manifest.ts             PWA: nome, cores e ícones
    login/                  entrar / criar conta
    (biblioteca)/           grupo com trilho lateral, busca e "Enviar PDF"
      page.tsx              início: destaque, filtros e prateleiras
      estante/[shelf]/      prateleiras: lendo, quero-ler, lidos (diário), abandonados
      livros/[bookId]/      página do livro: status, nota, resenha, apagar
      livros/novo/          upload de PDF
    leitor/[bookId]/        leitor paginado em tela cheia (fora do grupo)
  components/
    brand/                  LogoMark, Wordmark
    layout/                 AppNav, SearchBar, HeaderUser
    gallery/                BookCover, Shelf, ShelfChips, ContinueReading, ReadDiary
    book/                   BookDetailView, ReviewCard, StatusPicker, DeleteBookButton
    reader/                 Reader, ReaderToolbar, ReaderSettingsPanel, use-pagination
    upload/, auth/          UploadBookForm, LoginForm
  lib/
    supabase/               client.ts (browser), server.ts (RSC), proxy.ts, env.ts
    pdf/                    extract.ts (pdf.js, browser), structure.ts e clean-text.ts (puros)
    books/                  queries.ts (server-only), upload/delete (browser), format, shelves
    reader/                 styles.ts (temas → classes Tailwind), blocks.ts
  types/                    database.ts (schema), book.ts, reader.ts
```

## Pipeline do PDF

O texto é extraído **no navegador**, antes do upload:

1. `extract.ts` lê os fragmentos posicionados do pdf.js, remonta as linhas e marca
   espaçamentos verticais grandes como possíveis parágrafos.
2. `clean-text.ts` normaliza caracteres (ligaduras, soft hyphens), remove
   cabeçalhos/rodapés repetidos e números de página, decide onde há parágrafo real
   e, via regex, desfaz hifenização (`pala-\nvra` → `palavra`, mas `bem-\n-vindo` →
   `bem-vindo`) e quebras de linha visuais.
3. `upload.ts` envia `original.pdf`, `content.txt` e `cover.webp` (gerada a partir da
   1ª página, se o usuário não mandar uma) para `books/{user_id}/{book_id}/` e só
   então grava a linha em `books`.

PDFs escaneados (sem camada de texto) ficam com `processing_status = 'failed'`:
precisariam de OCR, que fica para uma etapa futura no servidor.

## Leitor paginado

A paginação é calculada **por tela**, não pelas páginas do PDF
(`src/components/reader/use-pagination.ts`): o texto flui em colunas CSS de altura
fixa e cada página é um deslocamento de uma largura de tela. As páginas se refazem
quando a fonte, o espaçamento ou o tamanho da tela mudam, e a posição é guardada
como fração do livro (`books.progress`), então ninguém perde o ponto onde parou.

- Uma página em retrato e duas lado a lado a partir de 900 px de largura.
- Linhas de até ~640 px (65–75 caracteres por linha).
- Toque nas bordas ou deslize para virar a página; toque no centro mostra/oculta a
  interface. No teclado: setas, Page Up/Down, espaço, Home/End.

## Instalar no tablet

O app tem manifest e ícones (`src/app/manifest.ts`), então abre em tela cheia como
um aplicativo:

- **iPad (Safari):** Compartilhar → Adicionar à Tela de Início.
- **Android (Chrome):** menu ⋮ → Instalar app.

Para redesenhar os ícones, edite e rode `node scripts/generate-icons.mjs`.

## Deploy (Vercel)

1. Suba o código para um repositório no GitHub.
2. Na [Vercel](https://vercel.com/new), importe o repositório (o framework Next.js é
   detectado sozinho) e cadastre as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Depois do primeiro deploy, no Supabase em **Authentication → URL Configuration**:
   - **Site URL**: o domínio da Vercel (ex.: `https://caseleitura.vercel.app`)
   - **Redirect URLs**: o mesmo domínio com `/**`
   Sem isso, links de confirmação de e-mail apontam para `localhost`.
4. A cada `git push` na branch principal a Vercel publica uma versão nova; branches
   e pull requests ganham uma URL de pré-visualização.

Nunca cadastre a chave `service_role` / `sb_secret_…` em variáveis `NEXT_PUBLIC_*`:
elas vão parar no navegador.
