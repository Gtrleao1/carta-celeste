import * as React from "react";
import { cn } from "cn";

/**
 * Lista de seleção nativa, com o mesmo visual do `Input`. Nativa de propósito:
 * no celular abre o seletor do próprio sistema, que é o mais fácil de usar, e
 * funciona bem com leitor de tela e teclado.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-11 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3",
        // Sem isto o texto "Dia", "Mês"... fica da cor de um valor escolhido.
        "[&:has(option:checked[value=''])]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
