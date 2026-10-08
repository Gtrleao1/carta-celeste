"use client";

import { useActionState, useState } from "react";

import { saveProduct } from "@/app/admin/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import {
  SectionsEditor,
  type EditableSection,
} from "@/components/admin/sections-editor";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/auth/form-state";

export type ProductFormValues = {
  id?: string;
  slug: string;
  name: string;
  short_description: string;
  long_description: string;
  price: string;
  active: boolean;
  age_restricted: boolean;
  sort_order: number;
  ai_instructions: string;
  focus_points: string[];
  sample_excerpt: string;
  sections: EditableSection[];
};

export const EMPTY_PRODUCT: ProductFormValues = {
  slug: "",
  name: "",
  short_description: "",
  long_description: "",
  price: "",
  active: false,
  age_restricted: false,
  sort_order: 100,
  ai_instructions: "",
  focus_points: [],
  sample_excerpt: "",
  sections: [{ key: "", title: "", instructions: "" }],
};

/** Textarea controlada (o React 19 reseta o formulário depois da ação). */
function TextAreaField({
  name,
  label,
  state,
  defaultValue,
  hint,
  rows = 4,
  maxLength,
}: {
  name: string;
  label: string;
  state: FormState;
  defaultValue: string;
  hint?: string;
  rows?: number;
  maxLength?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const errors = state.fieldErrors?.[name];
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        name={name}
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={errors ? true : undefined}
        aria-describedby={hint ? `${name}-hint` : undefined}
      />
      {hint && (
        <p id={`${name}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {errors && <p className="text-destructive text-sm">{errors.join(" ")}</p>}
    </div>
  );
}

function Check({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="accent-primary mt-0.5 size-5"
      />
      <span className="grid gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </span>
    </label>
  );
}

export function ProductForm({ initial }: { initial: ProductFormValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveProduct, {});

  return (
    <form action={action} className="grid gap-6" noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4">
        <Field
          name="name"
          label="Nome"
          defaultValue={initial.name}
          state={state}
        />
        <Field
          name="slug"
          label="Endereço (slug)"
          defaultValue={initial.slug}
          hint="Aparece na URL: /mapa/seu-endereco. Só letras minúsculas, números e hífens."
          autoCapitalize="none"
          state={state}
        />
        <Field
          name="short_description"
          label="Descrição curta"
          defaultValue={initial.short_description}
          hint="Aparece no cartão da vitrine."
          state={state}
        />
        <TextAreaField
          name="long_description"
          label="Descrição longa"
          defaultValue={initial.long_description}
          hint="Aparece na página do produto."
          rows={6}
          maxLength={5000}
          state={state}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="price"
            label="Preço (R$)"
            defaultValue={initial.price}
            inputMode="decimal"
            hint="Ex.: 49,90. Entre R$ 1,00 e R$ 9.999,99."
            state={state}
          />
          <Field
            name="sort_order"
            label="Ordem na vitrine"
            type="number"
            min={0}
            defaultValue={String(initial.sort_order)}
            hint="Menor número aparece primeiro."
            state={state}
          />
        </div>
      </div>

      <div className="grid gap-4">
        <Check
          name="active"
          label="Ativo (aparece na vitrine e pode ser comprado)"
          defaultChecked={initial.active}
        />
        <Check
          name="age_restricted"
          label="Somente para maiores de 18 anos"
          hint="Exige a confirmação de idade antes do pagamento."
          defaultChecked={initial.age_restricted}
        />
      </div>

      <TextAreaField
        name="focus_points"
        label="Pontos de foco (um por linha)"
        defaultValue={initial.focus_points.join("\n")}
        hint="Aparecem como marcadores na página do produto, ex.: Meio do Céu."
        rows={5}
        state={state}
      />
      <TextAreaField
        name="sample_excerpt"
        label="Trecho de exemplo (opcional)"
        defaultValue={initial.sample_excerpt}
        hint="Texto de amostra da página do produto. Aceita ### título e - listas."
        rows={6}
        maxLength={3000}
        state={state}
      />
      <TextAreaField
        name="ai_instructions"
        label="Instruções gerais para a IA"
        defaultValue={initial.ai_instructions}
        hint="Tom e foco do produto inteiro. Ficam só no servidor: o cliente nunca vê."
        rows={8}
        maxLength={6000}
        state={state}
      />

      <SectionsEditor
        initial={initial.sections}
        error={state.fieldErrors?.sections?.join(" ")}
      />

      <FormMessage state={state} />
      <div className="bg-background/95 sticky bottom-0 -mx-4 px-4 py-3">
        <SubmitButton pendingText="Salvando…">
          {initial.id ? "Salvar alterações" : "Criar produto"}
        </SubmitButton>
      </div>
    </form>
  );
}
