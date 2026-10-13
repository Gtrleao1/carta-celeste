import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Nos testes não existe a separação cliente/servidor do Next.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    // Os testes de integração falam com o Supabase real: com 200-600 ms por
    // consulta, um teste de 10 seções passa fácil dos 5 s padrão.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
