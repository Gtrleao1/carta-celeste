import { parseCspReports } from "@/lib/security/csp-report";

const MAX_BYTES = 16_384;
// Teto de linhas de log por instância e por minuto: um bot não consegue
// inundar o log nem gastar o banco (esta rota não usa o banco).
const MAX_LOGS_PER_MINUTE = 30;
let windowStart = 0;
let logged = 0;

function mayLog(now: number) {
  if (now - windowStart > 60_000) {
    windowStart = now;
    logged = 0;
  }
  return logged++ < MAX_LOGS_PER_MINUTE;
}

/**
 * Recebe os relatórios do CSP em modo de relatório (`report-uri`). Só registra
 * no log da Vercel, sem dado pessoal (ver `parseCspReports`). Responde sempre
 * 204, sem corpo, para não dar pista a quem sonda a rota.
 */
export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return new Response(null, { status: 204 });

  try {
    const text = await request.text();
    if (text.length > MAX_BYTES) return new Response(null, { status: 204 });
    for (const v of parseCspReports(JSON.parse(text))) {
      if (!mayLog(Date.now())) break;
      console.warn(
        `[csp] diretiva=${v.directive} bloqueado=${v.blocked} pagina=${v.page}`,
      );
    }
  } catch {
    // Corpo inválido: ignora.
  }
  return new Response(null, { status: 204 });
}
