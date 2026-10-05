import { describe, expect, it } from "vitest";

import { anonClient, hasSupabaseEnv } from "./helpers";

// Exigem `npm run db:seed-cities` já executado no projeto Supabase.
describe.skipIf(!hasSupabaseEnv)("busca de cidades (search_cities)", () => {
  const search = async (q: string) => {
    const { data, error } = await anonClient().rpc("search_cities", { q });
    expect(error).toBeNull();
    return data ?? [];
  };

  it('"campinas" retorna Campinas, SP com fuso America/Sao_Paulo', async () => {
    const [first] = await search("campinas");
    expect(first).toMatchObject({
      name: "Campinas",
      state_or_country: "SP",
      timezone: "America/Sao_Paulo",
    });
  });

  it("ignora acentos e maiúsculas", async () => {
    const [first] = await search("SAO PAULO");
    expect(first).toMatchObject({ name: "São Paulo", state_or_country: "SP" });
    const [outro] = await search("brasília");
    expect(outro).toMatchObject({ name: "Brasília", state_or_country: "DF" });
  });

  it("só busca a partir de 2 letras", async () => {
    expect(await search("c")).toEqual([]);
    expect(await search("  ")).toEqual([]);
    expect((await search("ca")).length).toBeGreaterThan(0);
  });

  it("encontra cidades de fora do Brasil, com o país por extenso", async () => {
    const [first] = await search("lisbon");
    expect(first).toMatchObject({
      name: "Lisbon",
      state_or_country: "Portugal",
      timezone: "Europe/Lisbon",
    });
  });

  it("encontra cidades de fora pelo nome em português", async () => {
    const [lisboa] = await search("lisboa");
    expect(lisboa).toMatchObject({
      name: "Lisbon",
      state_or_country: "Portugal",
    });
    const [londres] = await search("Londres");
    expect(londres).toMatchObject({
      name: "London",
      state_or_country: "Reino Unido",
    });
  });

  it("nome principal vem antes de nome alternativo", async () => {
    const results = await search("sao");
    expect(results[0].name).toMatch(/^S[aã]o /);
  });

  it("trata % e _ como texto comum", async () => {
    expect(await search("%%")).toEqual([]);
    expect(await search("__")).toEqual([]);
  });

  it("devolve no máximo o limite pedido", async () => {
    const { data } = await anonClient().rpc("search_cities", {
      q: "sa",
      max_results: 3,
    });
    expect(data!.length).toBeLessThanOrEqual(3);
  });

  it("a tabela traz todos os municípios do IBGE (5.570 ou mais)", async () => {
    const { count } = await anonClient()
      .from("cities")
      .select("*", { count: "exact", head: true })
      .eq("source", "ibge");
    expect(count).toBeGreaterThanOrEqual(5570);
  });
});
