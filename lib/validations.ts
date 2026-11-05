import { z } from "zod";

export function field(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const loginSchema = z.object({ email: z.string().trim().min(1, "L'e-mail est requis").email("E-mail invalide"), password: z.string().min(1, "Le mot de passe est requis") });
export const registerSchema = z.object({ fullName: z.string().trim().min(2).max(80), email: z.string().trim().email(), password: z.string().min(8).max(72), confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { message: "Les mots de passe ne correspondent pas", path: ["confirmPassword"] });
const optionalUuid = z.string().uuid("Client invalide").nullable().optional();

export const orderFormSchema = z.object({
  id: z.string().uuid().optional(), client_id: optionalUuid,
  new_client_name: z.string().trim().max(120).nullable().optional(),
  new_client_email: z.string().trim().email("E-mail client invalide").max(160).nullable().optional().or(z.literal("").transform(() => null)),
  new_client_discord: z.string().trim().max(120).nullable().optional(),
  title: z.string().trim().min(2).max(160), service_type: z.string().trim().min(1).max(80), description: z.string().trim().max(5000).nullable(),
  status: z.enum(["demande", "devis_envoye", "acompte_paye", "en_cours", "revision", "livre", "paye"]),
  payment_status: z.enum(["non_paye", "acompte", "paye"]), priority: z.enum(["basse", "normale", "haute", "urgente"]),
  total_price: z.number().min(0).max(1_000_000), deposit: z.number().min(0).max(1_000_000), deadline: z.string().nullable(),
  revisions_included: z.number().int().min(0).max(99), revisions_used: z.number().int().min(0).max(99), time_spent_minutes: z.number().int().min(0).max(1_000_000), tags: z.string().max(400).nullable(),
}).refine((data) => Boolean(data.client_id) || Boolean(data.new_client_name), { message: "Choisis un client existant ou crée-en un nouveau", path: ["client_id"] }).refine((data) => data.deposit <= data.total_price, { message: "L'acompte ne peut pas dépasser le prix total", path: ["deposit"] });
