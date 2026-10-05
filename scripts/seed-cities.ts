/**
 * Importa as cidades para a tabela `cities`:
 *  - os 5.570 municípios do IBGE (coordenadas da sede), com população estimada;
 *  - as cidades do mundo com mais de 15 mil habitantes (GeoNames cities15000),
 *    exceto as do Brasil, que já vêm do IBGE.
 * O fuso horário de todas é calculado por `tz-lookup`.
 *
 * Uso: npm run db:seed-cities
 * Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (.env.local).
 * É idempotente: rodar de novo atualiza as linhas existentes.
 */
import { createClient } from "@supabase/supabase-js";
import { unzipSync } from "fflate";
import tzLookup from "tz-lookup";

const IBGE_MUNICIPIOS =
  "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv";
const IBGE_ESTADOS =
  "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/estados.csv";
const IBGE_POPULACAO =
  "https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[all]";
const GEONAMES = "https://download.geonames.org/export/dump/cities15000.zip";

type CityRow = {
  source: "ibge" | "geonames";
  source_id: string;
  name: string;
  state_or_country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population: number | null;
  /** Nomes alternativos, cada um precedido de "|" (só GeoNames). */
  alternate_names?: string | null;
};

/** Junta os nomes alternativos como "|a|b|c", sem repetir o nome principal. */
function packAlternates(name: string, raw: string): string | null {
  const seen = new Set([name.toLowerCase()]);
  let out = "";
  for (const alt of raw.split(",")) {
    const n = alt.trim();
    if (!n || n.includes("|") || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    if (out.length + n.length + 1 > 3000) break;
    out += `|${n}`;
  }
  return out || null;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Leitor de CSV simples, com suporte a campos entre aspas. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = !quoted;
      } else if (c === "," && !quoted) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const header = split(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
}

function timezoneFor(lat: number, lng: number): string | null {
  try {
    return tzLookup(lat, lng);
  } catch {
    return null;
  }
}

async function loadIbgePopulation(): Promise<Map<string, number>> {
  const population = new Map<string, number>();
  try {
    const res = await fetch(IBGE_POPULACAO);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      resultados: {
        series: { localidade: { id: string }; serie: Record<string, string> }[];
      }[];
    }[];
    for (const s of json[0]?.resultados[0]?.series ?? []) {
      const value = Object.values(s.serie)[0];
      const n = Number(value);
      if (Number.isFinite(n)) population.set(s.localidade.id, n);
    }
  } catch (e) {
    console.warn(
      `Aviso: não foi possível obter a população do IBGE (${(e as Error).message}). Seguindo sem população.`,
    );
  }
  return population;
}

async function loadIbge(): Promise<CityRow[]> {
  const [municipios, estados, population] = await Promise.all([
    fetchBuffer(IBGE_MUNICIPIOS).then((b) => parseCsv(b.toString("utf8"))),
    fetchBuffer(IBGE_ESTADOS).then((b) => parseCsv(b.toString("utf8"))),
    loadIbgePopulation(),
  ]);
  const ufByCode = new Map(estados.map((e) => [e.codigo_uf, e.uf]));

  const rows: CityRow[] = [];
  for (const m of municipios) {
    const lat = Number(m.latitude);
    const lng = Number(m.longitude);
    const uf = ufByCode.get(m.codigo_uf);
    const timezone = timezoneFor(lat, lng);
    if (!uf || !timezone || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn(`Ignorado (dados inválidos): ${m.codigo_ibge} ${m.nome}`);
      continue;
    }
    rows.push({
      source: "ibge",
      source_id: m.codigo_ibge,
      name: m.nome,
      state_or_country: uf,
      country_code: "BR",
      latitude: lat,
      longitude: lng,
      timezone,
      population: population.get(m.codigo_ibge) ?? null,
    });
  }
  return rows;
}

async function loadGeonames(): Promise<CityRow[]> {
  const zip = unzipSync(new Uint8Array(await fetchBuffer(GEONAMES)));
  const file = zip["cities15000.txt"];
  if (!file)
    throw new Error("cities15000.txt não encontrado no zip do GeoNames.");

  const countries = new Intl.DisplayNames(["pt-BR"], { type: "region" });
  const rows: CityRow[] = [];
  for (const line of new TextDecoder().decode(file).split("\n")) {
    if (!line) continue;
    const f = line.split("\t");
    const countryCode = f[8];
    if (countryCode === "BR") continue; // o Brasil vem do IBGE
    const lat = Number(f[4]);
    const lng = Number(f[5]);
    const timezone = timezoneFor(lat, lng);
    if (!timezone) {
      console.warn(`Ignorado (fuso não encontrado): ${f[0]} ${f[1]}`);
      continue;
    }
    let country = countryCode;
    try {
      country = countries.of(countryCode) ?? countryCode;
    } catch {
      // código fora do padrão: mantém a sigla
    }
    rows.push({
      source: "geonames",
      source_id: f[0],
      name: f[1],
      state_or_country: country,
      country_code: countryCode,
      latitude: lat,
      longitude: lng,
      timezone,
      population: Number.isFinite(Number(f[14])) ? Number(f[14]) : null,
      alternate_names: packAlternates(f[1], f[3] ?? ""),
    });
  }
  return rows;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.",
    );
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Baixando municípios do IBGE…");
  const ibge = await loadIbge();
  console.log(`  ${ibge.length} municípios.`);

  console.log("Baixando cidades do GeoNames (cities15000)…");
  const world = await loadGeonames();
  console.log(`  ${world.length} cidades fora do Brasil.`);

  const all = [...ibge, ...world];
  const CHUNK = 1000;
  for (let i = 0; i < all.length; i += CHUNK) {
    const chunk = all.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("cities")
      .upsert(chunk, { onConflict: "source,source_id" });
    if (error) throw new Error(`Erro ao gravar cidades: ${error.message}`);
    process.stdout.write(
      `\r  gravadas ${Math.min(i + CHUNK, all.length)}/${all.length}`,
    );
  }
  console.log("\nConcluído.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
