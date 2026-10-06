"use client";

import { useCallback, useState } from "react";

import type { SavedBirthProfile } from "@/app/(site)/comprar/[slug]/actions";
import { BirthProfileForm } from "@/components/checkout/birth-profile-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatBirthSummary } from "@/lib/birth/summary";
import { formatBRL } from "@/lib/format";

type Props = {
  product: {
    slug: string;
    name: string;
    price_cents: number;
    age_restricted: boolean;
  };
  profiles: SavedBirthProfile[];
  buyerBirthDate: string | null;
};

const summaryOf = (p: SavedBirthProfile) =>
  formatBirthSummary({
    birthDate: p.birth_date,
    birthTime: p.time_unknown ? null : (p.birth_time?.slice(0, 5) ?? null),
    timezone: p.timezone,
    cityName: p.city_name,
  });

/**
 * Compra em até 3 telas: 1) dados de nascimento, 2) confirmação (e 18+),
 * 3) pagamento no Mercado Pago.
 */
export function CheckoutFlow({
  product,
  profiles: initial,
  buyerBirthDate,
}: Props) {
  const [profiles, setProfiles] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial[0]?.id ?? null,
  );
  const [creating, setCreating] = useState(initial.length === 0);
  const [step, setStep] = useState<"profile" | "confirm">("profile");

  const [ageDeclared, setAgeDeclared] = useState(false);
  const [buyerDate, setBuyerDate] = useState(buyerBirthDate ?? "");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  const handleCreated = useCallback((profile: SavedBirthProfile) => {
    setProfiles((list) =>
      list.some((p) => p.id === profile.id) ? list : [profile, ...list],
    );
    setSelectedId(profile.id);
    setCreating(false);
    setStep("confirm");
  }, []);

  async function pay() {
    if (!selected) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug: product.slug,
          birthProfileId: selected.id,
          ...(product.age_restricted && {
            ageDeclared,
            buyerBirthDate: buyerDate,
          }),
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Não foi possível iniciar o pagamento.");
        setPaying(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Sem conexão com o servidor. Tente de novo.");
      setPaying(false);
    }
  }

  const stepLabel = step === "profile" ? "1 de 3" : "2 de 3";

  return (
    <div className="grid gap-6">
      <p className="text-muted-foreground text-sm" aria-live="polite">
        Etapa {stepLabel}:{" "}
        {step === "profile" ? "dados de nascimento" : "confirmação"}
      </p>

      {step === "profile" && (
        <section aria-labelledby="titulo-perfil" className="grid gap-5">
          <h2 id="titulo-perfil" className="text-3xl font-semibold">
            Quando e onde você nasceu?
          </h2>

          {profiles.length > 0 && !creating && (
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-base font-medium">
                Usar dados já salvos
              </legend>
              {profiles.map((p) => (
                <label
                  key={p.id}
                  className="bg-card border-border has-[:checked]:border-primary flex cursor-pointer items-start gap-3 rounded-xl border p-4"
                >
                  <input
                    type="radio"
                    name="perfil"
                    value={p.id}
                    checked={selectedId === p.id}
                    onChange={() => setSelectedId(p.id)}
                    className="mt-1 size-5 shrink-0 accent-current"
                  />
                  <span className="grid gap-0.5">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground text-sm">
                      {summaryOf(p)}
                    </span>
                  </span>
                </label>
              ))}
              <div className="flex flex-wrap gap-3 pt-1">
                <Button
                  type="button"
                  size="lg"
                  className="h-12 text-base"
                  disabled={!selected}
                  onClick={() => setStep("confirm")}
                >
                  Continuar
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="h-12 text-base"
                  onClick={() => setCreating(true)}
                >
                  Usar outros dados
                </Button>
              </div>
            </fieldset>
          )}

          {creating && (
            <div className="grid gap-4">
              <BirthProfileForm onCreated={handleCreated} />
              {profiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="text-muted-foreground hover:text-foreground w-fit text-sm underline underline-offset-4"
                >
                  Voltar para os dados salvos
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {step === "confirm" && selected && (
        <section aria-labelledby="titulo-confirma" className="grid gap-5">
          <h2 id="titulo-confirma" className="text-3xl font-semibold">
            Confira os dados
          </h2>

          <div className="bg-card border-border grid gap-1 rounded-xl border p-5">
            <p className="text-muted-foreground text-sm">{selected.name}</p>
            <p className="text-xl leading-snug">{summaryOf(selected)}</p>
          </div>

          {selected.time_unknown && (
            <Alert>
              <AlertDescription>
                Você não informou a hora de nascimento. Por isso o Ascendente, o
                Meio do Céu e as casas não serão calculados, e o relatório será
                mais curto.
              </AlertDescription>
            </Alert>
          )}

          {product.age_restricted && (
            <fieldset className="border-border grid gap-4 rounded-xl border p-5">
              <legend className="px-1 font-medium">Confirmação de idade</legend>
              <p className="text-muted-foreground text-sm">
                Este mapa é exclusivo para maiores de 18 anos.
              </p>
              <label className="flex items-start gap-3 text-base">
                <input
                  type="checkbox"
                  checked={ageDeclared}
                  onChange={(e) => setAgeDeclared(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-current"
                />
                Declaro ter 18 anos ou mais
              </label>
              <BuyerDate value={buyerDate} onChange={setBuyerDate} />
            </fieldset>
          )}

          <div className="bg-card border-border flex items-center justify-between gap-4 rounded-xl border p-5">
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-muted-foreground text-sm">
                Pix, boleto ou cartão em até 12x, pelo Mercado Pago.
              </p>
            </div>
            <p className="font-heading text-primary text-3xl font-semibold">
              {formatBRL(product.price_cents)}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="h-12 text-base"
              disabled={
                paying ||
                (product.age_restricted && (!ageDeclared || !buyerDate))
              }
              onClick={pay}
            >
              {paying ? "Abrindo o pagamento…" : "Ir para o pagamento"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 text-base"
              disabled={paying}
              onClick={() => setStep("profile")}
            >
              Alterar dados
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Você será levado ao ambiente seguro do Mercado Pago. Não guardamos
            os dados do seu cartão.
          </p>
        </section>
      )}
    </div>
  );
}

/** Campo de data controlado pelo componente pai (a data do comprador). */
function BuyerDate({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor="buyer-birth-date" className="text-sm font-medium">
        Sua data de nascimento
      </label>
      <input
        id="buyer-birth-date"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-background h-11 rounded-lg border px-3 text-base"
      />
    </div>
  );
}
