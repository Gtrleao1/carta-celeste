"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { savePost } from "@/app/admin/blog/actions";
import { RichEditor } from "@/components/admin/rich-editor";
import { FormMessage } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/auth/form-state";
import { slugify, type Doc } from "@/lib/blog/content";
import { uploadBlogImage } from "@/lib/blog/upload-image";

export type PostFormValues = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_url: string;
  cover_alt: string;
  content: Doc;
  status: "draft" | "published";
};

export const EMPTY_POST: PostFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  cover_url: "",
  cover_alt: "",
  content: { type: "doc", content: [] },
  status: "draft",
};

/**
 * `draft` = salvar sem mudar a situação do post (rascunho continua rascunho,
 * publicado continua publicado); `publish` publica; `unpublish` tira do ar.
 */
function IntentButton({
  intent,
  children,
  variant,
  pendingText = "Salvando…",
}: {
  intent: "draft" | "publish" | "unpublish";
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="intent"
      value={intent}
      variant={variant}
      size="lg"
      disabled={pending}
      className="h-11 px-5 text-base"
    >
      {pending ? pendingText : children}
    </Button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? (
    <p className="text-destructive text-sm">{errors.join(" ")}</p>
  ) : null;
}

export function PostForm({ initial }: { initial: PostFormValues }) {
  const [state, action] = useActionState<FormState, FormData>(savePost, {});
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  // Post novo: o endereço acompanha o título até a pessoa editá-lo à mão.
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [coverUrl, setCoverUrl] = useState(initial.cover_url);
  const [coverAlt, setCoverAlt] = useState(initial.cover_alt);
  const [doc, setDoc] = useState<Doc>(initial.content);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const errors = state.fieldErrors ?? {};
  const published = initial.status === "published";

  async function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverBusy(true);
    setCoverError(null);
    try {
      const img = await uploadBlogImage(file);
      setCoverUrl(img.url);
    } catch (err) {
      setCoverError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar a imagem.",
      );
    } finally {
      setCoverBusy(false);
    }
  }

  return (
    <form action={action} className="grid gap-6" noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="content" value={JSON.stringify(doc)} />
      <input type="hidden" name="cover_url" value={coverUrl} />

      <div className="grid gap-1.5">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          value={title}
          maxLength={200}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          aria-invalid={errors.title ? true : undefined}
          className="h-12 text-xl"
        />
        <FieldError errors={errors.title} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="slug">Endereço do post</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          maxLength={120}
          autoCapitalize="none"
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          aria-invalid={errors.slug ? true : undefined}
          aria-describedby="slug-hint"
          className="h-11 text-base"
        />
        <p id="slug-hint" className="text-muted-foreground text-xs">
          Aparece na URL: /blog/{slugify(slug) || "endereco-do-post"}. É montado
          a partir do título; só mude se quiser.
        </p>
        <FieldError errors={errors.slug} />
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">Imagem de capa</legend>
        {coverUrl ? (
          <div className="grid gap-3 sm:grid-cols-[240px_1fr] sm:items-start">
            <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden rounded-lg">
              <Image
                src={coverUrl}
                alt=""
                fill
                sizes="240px"
                className="object-cover"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cover_alt">Descrição da imagem</Label>
              <Input
                id="cover_alt"
                name="cover_alt"
                value={coverAlt}
                maxLength={300}
                onChange={(e) => setCoverAlt(e.target.value)}
                className="h-11 text-base"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={coverBusy}
                  onClick={() => coverRef.current?.click()}
                >
                  {coverBusy ? "Enviando…" : "Trocar imagem"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCoverUrl("");
                    setCoverAlt("");
                  }}
                >
                  Remover
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-fit"
              disabled={coverBusy}
              onClick={() => coverRef.current?.click()}
            >
              {coverBusy ? "Enviando…" : "Escolher imagem de capa"}
            </Button>
            <p className="text-muted-foreground text-xs">
              Aparece na lista do blog e no topo do post. Formato horizontal
              (16:9) fica melhor. JPG, PNG ou WebP.
            </p>
            {/* Sem imagem, a descrição não existe; o campo vazio mantém o formulário completo. */}
            <input type="hidden" name="cover_alt" value="" />
          </div>
        )}
        <input
          ref={coverRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onPickCover}
        />
        {coverError && <p className="text-destructive text-sm">{coverError}</p>}
        <FieldError errors={errors.cover_url} />
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor="excerpt">Resumo</Label>
        <Textarea
          id="excerpt"
          name="excerpt"
          value={excerpt}
          rows={3}
          maxLength={400}
          onChange={(e) => setExcerpt(e.target.value)}
          aria-describedby="excerpt-hint"
        />
        <p id="excerpt-hint" className="text-muted-foreground text-xs">
          Aparece na lista do blog e no Google. Se deixar vazio, usamos o começo
          do texto.
        </p>
        <FieldError errors={errors.excerpt} />
      </div>

      <div className="grid gap-1.5">
        <span className="text-sm font-medium">Texto</span>
        <RichEditor
          initial={initial.content}
          onChange={setDoc}
          invalid={Boolean(errors.content)}
        />
        <FieldError errors={errors.content} />
      </div>

      <FormMessage state={state} />

      <div className="bg-background/95 sticky bottom-0 -mx-4 flex flex-wrap gap-3 border-t px-4 py-3">
        {published ? (
          <>
            <IntentButton intent="draft">Salvar alterações</IntentButton>
            <IntentButton
              intent="unpublish"
              variant="outline"
              pendingText="Tirando do ar…"
            >
              Tirar do ar
            </IntentButton>
          </>
        ) : (
          <>
            <IntentButton intent="publish" pendingText="Publicando…">
              Publicar
            </IntentButton>
            <IntentButton intent="draft" variant="outline">
              Salvar rascunho
            </IntentButton>
          </>
        )}
      </div>
    </form>
  );
}
