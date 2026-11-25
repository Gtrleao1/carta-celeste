import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino dos links enviados por e-mail (confirmação de cadastro e
 * recuperação de senha). Troca o código por uma sessão e segue para `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  // Sem destino no link (por exemplo, se o Supabase descartar o parâmetro), quem
  // acabou de confirmar o e-mail segue para a compra, nunca para a área da conta:
  // não pode haver quebra no meio do fluxo de pagamento.
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.has("next")
    ? safeNextPath(searchParams.get("next"))
    : type === "recovery"
      ? "/redefinir-senha"
      : "/comprar?confirmar=1";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/entrar?erro=link`);
}
