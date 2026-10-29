/**
 * Destino seguro depois de confirmar/entrar: só caminhos internos ("/estante").
 * Bloqueia URLs absolutas e "//outro-site", que virariam um open redirect a
 * partir de um link nosso.
 */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
