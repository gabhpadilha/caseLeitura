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
3. `images.ts` acha as imagens de cada página (pela lista de operações do pdf.js),
   descarta ornamentos pequenos e fundos de página inteira e recorta as ilustrações
   em WebP (JPEG no Safari). No texto, cada uma vira um bloco `![LxA](p12-1.webp)`
   na altura em que aparece; uma figura no meio de uma frase espera o fim do parágrafo.
4. `ocr.ts`: página sem texto e com uma imagem grande é escaneada. Ela é lida com
   Tesseract (WebAssembly, no próprio aparelho, modelo `por` baixado do CDN na
   primeira vez) e as linhas reconhecidas seguem pelo mesmo pipeline. Se o OCR
   quase não acha palavras, a página era uma ilustração inteira e vira imagem.
5. `upload.ts` envia `original.pdf`, `content.txt`, `cover.webp` (gerada a partir da
   1ª página, se o usuário não mandar uma) e `images/*` para
   `books/{user_id}/{book_id}/` e só então grava a linha em `books`.

Só fica com `processing_status = 'failed'` o PDF em que nem o OCR acha texto. Livros
enviados antes ganham ilustrações e OCR pelo botão "Reprocessar texto".

## Quadrinhos

`/quadrinhos` é a banca: página só dos gibis, com identidade própria de revistaria
(fontes Bangers e Comic Neue, cores `hq-*` em `globals.css`). Quadrinhos ficam na mesma
tabela `books`, com `kind = 'comic'` (migration `20261030000000_comics.sql`).

- **Envio** (`lib/comics/upload.ts`): não há extração de texto. PDF → cada página
  renderizada em WebP/JPEG (1600 px); CBZ → as imagens do zip na ordem natural dos nomes,
  sem recompressão, com título/autor do `ComicInfo.xml`. As páginas vão para
  `books/{user_id}/{book_id}/pages/0001.webp…`.
- **Leitor** (`components/comics/ComicReader.tsx`): página inteira sobre fundo escuro;
  deitado, duas páginas lado a lado (capa sozinha). Toque nas laterais ou deslize para
  virar, toque duplo no centro para zoom, faixa de miniaturas.
- **Filtros** (`lib/comics/filters.ts`): Original, Papel, Sépia e Noite, com intensidade.
  Ficam salvos no aparelho (localStorage).

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

## Cadastro e e-mails

- **Cadastro** com nome, e-mail e senha. O nome vai nos metadados do usuário e o
  gatilho do banco grava em `profiles.display_name` (a saudação "Boa leitura, …").
- **Confirmação por e-mail**: o link volta para `/auth/confirm`, que valida o token
  e já entra na conta. Links inválidos ou expirados caem em `/login?erro=link`.
- **E-mail com a identidade visual**: [supabase/templates/confirm-signup.html](supabase/templates/confirm-signup.html).
  No Supabase, em **Authentication → Emails → Templates → Confirm signup**:
  - Assunto: `Confirme seu e-mail para abrir sua estante · caseLeitura`
  - Corpo: cole o HTML do arquivo.
  O link usa a **Site URL** (Authentication → URL Configuration), que precisa ser o
  domínio publicado.
- **Login com Google** (opcional): crie um OAuth Client do tipo *Web application* no
  Google Cloud com o redirect `https://<ref>.supabase.co/auth/v1/callback`, ative o
  provedor em **Authentication → Providers → Google** com o Client ID/Secret e
  cadastre `NEXT_PUBLIC_AUTH_GOOGLE=on` na Vercel (novo deploy). O retorno passa por
  `/auth/callback`.
- **Remetente próprio** (recomendado): o servidor de e-mail padrão do Supabase envia
  poucos e-mails por hora e com remetente genérico. Configure um SMTP (ex.: Resend)
  em **Authentication → Emails → SMTP Settings** para enviar como caseLeitura.

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
