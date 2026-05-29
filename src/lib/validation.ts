import { z } from 'zod';

/**
 * Schémas de validation pour XorForm
 */

// Schéma pour les items de proforma
export const ProformaItemSchema = z.object({
  id: z.string().min(1, "ID requis"),
  description: z.string()
    .min(1, "Description requise")
    .max(500, "Description trop longue (max 500 caractères)"),
  quantity: z.number()
    .int("La quantité doit être un nombre entier")
    .positive("La quantité doit être positive")
    .max(10000, "Quantité trop élevée (max 10000)"),
  unitPrice: z.number()
    .nonnegative("Le prix doit être positif ou zéro")
    .max(1000000000, "Prix trop élevé")
});

// Schéma pour les informations client
export const ClientInfoSchema = z.object({
  name: z.string()
    .min(1, "Le nom du client est requis")
    .max(200, "Nom trop long (max 200 caractères)"),
  phone: z.string()
    .regex(/^[\d\s\+\-\(\)]*$/, "Format de téléphone invalide")
    .optional()
    .or(z.literal('')),
  address: z.string()
    .max(500, "Adresse trop longue (max 500 caractères)")
    .optional()
});

// Schéma pour le proforma complet
export const ProformaSchema = z.object({
  id: z.string().min(1, "ID requis"),
  type: z.enum(['PROFORMA', 'FACTURE'], {
    errorMap: () => ({ message: "Type doit être PROFORMA ou FACTURE" })
  }),
  number: z.string().min(1, "Numéro de document requis"),
  date: z.string().datetime("Format de date invalide"),
  client: ClientInfoSchema,
  items: z.array(ProformaItemSchema)
    .min(1, "Au moins un article est requis")
    .max(100, "Trop d'articles (max 100)"),
  discountPercent: z.number()
    .min(0, "La réduction ne peut pas être négative")
    .max(100, "La réduction ne peut pas dépasser 100%")
    .optional()
    .default(0),
  total: z.number()
    .nonnegative("Le total doit être positif ou zéro")
});

// Schéma pour les paramètres d'entreprise
export const CompanyInfoSchema = z.object({
  name: z.string()
    .min(1, "Le nom de l'entreprise est requis")
    .max(200, "Nom trop long (max 200 caractères)"),
  address: z.string()
    .min(1, "L'adresse est requise")
    .max(500, "Adresse trop longue (max 500 caractères)"),
  email: z.string()
    .email("Format d'email invalide"),
  phone: z.string()
    .regex(/^[\d\s\+\-\(\)]+$/, "Format de téléphone invalide"),
  logo: z.string().optional(),
  logoWidth: z.number()
    .min(5, "Largeur minimale: 5mm")
    .max(100, "Largeur maximale: 100mm")
    .optional(),
  logoHeight: z.number()
    .min(5, "Hauteur minimale: 5mm")
    .max(100, "Hauteur maximale: 100mm")
    .optional(),
  signature: z.string().optional(),
  signatureWidth: z.number()
    .min(10, "Largeur minimale: 10mm")
    .max(150, "Largeur maximale: 150mm")
    .optional(),
  signatureHeight: z.number()
    .min(10, "Hauteur minimale: 10mm")
    .max(150, "Hauteur maximale: 150mm")
    .optional(),
  stamp: z.string().optional(),
  stampWidth: z.number()
    .min(10, "Largeur minimale: 10mm")
    .max(150, "Largeur maximale: 150mm")
    .optional(),
  stampHeight: z.number()
    .min(10, "Hauteur minimale: 10mm")
    .max(150, "Hauteur maximale: 150mm")
    .optional(),
  watermark: z.string()
    .max(50, "Filigrane trop long (max 50 caractères)")
    .optional(),
  services: z.string()
    .max(1000, "Services trop long (max 1000 caractères)")
    .optional(),
  siret: z.string()
    .regex(/^\d{14}$/, "Le SIRET doit contenir exactement 14 chiffres")
    .optional()
    .or(z.literal('')),
  siren: z.string()
    .regex(/^\d{9}$/, "Le SIREN doit contenir exactement 9 chiffres")
    .optional()
    .or(z.literal('')),
  rcs: z.string()
    .max(100, "RCS trop long (max 100 caractères)")
    .optional()
});

// Fonctions helper pour valider
export function validateProforma(data: unknown) {
  return ProformaSchema.safeParse(data);
}

export function validateCompanyInfo(data: unknown) {
  return CompanyInfoSchema.safeParse(data);
}

export function validateProformaItem(data: unknown) {
  return ProformaItemSchema.safeParse(data);
}

export function validateClientInfo(data: unknown) {
  return ClientInfoSchema.safeParse(data);
}
