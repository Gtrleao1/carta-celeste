import { z } from "zod";

/**
 * Corpo de `POST /api/checkout`. Nunca traz preço: o valor vem sempre do banco.
 *  - novo pedido: produto + perfil de nascimento (+ declaração de maioridade);
 *  - nova tentativa de pagamento de um pedido pendente: só o `orderId`.
 */
export const checkoutSchema = z.union([
  z.object({ orderId: z.uuid() }),
  z.object({
    productSlug: z.string().min(1).max(100),
    birthProfileId: z.uuid(),
    ageDeclared: z.boolean().optional(),
    buyerBirthDate: z.string().max(10).optional(),
  }),
]);

export type CheckoutInput = z.infer<typeof checkoutSchema>;
