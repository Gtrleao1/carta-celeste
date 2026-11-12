/**
 * Envio de imagens do blog a partir do navegador. Fotos de celular passam de
 * 5 MB, e a Vercel só aceita 4,5 MB por requisição: por isso a imagem é
 * reduzida (até 1600 px de largura) e convertida para WebP antes de subir.
 */

const MAX_WIDTH = 1600;
const MAX_BYTES = 4 * 1024 * 1024;

export type UploadedImage = {
  url: string;
  width: number | null;
  height: number | null;
};

async function shrink(
  file: File,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    return blob ? { blob, width, height } : null;
  } catch {
    return null;
  }
}

/** Sobe a imagem e devolve o endereço público (e o tamanho, quando conhecido). */
export async function uploadBlogImage(file: File): Promise<UploadedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem.");
  }

  // GIF animado não passa pelo canvas (perderia a animação): sobe como está.
  const small = file.type === "image/gif" ? null : await shrink(file);
  const body = small?.blob ?? file;
  if (body.size > MAX_BYTES) {
    throw new Error("A imagem é grande demais. Use uma de até 4 MB.");
  }

  const form = new FormData();
  form.append("file", body, small ? "imagem.webp" : file.name);
  const res = await fetch("/api/admin/blog/imagem", {
    method: "POST",
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Não foi possível enviar a imagem.");
  }
  return {
    url: data.url,
    width: small?.width ?? null,
    height: small?.height ?? null,
  };
}
