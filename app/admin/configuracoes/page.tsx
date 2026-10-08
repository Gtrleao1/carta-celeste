import { HouseSystemForm } from "@/components/admin/house-system-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const { data } = await createAdminClient()
    .from("settings")
    .select("value")
    .eq("key", "default_house_system")
    .maybeSingle();
  const current = ["placidus", "equal", "whole"].includes(data?.value as string)
    ? (data!.value as string)
    : "placidus";

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sistema de casas padrão</CardTitle>
          <CardDescription>
            Usado nos próximos relatórios. Em latitudes extremas (≥ 66°) o
            Placidus não existe e o cálculo usa casas inteiras, com o motivo
            registrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HouseSystemForm current={current} />
        </CardContent>
      </Card>
    </>
  );
}
