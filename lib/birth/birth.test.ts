import { describe, expect, it } from "vitest";

import { zonedToUtc } from "@/lib/astro/core";

import { ageOn, isAdult, todayInBrazil } from "./age";
import { birthProfileFromForm, birthProfileSchema } from "./schemas";
import {
  formatBirthSummary,
  formatLongDate,
  formatUtcOffset,
  isValidTimeZone,
  utcOffsetMinutes,
} from "./summary";

describe("idade (18+)", () => {
  it("calcula a idade completa, respeitando o aniversário", () => {
    expect(ageOn("2000-07-14", "2018-07-13")).toBe(17);
    expect(ageOn("2000-07-14", "2018-07-14")).toBe(18);
    expect(ageOn("2000-07-14", "2018-07-15")).toBe(18);
    expect(ageOn("2000-12-31", "2018-01-01")).toBe(17);
  });

  it("isAdult: 18 anos completos hoje já vale; um dia antes, não", () => {
    expect(isAdult("2008-10-06", "2026-10-06")).toBe(true);
    expect(isAdult("2008-10-07", "2026-10-06")).toBe(false);
    expect(isAdult("1990-01-01", "2026-10-06")).toBe(true);
    expect(isAdult("2020-01-01", "2026-10-06")).toBe(false);
  });

  it("quem nasceu em 29/02 faz 18 anos em 01/03 nos anos não bissextos", () => {
    expect(isAdult("2008-02-29", "2026-02-28")).toBe(false);
    expect(isAdult("2008-02-29", "2026-03-01")).toBe(true);
  });

  it("todayInBrazil devolve AAAA-MM-DD no horário de Brasília", () => {
    // 01:00 UTC ainda é o dia anterior em Brasília (UTC−3).
    expect(todayInBrazil(new Date("2026-10-06T01:00:00Z"))).toBe("2026-10-05");
    expect(todayInBrazil(new Date("2026-10-06T12:00:00Z"))).toBe("2026-10-06");
  });
});

describe("resumo do nascimento", () => {
  it('formata como "14 de julho de 1995, 15h30 (UTC−3), Campinas, SP"', () => {
    expect(
      formatBirthSummary({
        birthDate: "1995-07-14",
        birthTime: "15:30",
        timezone: "America/Sao_Paulo",
        cityName: "Campinas, SP",
      }),
    ).toBe("14 de julho de 1995, 15h30 (UTC−3), Campinas, SP");
  });

  it("mostra o horário de verão histórico no offset", () => {
    expect(
      formatBirthSummary({
        birthDate: "1995-01-15",
        birthTime: "12:00",
        timezone: "America/Sao_Paulo",
        cityName: "Campinas, SP",
      }),
    ).toBe("15 de janeiro de 1995, 12h00 (UTC−2), Campinas, SP");
  });

  it("sem hora, diz que a hora é desconhecida", () => {
    expect(
      formatBirthSummary({
        birthDate: "1995-07-14",
        birthTime: null,
        timezone: "America/Sao_Paulo",
        cityName: "Campinas, SP",
      }),
    ).toBe("14 de julho de 1995, hora desconhecida, Campinas, SP");
  });

  it("formata offsets com minutos e UTC", () => {
    expect(formatUtcOffset(-180)).toBe("UTC−3");
    expect(formatUtcOffset(330)).toBe("UTC+5:30");
    expect(formatUtcOffset(-210)).toBe("UTC−3:30");
    expect(formatUtcOffset(0)).toBe("UTC");
    expect(formatLongDate("2000-03-01")).toBe("1 de março de 2000");
  });

  it("o offset bate com o do motor de cálculo (zonedToUtc)", () => {
    const cases: [string, string, string][] = [
      ["1995-01-15", "12:00", "America/Sao_Paulo"],
      ["1995-07-14", "15:30", "America/Sao_Paulo"],
      ["1990-07-13", "17:35", "UTC"],
      ["2000-06-01", "08:00", "Asia/Kolkata"],
      ["1988-03-27", "02:30", "Europe/Lisbon"],
      ["2012-12-31", "23:59", "Australia/Sydney"],
      ["1980-02-29", "00:00", "America/New_York"],
    ];
    for (const [date, time, tz] of cases) {
      const [y, m, d] = date.split("-").map(Number);
      const [h, mi] = time.split(":").map(Number);
      expect(utcOffsetMinutes(date, time, tz), `${date} ${time} ${tz}`).toBe(
        zonedToUtc(y, m, d, h, mi, tz).offsetMin,
      );
    }
  });

  it("valida fusos IANA", () => {
    expect(isValidTimeZone("America/Sao_Paulo")).toBe(true);
    expect(isValidTimeZone("Marte/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("perfil de nascimento", () => {
  const valid = {
    name: "  Maria  ",
    birth_date: "1995-07-14",
    time_unknown: false,
    birth_time: "15:30",
    city: { mode: "db" as const, city_id: "42" },
  };

  it("aceita um perfil completo com cidade da lista", () => {
    const r = birthProfileSchema.parse(valid);
    expect(r.name).toBe("Maria");
    expect(r.city).toEqual({ mode: "db", city_id: 42 });
  });

  it("hora desconhecida dispensa a hora", () => {
    const r = birthProfileSchema.safeParse({
      ...valid,
      time_unknown: true,
      birth_time: undefined,
    });
    expect(r.success).toBe(true);
  });

  it("sem hora e sem marcar 'não sei a hora', pede a hora", () => {
    const r = birthProfileSchema.safeParse({ ...valid, birth_time: undefined });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["birth_time"]);
    expect(
      birthProfileSchema.safeParse({ ...valid, birth_time: "25:61" }).success,
    ).toBe(false);
  });

  it("recusa data inválida ou no futuro", () => {
    for (const birth_date of [
      "1995-02-30",
      "14/07/1995",
      "1850-01-01",
      "2999-01-01",
    ]) {
      expect(
        birthProfileSchema.safeParse({ ...valid, birth_date }).success,
      ).toBe(false);
    }
  });

  it("cidade manual: aceita vírgula decimal e valida limites e fuso", () => {
    const manual = {
      mode: "manual" as const,
      name: "Cidade Nova",
      latitude: "-22,91",
      longitude: "-47,06",
      timezone: "America/Sao_Paulo",
    };
    const ok = birthProfileSchema.parse({ ...valid, city: manual });
    expect(ok.city).toMatchObject({ latitude: -22.91, longitude: -47.06 });

    for (const bad of [
      { ...manual, latitude: "91" },
      { ...manual, longitude: "-181" },
      { ...manual, latitude: "abc" },
      { ...manual, timezone: "Marte/Olympus" },
      { ...manual, name: "" },
    ]) {
      expect(
        birthProfileSchema.safeParse({ ...valid, city: bad }).success,
      ).toBe(false);
    }
  });

  it("cidade da lista exige um id válido", () => {
    for (const city_id of ["", "0", "-3", "abc"]) {
      expect(
        birthProfileSchema.safeParse({
          ...valid,
          city: { mode: "db", city_id },
        }).success,
      ).toBe(false);
    }
  });

  it("converte os campos do formulário", () => {
    const fd = new FormData();
    fd.set("name", "Ana");
    fd.set("birth_date", "1990-01-02");
    fd.set("time_unknown", "on");
    fd.set("city_mode", "db");
    fd.set("city_id", "7");
    const parsed = birthProfileSchema.parse(birthProfileFromForm(fd));
    expect(parsed).toMatchObject({
      name: "Ana",
      time_unknown: true,
      city: { mode: "db", city_id: 7 },
    });
  });
});
