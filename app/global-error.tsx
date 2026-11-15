"use client";

/**
 * Último recurso: falha no próprio layout raiz. Substitui o documento inteiro,
 * então não herda estilos nem fontes do site; por isso o visual é mínimo e
 * escrito aqui mesmo (cores do tema escuro da marca), em português.
 */
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#151938",
          color: "#ece6d6",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 32, margin: "0 0 12px" }}>
            Tivemos um problema por aqui
          </h1>
          <p style={{ color: "#a8a7c6", lineHeight: 1.6, margin: "0 0 24px" }}>
            Não foi culpa sua. Tente de novo em instantes.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              background: "#d4b06a",
              color: "#151938",
              border: 0,
              borderRadius: 8,
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
