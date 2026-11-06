import { z } from "zod";

/** Nettoie une valeur de FormData en chaîne (ou null si vide). */
export function field(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const loginSchema = z.object({
  email: z.string().trim().min(1, "L'e-mail est requis").email("E-mail invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Indique ton nom (2 caractères minimum)")
      .max(80, "Nom trop long"),
    email: z.string().trim().min(1, "L'e-mail est requis").email("E-mail invalide"),
    password: z
      .string()
      .min(8, "8 caractères minimum")
      .max(72, "72 caractères maximum"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

const optionalUuid = z
  .string()
  .uuid("Client invalide")
  .nullable()
  .optional();

export const orderFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    client_id: optionalUuid,
    new_client_name: z.string().trim().max(120).nullable().optional(),
    new_client_email: z
      .string()
      .trim()
      .email("E-mail client invalide")
      .max(160)
      .nullable()
      .optional()
      .or(z.literal("").transform(() => null)),
    new_client_discord: z.string().trim().max(120).nullable().optional(),
    title: z
      .string()
      .trim()
      .min(2, "Le titre doit contenir au moins 2 caractères")
      .max(160, "160 caractères maximum"),
    service_type: z.string().trim().min(1, "Choisis un type de prestation").max(80),
    description: z.string().trim().max(5000, "Description trop longue").nullable(),
    status: z.enum(["brief", "creation", "revision", "finalisation", "livre"]),
    payment_status: z.enum(["non_paye", "acompte", "paye"]),
    priority: z.enum(["basse", "normale", "haute", "urgente"]),
    total_price: z
      .number({ message: "Prix invalide" })
      .min(0, "Le prix ne peut pas être négatif")
      .max(1_000_000, "Prix trop élevé"),
    deposit: z
      .number({ message: "Acompte invalide" })
      .min(0, "L'acompte ne peut pas être négatif")
      .max(1_000_000, "Montant trop élevé"),
    deadline: z.string().nullable(),
    revisions_included: z
      .number()
      .int("Nombre entier attendu")
      .min(0, "Minimum 0")
      .max(99, "Maximum 99"),
    revisions_used: z
      .number()
      .int("Nombre entier attendu")
      .min(0, "Minimum 0")
      .max(99, "Maximum 99"),
    time_spent_minutes: z
      .number()
      .int("Nombre entier attendu")
      .min(0, "Minimum 0")
      .max(1_000_000, "Valeur trop grande"),
    tags: z.string().max(400).nullable(),
  })
  .refine(
    (data) => Boolean(data.client_id) || Boolean(data.new_client_name),
    {
      message: "Choisis un client existant ou crée-en un nouveau",
      path: ["client_id"],
    },
  )
  .refine((data) => data.deposit <= data.total_price, {
    message: "L'acompte ne peut pas dépasser le prix total",
    path: ["deposit"],
  });
