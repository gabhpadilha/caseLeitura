// Apagar livro no browser: registro no banco primeiro, arquivos depois.
import { createClient } from "@/lib/supabase/client";
import { listFolder } from "@/lib/books/upload";
import { BOOKS_BUCKET, bookFolder, type Book } from "@/types/book";

/**
 * Remove o livro (resenha e anotações saem junto, pela FK com on delete cascade)
 * e depois os arquivos do Storage. Nessa ordem, uma falha no Storage deixa no
 * máximo arquivos órfãos invisíveis — nunca um livro na estante sem PDF.
 */
export async function deleteBook(
  book: Pick<Book, "id" | "pdf_path" | "cover_path" | "content_path">,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("books").delete().eq("id", book.id);
  if (error) throw new Error(`Não foi possível apagar o livro: ${error.message}`);

  const paths = [book.pdf_path, book.cover_path, book.content_path].filter(
    (p): p is string => Boolean(p),
  );
  // Melhor esforço: o livro já sumiu da estante.
  const bucket = supabase.storage.from(BOOKS_BUCKET);
  const images = await listFolder(bucket, `${bookFolder(book.pdf_path)}/images`);
  await bucket.remove([...paths, ...images]);
}
