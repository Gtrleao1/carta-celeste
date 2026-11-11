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

const text = (max: number) => z.string().trim().max(max);

/**
 * O que o Payment Brick entrega ao navegador quando a pessoa confirma. Só estes
 * campos passam: o valor (`transaction_amount`) e o e-mail são ignorados de
 * propósito, porque vêm do pedido e da conta, nunca do navegador.
 */
export const paymentFormSchema = z.object({
  payment_method_id: text(40).min(1),
  token: text(200).optional(),
  issuer_id: z.union([text(20), z.number().int()]).optional(),
  installments: z.number().int().min(1).max(12).optional(),
  payer: z
    .object({
      first_name: text(60).optional(),
      last_name: text(60).optional(),
      identification: z
        .object({ type: text(10).optional(), number: text(20).optional() })
        .optional(),
      address: z
        .object({
          zip_code: text(12).optional(),
          street_name: text(120).optional(),
          street_number: text(20).optional(),
          neighborhood: text(80).optional(),
          city: text(80).optional(),
          federal_unit: text(4).optional(),
        })
        .optional(),
    })
    .optional(),
});

/** Corpo de `POST /api/pagamento`. */
export const paymentSchema = z.object({
  orderId: z.uuid(),
  formData: paymentFormSchema,
});

export type PaymentForm = z.infer<typeof paymentFormSchema>;
