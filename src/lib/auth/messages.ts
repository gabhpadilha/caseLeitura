/** Erros do Supabase Auth (em inglês) → mensagens em pt-BR que dizem o que fazer. */
const RULES: [RegExp, string][] = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada."],
  [/user already registered|already been registered/i, "Já existe uma conta com este e-mail. Tente entrar."],
  [/password should be at least|password.*(short|characters)/i, "A senha precisa ter pelo menos 6 caracteres."],
  [/weak password|pwned|known to be weak/i, "Essa senha é fácil de adivinhar. Escolha outra."],
  [/unable to validate email|invalid email|email address .* is invalid/i, "Esse e-mail não parece válido."],
  [/rate limit|too many requests|security purposes/i, "Muitas tentativas seguidas. Espere alguns minutos e tente de novo."],
  [/provider is not enabled|unsupported provider/i, "O login com Google ainda não foi ativado."],
  [/signups not allowed|signup is disabled/i, "Novos cadastros estão desativados no momento."],
  [/failed to fetch|network/i, "Sem conexão com o servidor. Verifique sua internet."],
];

export function authErrorMessage(message: string | undefined): string {
  if (!message) return "Algo deu errado. Tente de novo.";
  return RULES.find(([pattern]) => pattern.test(message))?.[1] ?? "Algo deu errado. Tente de novo.";
}

export function isEmailNotConfirmed(message: string | undefined): boolean {
  return Boolean(message && /email not confirmed/i.test(message));
}

/** Avisos vindos das rotas /auth/* via ?erro=… */
export const AUTH_NOTICE: Record<string, string> = {
  link: "Esse link de confirmação expirou ou já foi usado. Entre com seu e-mail e senha, ou peça um novo link.",
  google: "Não foi possível entrar com o Google. Tente de novo.",
};

/** Avisos positivos vindos das rotas /auth/* via ?aviso=… */
export const AUTH_SUCCESS: Record<string, string> = {
  confirmado: "E-mail confirmado! Agora é só entrar com seu e-mail e senha.",
};
