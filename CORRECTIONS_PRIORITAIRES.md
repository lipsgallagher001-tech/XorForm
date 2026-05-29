# 🔧 CORRECTIONS PRIORITAIRES - XorForm

**Date**: 29 Mai 2026  
**Priorité**: P0 (URGENT)

---

## 🚨 PROBLÈMES CRITIQUES À CORRIGER IMMÉDIATEMENT

### 1. ❌ TABLES SUPABASE NON CRÉÉES

**Impact**: Application ne peut pas sauvegarder les données dans le cloud

**Solution**:
1. Ouvrir [Supabase Dashboard](https://app.supabase.com)
2. Sélectionner votre projet
3. Aller dans **SQL Editor**
4. Copier le contenu de `supabase-schema-fixed.sql`
5. Exécuter le script
6. Vérifier que les tables sont créées

**Vérification**:
```sql
-- Dans SQL Editor, exécuter:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Devrait afficher:
-- company_settings
-- proformas
```

---

### 2. ❌ PAS DE VALIDATION DES DONNÉES

**Impact**: Données corrompues, bugs, sécurité compromise

**Solution**: Installer et configurer Zod

```bash
npm install zod
```

**Créer**: `src/lib/validation.ts`
```typescript
import { z } from 'zod';

// Schéma pour les items
export const ProformaItemSchema = z.object({
  id: z.string().min(1, "ID requis"),
  description: z.string()
    .min(1, "Description requise")
    .max(500, "Description trop longue"),
  quantity: z.number()
    .int("Quantité doit être un entier")
    .positive("Quantité doit être positive")
    .max(10000, "Quantité trop élevée"),
  unitPrice: z.number()
    .nonnegative("Prix doit être positif")
    .max(1000000000, "Prix trop élevé")
});

// Schéma pour le client
export const ClientInfoSchema = z.object({
  name: z.string()
    .min(1, "Nom client requis")
    .max(200, "Nom trop long"),
  phone: z.string()
    .regex(/^[\d\s\+\-\(\)]+$/, "Téléphone invalide")
    .optional()
    .or(z.literal('')),
  address: z.string().max(500).optional()
});

// Schéma pour le proforma complet
export const ProformaSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['PROFORMA', 'FACTURE']),
  number: z.string().min(1, "Numéro requis"),
  date: z.string().datetime(),
  client: ClientInfoSchema,
  items: z.array(ProformaItemSchema)
    .min(1, "Au moins un item requis")
    .max(100, "Trop d'items"),
  discountPercent: z.number()
    .min(0, "Réduction ne peut pas être négative")
    .max(100, "Réduction ne peut pas dépasser 100%")
    .optional(),
  total: z.number().nonnegative("Total doit être positif")
});

// Schéma pour les paramètres d'entreprise
export const CompanyInfoSchema = z.object({
  name: z.string().min(1, "Nom entreprise requis").max(200),
  address: z.string().min(1, "Adresse requise").max(500),
  email: z.string().email("Email invalide"),
  phone: z.string().regex(/^[\d\s\+\-\(\)]+$/, "Téléphone invalide"),
  logo: z.string().optional(),
  logoWidth: z.number().min(5).max(100).optional(),
  logoHeight: z.number().min(5).max(100).optional(),
  signature: z.string().optional(),
  signatureWidth: z.number().min(10).max(150).optional(),
  signatureHeight: z.number().min(10).max(150).optional(),
  stamp: z.string().optional(),
  stampWidth: z.number().min(10).max(150).optional(),
  stampHeight: z.number().min(10).max(150).optional(),
  watermark: z.string().max(50).optional(),
  services: z.string().max(1000).optional(),
  siret: z.string().regex(/^\d{14}$/, "SIRET doit contenir 14 chiffres").optional().or(z.literal('')),
  siren: z.string().regex(/^\d{9}$/, "SIREN doit contenir 9 chiffres").optional().or(z.literal('')),
  rcs: z.string().max(100).optional()
});

// Fonction helper pour valider
export function validateProforma(data: unknown) {
  return ProformaSchema.safeParse(data);
}

export function validateCompanyInfo(data: unknown) {
  return CompanyInfoSchema.safeParse(data);
}

export function validateProformaItem(data: unknown) {
  return ProformaItemSchema.safeParse(data);
}
```

**Modifier**: `src/App.tsx`
```typescript
import { validateProforma, validateCompanyInfo } from './lib/validation';

// Dans saveProforma
const saveProforma = async () => {
  if (!client.name || !currentUserId) {
    alert('Veuillez remplir le nom du client');
    return;
  }
  
  const proformaData = {
    id: viewingHistoryId || currentId,
    type: docType,
    number: proformaNumber,
    date: proformaDate,
    client,
    items,
    discountPercent,
    total
  };

  // ✅ VALIDATION
  const validation = validateProforma(proformaData);
  if (!validation.success) {
    const errors = validation.error.errors.map(e => e.message).join('\n');
    alert(`Erreurs de validation:\n${errors}`);
    console.error('Validation errors:', validation.error);
    return;
  }

  // Sauvegarder
  const success = await saveProformaToSupabase(currentUserId, validation.data);
  // ...
};

// Dans handleSaveAndCloseSettings
const handleSaveAndCloseSettings = async () => {
  if (!currentUserId) {
    alert('Erreur: Utilisateur non connecté');
    return;
  }

  // ✅ VALIDATION
  const validation = validateCompanyInfo(companyInfo);
  if (!validation.success) {
    const errors = validation.error.errors.map(e => e.message).join('\n');
    alert(`Erreurs de validation:\n${errors}`);
    console.error('Validation errors:', validation.error);
    return;
  }

  setIsSavingSettings(true);
  const success = await saveCompanySettings(currentUserId, validation.data);
  // ...
};
```

---

### 3. ❌ GESTION D'ERREURS INSUFFISANTE

**Impact**: Utilisateur ne comprend pas les erreurs, débogage difficile

**Solution**: Créer un système de gestion d'erreurs

**Créer**: `src/lib/errors.ts`
```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  // Auth
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  
  // Database
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_TABLE_NOT_FOUND: 'DB_TABLE_NOT_FOUND',
  
  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Business Logic
  SAVE_FAILED: 'SAVE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  LOAD_FAILED: 'LOAD_FAILED'
};

export const ErrorMessages = {
  [ErrorCodes.AUTH_FAILED]: 'Échec de l\'authentification',
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Email ou mot de passe incorrect',
  [ErrorCodes.DB_CONNECTION_FAILED]: 'Impossible de se connecter à la base de données',
  [ErrorCodes.DB_TABLE_NOT_FOUND]: 'Table non trouvée. Veuillez contacter le support.',
  [ErrorCodes.VALIDATION_FAILED]: 'Les données saisies sont invalides',
  [ErrorCodes.SAVE_FAILED]: 'Impossible de sauvegarder. Vérifiez votre connexion.',
  [ErrorCodes.DELETE_FAILED]: 'Impossible de supprimer',
  [ErrorCodes.LOAD_FAILED]: 'Impossible de charger les données'
};

export function createError(
  code: string,
  details?: any
): AppError {
  const userMessage = ErrorMessages[code] || 'Une erreur est survenue';
  return new AppError(
    `Error ${code}`,
    code,
    userMessage,
    details
  );
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      'Une erreur inattendue est survenue',
      { originalError: error }
    );
  }
  
  return new AppError(
    'Unknown error',
    'UNKNOWN_ERROR',
    'Une erreur inattendue est survenue',
    { error }
  );
}
```

**Modifier**: `src/lib/supabase-helpers.ts`
```typescript
import { createError, handleError, ErrorCodes } from './errors';

export async function saveCompanySettings(
  userId: string, 
  settings: CompanyInfo
): Promise<{ success: boolean; error?: AppError }> {
  try {
    console.log('💾 Sauvegarde des paramètres...', { userId });
    
    const dataToSave = {
      user_id: userId,
      name: settings.name,
      address: settings.address,
      email: settings.email,
      phone: settings.phone,
      // ... autres champs
    };

    const { data: existing } = await supabase
      .from('company_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('company_settings')
        .update({ ...dataToSave, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select();
    } else {
      result = await supabase
        .from('company_settings')
        .insert(dataToSave)
        .select();
    }

    if (result.error) {
      // Vérifier si c'est une erreur de table non trouvée
      if (result.error.code === '42P01') {
        throw createError(ErrorCodes.DB_TABLE_NOT_FOUND, {
          table: 'company_settings',
          error: result.error
        });
      }
      throw createError(ErrorCodes.SAVE_FAILED, result.error);
    }

    // Backup localStorage
    localStorage.setItem(`company_settings_${userId}`, JSON.stringify(settings));
    console.log('✅ Sauvegarde réussie');
    return { success: true };
    
  } catch (err) {
    const error = handleError(err);
    console.error('❌ Erreur:', error);
    
    // Fallback localStorage
    try {
      localStorage.setItem(`company_settings_${userId}`, JSON.stringify(settings));
      console.log('⚠️ Sauvegardé dans localStorage uniquement');
      return { success: true };
    } catch (localErr) {
      return { success: false, error };
    }
  }
}
```

**Modifier**: `src/App.tsx`
```typescript
const handleSaveAndCloseSettings = async () => {
  if (!currentUserId) {
    alert('Erreur: Utilisateur non connecté');
    return;
  }

  setIsSavingSettings(true);
  const result = await saveCompanySettings(currentUserId, companyInfo);
  setIsSavingSettings(false);
  
  if (result.success) {
    setSettingsSaved(true);
    window.setTimeout(() => {
      setSettingsSaved(false);
      setShowSettings(false);
    }, 1500);
  } else {
    // ✅ Afficher l'erreur à l'utilisateur
    alert(result.error?.userMessage || 'Erreur lors de la sauvegarde');
    console.error('Détails:', result.error);
  }
};
```

---

### 4. ⚠️ AJOUTER DES TESTS DE BASE

**Impact**: Régressions non détectées, bugs en production

**Solution**: Installer Vitest et créer tests critiques

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom
```

**Créer**: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

**Créer**: `src/test/setup.ts`
```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

**Créer**: `src/lib/__tests__/validation.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { validateProforma, validateCompanyInfo, validateProformaItem } from '../validation';

describe('Validation', () => {
  describe('validateProformaItem', () => {
    it('should validate valid item', () => {
      const item = {
        id: '123',
        description: 'Test item',
        quantity: 5,
        unitPrice: 100
      };
      
      const result = validateProformaItem(item);
      expect(result.success).toBe(true);
    });

    it('should reject negative quantity', () => {
      const item = {
        id: '123',
        description: 'Test',
        quantity: -5,
        unitPrice: 100
      };
      
      const result = validateProformaItem(item);
      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const item = {
        id: '123',
        description: 'Test',
        quantity: 5,
        unitPrice: -100
      };
      
      const result = validateProformaItem(item);
      expect(result.success).toBe(false);
    });
  });

  describe('validateCompanyInfo', () => {
    it('should validate valid company info', () => {
      const info = {
        name: 'Test Company',
        address: '123 Test St',
        email: 'test@test.com',
        phone: '0123456789'
      };
      
      const result = validateCompanyInfo(info);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const info = {
        name: 'Test Company',
        address: '123 Test St',
        email: 'invalid-email',
        phone: '0123456789'
      };
      
      const result = validateCompanyInfo(info);
      expect(result.success).toBe(false);
    });
  });
});
```

**Modifier**: `package.json`
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Exécuter**:
```bash
npm test
```

---

## 📋 CHECKLIST DE VÉRIFICATION

Après avoir appliqué ces corrections, vérifier:

### Base de données
- [ ] Tables `company_settings` et `proformas` créées dans Supabase
- [ ] RLS activé sur les deux tables
- [ ] Policies créées pour user_id
- [ ] Test de sauvegarde réussi
- [ ] Test de chargement réussi

### Validation
- [ ] Zod installé
- [ ] Schémas de validation créés
- [ ] Validation appliquée dans saveProforma
- [ ] Validation appliquée dans handleSaveAndCloseSettings
- [ ] Messages d'erreur affichés à l'utilisateur

### Gestion d'erreurs
- [ ] Classe AppError créée
- [ ] ErrorCodes définis
- [ ] ErrorMessages définis
- [ ] Erreurs gérées dans supabase-helpers
- [ ] Erreurs affichées dans l'UI

### Tests
- [ ] Vitest installé
- [ ] Tests de validation créés
- [ ] Tests passent (npm test)
- [ ] Coverage > 50%

---

## 🚀 COMMANDES À EXÉCUTER

```bash
# 1. Installer les dépendances
npm install zod
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom

# 2. Créer les fichiers
# - src/lib/validation.ts
# - src/lib/errors.ts
# - src/lib/__tests__/validation.test.ts
# - vitest.config.ts
# - src/test/setup.ts

# 3. Modifier les fichiers existants
# - src/App.tsx (ajouter validation)
# - src/lib/supabase-helpers.ts (ajouter gestion erreurs)
# - package.json (ajouter scripts test)

# 4. Exécuter les tests
npm test

# 5. Build et vérifier
npm run build

# 6. Commit
git add .
git commit -m "fix: Ajouter validation, gestion erreurs et tests"
git push
```

---

## ⏱️ TEMPS ESTIMÉ

- **Validation (Zod)**: 1-2 heures
- **Gestion d'erreurs**: 1-2 heures
- **Tests de base**: 2-3 heures
- **Tables Supabase**: 30 minutes
- **Total**: 5-8 heures

---

## 📞 SUPPORT

Si vous rencontrez des problèmes:

1. **Tables Supabase**: Vérifier le guide `SUPABASE_FIX_GUIDE.md`
2. **Validation**: Consulter la doc Zod: https://zod.dev
3. **Tests**: Consulter la doc Vitest: https://vitest.dev

---

**Généré par**: Kiro AI Assistant  
**Date**: 29 Mai 2026
