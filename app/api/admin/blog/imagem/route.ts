import { randomUUID } from "node:crypto";

import { tooManyRequests, withinRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// O corpo de uma função na Vercel vai até 4,5 MB: o editor reduz a foto antes
// de enviar, e aqui o limite é um pouco abaixo disso.
const MAX_BYTES = 4 * 1024 * 1024;

type Kind = { ext: "jpg" | "png" | "webp" | "gif"; type: string };

/** Descobre o tipo pelos primeiros bytes (não confia no nome nem no `type` enviado). */
function sniff(b: Uint8Array): Kind | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return { ext: "png", type: "image/png" };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
    return { ext: "gif", type: "image/gif" };
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return { ext: "webp", type: "image/webp" };
  return null;
}

/**
 * Envia uma imagem do blog para o Storage público. Só admin; só jpg, png, webp
 * ou gif de verdade (conferido pelo conteúdo); até 4 MB.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Origem não permitida." }, 403);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Entre na sua conta." }, 401);
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return json({ error: "Sem permissão." }, 403);

  const admin = createAdminClient();
  if (!(await withinRateLimit(admin, `blog-imagem:${user.id}`, 30, 60))) {
    return tooManyRequests(60);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return json({ error: "Escolha uma imagem." }, 400);
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return json({ error: "A imagem precisa ter até 4 MB." }, 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) {
    return json({ error: "Use uma imagem JPG, PNG, WebP ou GIF." }, 415);
  }

  const path = `posts/${randomUUID()}.${kind.ext}`;
  const { error } = await admin.storage.from("blog").upload(path, bytes, {
    contentType: kind.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[blog] erro ao enviar a imagem:", error.message);
    return json({ error: "Não foi possível enviar a imagem agora." }, 502);
  }

  const { data } = admin.storage.from("blog").getPublicUrl(path);
  return json({ url: data.publicUrl });
}
