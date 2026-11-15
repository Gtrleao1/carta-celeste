import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  purchasePath,
  runStartPurchase,
  type StartPurchaseDeps,
} from "./start-purchase";

const BASE: Record<string, string> = {
  product_slug: "mapa-astral-completo",
  full_name: "Maria da Silva",
  email: "Maria@Exemplo.com.br",
  password: "senha-forte-123",
  accepted_terms: "on",
  birth_date: "1990-05-17",
  birth_time: "14:30",
  city_mode: "db",
  city_id: "42",
};

function form(overrides: Record<string, string | null> = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ ...BASE, ...overrides })) {
    if (v !== null) f.set(k, v);
  }
  return f;
}

let deps: StartPurchaseDeps;
beforeEach(() => {
  deps = {
    underRateLimit: vi.fn(async () => true),
    productExists: vi.fn(async () => true),
    signUp: vi.fn(async () => ({
      data: { user: { id: "u1", identities: [{}] }, session: null },
      error: null,
    })),
    saveProfile: vi.fn(async () => true),
  };
});

describe("compra pela home", () => {
  it("cria a conta, guarda o perfil e pede a confirmação do e-mail", async () => {
    const r = await runStartPurchase(deps, form());
    expect(r).toHaveProperty("state.message");
    expect("state" in r && r.state.message).toContain("maria@exemplo.com.br");
    expect(deps.signUp).toHaveBeenCalledWith({
      email: "maria@exemplo.com.br",
      password: "senha-forte-123",
      fullName: "Maria da Silva",
      next: purchasePath("mapa-astral-completo"),
    });
    expect(deps.saveProfile).toHaveBeenCalledTimes(1);
    const [userId, birth] = vi.mocked(deps.saveProfile).mock.calls[0];
    expect(userId).toBe("u1");
    // o nome da conta é o nome de quem nasceu
    expect(birth).toMatchObject({
      name: "Maria da Silva",
      birth_date: "1990-05-17",
      birth_time: "14:30",
      time_unknown: false,
      city: { mode: "db", city_id: 42 },
    });
  });

  it("com sessão (confirmação desligada) vai direto à confirmação do pedido", async () => {
    vi.mocked(deps.signUp).mockResolvedValue({
      data: { user: { id: "u1", identities: [{}] }, session: { ok: 1 } },
      error: null,
    });
    const r = await runStartPurchase(deps, form());
    expect(r).toEqual({
      redirectTo: "/comprar/mapa-astral-completo?confirmar=1",
    });
  });

  it("e-mail que já tem conta: não grava nada e oferece entrar", async () => {
    vi.mocked(deps.signUp).mockResolvedValue({
      data: { user: { id: "fake", identities: [] }, session: null },
      error: null,
    });
    const r = await runStartPurchase(deps, form());
    expect(r).toEqual({
      state: { existingAccountEmail: "maria@exemplo.com.br" },
    });
    expect(deps.saveProfile).not.toHaveBeenCalled();
  });

  it("erro de 'já registrado' do Supabase também não grava nada", async () => {
    vi.mocked(deps.signUp).mockResolvedValue({
      data: null,
      error: { code: "user_already_exists" },
    });
    const r = await runStartPurchase(deps, form());
    expect("state" in r && r.state.existingAccountEmail).toBeTruthy();
    expect(deps.saveProfile).not.toHaveBeenCalled();
  });

  it("junta os erros da conta e do nascimento, sem repetir o nome", async () => {
    const r = await runStartPurchase(
      deps,
      form({
        full_name: "A",
        email: "nao-e-email",
        password: "curta",
        accepted_terms: null,
        birth_date: "",
        city_id: "",
      }),
    );
    expect("state" in r).toBe(true);
    const errors = "state" in r ? (r.state.fieldErrors ?? {}) : {};
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining([
        "full_name",
        "email",
        "password",
        "accepted_terms",
        "birth_date",
        "city",
      ]),
    );
    expect(errors.full_name).toHaveLength(1);
    // validou antes de qualquer efeito colateral
    expect(deps.signUp).not.toHaveBeenCalled();
    expect(deps.underRateLimit).not.toHaveBeenCalled();
  });

  it("exige a hora ou o 'não sei a hora'", async () => {
    const r = await runStartPurchase(deps, form({ birth_time: null }));
    expect("state" in r && r.state.fieldErrors?.birth_time).toBeTruthy();
    const ok = await runStartPurchase(
      deps,
      form({ birth_time: null, time_unknown: "on" }),
    );
    expect("state" in ok && ok.state.message).toBeTruthy();
    expect(vi.mocked(deps.saveProfile).mock.calls[0][1]).toMatchObject({
      time_unknown: true,
    });
  });

  it("respeita o limite de tentativas", async () => {
    vi.mocked(deps.underRateLimit).mockResolvedValue(false);
    const r = await runStartPurchase(deps, form());
    expect("state" in r && r.state.error).toMatch(/Muitas tentativas/);
    expect(deps.signUp).not.toHaveBeenCalled();
  });

  it.each(["", "../x", "A B", "mapa_astral"])(
    "recusa produto de endereço inválido (%j)",
    async (slug) => {
      const r = await runStartPurchase(deps, form({ product_slug: slug }));
      expect("state" in r && r.state.error).toMatch(/não está disponível/);
      expect(deps.signUp).not.toHaveBeenCalled();
    },
  );

  it("recusa produto que não existe ou está inativo", async () => {
    vi.mocked(deps.productExists).mockResolvedValue(false);
    const r = await runStartPurchase(deps, form());
    expect("state" in r && r.state.error).toMatch(/não está disponível/);
    expect(deps.signUp).not.toHaveBeenCalled();
  });

  it("falha ao criar a conta: mensagem clara, nada gravado", async () => {
    vi.mocked(deps.signUp).mockResolvedValue({
      data: null,
      error: { code: "over_email_send_rate_limit" },
    });
    const r = await runStartPurchase(deps, form());
    expect("state" in r && r.state.error).toMatch(/Muitos e-mails/);
    expect(deps.saveProfile).not.toHaveBeenCalled();
  });

  it("se o perfil não gravar, a compra segue (a próxima tela pede de novo)", async () => {
    vi.mocked(deps.saveProfile).mockResolvedValue(false);
    const r = await runStartPurchase(deps, form());
    expect("state" in r && r.state.message).toBeTruthy();
  });
});
