import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";
import { deleteBirthProfile } from "@/app/conta/actions";
import { DeleteAccountForm } from "@/components/conta/delete-account-form";
import { ProfileForm } from "@/components/conta/profile-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateBR, formatTimeBR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/conta");

  const [{ data: profile }, { data: birthProfiles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, birth_date_of_buyer")
      .eq("id", user.id)
      .single(),
    supabase
      .from("birth_profiles")
      .select("id, name, birth_date, birth_time, time_unknown, city_name")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minha conta</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="lg">
            Sair
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            fullName={profile?.full_name ?? ""}
            birthDateOfBuyer={profile?.birth_date_of_buyer ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perfis de nascimento</CardTitle>
          <CardDescription>
            Dados salvos para reutilizar em novas compras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {birthProfiles && birthProfiles.length > 0 ? (
            <ul className="divide-y">
              {birthProfiles.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {formatDateBR(p.birth_date)},{" "}
                      {p.time_unknown || !p.birth_time
                        ? "hora desconhecida"
                        : formatTimeBR(p.birth_time)}
                      , {p.city_name}
                    </p>
                  </div>
                  <form action={deleteBirthProfile}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button
                      type="submit"
                      variant="destructive"
                      size="sm"
                      aria-label={`Apagar o perfil de ${p.name}`}
                    >
                      Apagar
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Você ainda não salvou nenhum perfil. Ele é criado quando você faz
              um pedido.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meus mapas</CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href="/meus-mapas"
            className="text-foreground underline underline-offset-4"
          >
            Ver meus mapas
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Excluir conta e dados</CardTitle>
          <CardDescription>
            Você pode apagar seus dados a qualquer momento (LGPD).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <details className="group">
            <summary className="text-destructive cursor-pointer text-sm font-medium underline underline-offset-4">
              Quero excluir minha conta
            </summary>
            <div className="mt-4">
              <DeleteAccountForm />
            </div>
          </details>
        </CardContent>
      </Card>
    </main>
  );
}
