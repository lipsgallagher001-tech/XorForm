# 🔧 Solution : Données Chargées sur Téléphone mais pas sur PC

## 🎯 Problème

- ✅ Les données se chargent sur **téléphone**
- ❌ Les données ne se chargent **pas sur PC**

## 🔍 Diagnostic Rapide

### Étape 1 : Vérifier la Console (PC)

1. Sur ton **PC**, ouvre l'application
2. Appuie sur **F12** pour ouvrir la console
3. Recharge la page (**Ctrl+F5**)
4. Regarde les logs

#### Scénario A : Tu vois
```
⚡ Paramètres chargés depuis le cache
⚡ Proformas chargés depuis le cache: 0
```
→ **Problème** : Cache vide ou corrompu

#### Scénario B : Tu vois
```
⚠️ Aucun paramètre trouvé
```
→ **Problème** : Pas connecté avec le bon compte

#### Scénario C : Tu vois
```
❌ Erreur Supabase: 42501
🔒 PROBLÈME RLS !
```
→ **Problème** : Permissions RLS

---

## ✅ Solution 1 : Vider le Cache du PC (RECOMMANDÉ)

### Méthode A : Via la Console (Rapide)

1. Sur ton **PC**, ouvre l'application
2. Appuie sur **F12**
3. Va dans l'onglet **Console**
4. Tape ces commandes :

```javascript
// Vider tout le cache
Object.keys(localStorage)
  .filter(k => k.startsWith('cache_'))
  .forEach(k => localStorage.removeItem(k));

// Vérifier que c'est vide
Object.keys(localStorage).filter(k => k.startsWith('cache_'))
// Devrait retourner: []

// Recharger la page
location.reload();
```

### Méthode B : Via les Paramètres du Navigateur

#### Chrome / Edge
1. Appuie sur **Ctrl+Shift+Delete**
2. Sélectionne **"Tout le temps"**
3. Coche **"Cookies et autres données de site"**
4. Coche **"Images et fichiers en cache"**
5. Clique sur **"Effacer les données"**
6. Recharge l'application

#### Firefox
1. Appuie sur **Ctrl+Shift+Delete**
2. Sélectionne **"Tout"**
3. Coche **"Cookies"** et **"Cache"**
4. Clique sur **"Effacer maintenant"**
5. Recharge l'application

---

## ✅ Solution 2 : Vérifier la Session

### Étape 1 : Vérifier l'User ID

Dans la console (F12) :

```javascript
// Voir l'utilisateur connecté
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user?.id);
console.log('Email:', user?.email);
```

### Étape 2 : Comparer avec le Téléphone

Sur ton **téléphone**, fais la même chose :
1. Ouvre la console mobile (si possible)
2. Ou vérifie l'email de connexion

### Étape 3 : Si Différent

**Sur PC** :
1. Déconnecte-toi
2. Reconnecte-toi avec le **même compte** que sur téléphone
3. Recharge la page

---

## ✅ Solution 3 : Forcer le Rechargement depuis Supabase

### Dans la Console (F12)

```javascript
// 1. Vider le cache
Object.keys(localStorage)
  .filter(k => k.startsWith('cache_'))
  .forEach(k => localStorage.removeItem(k));

// 2. Déconnexion
await supabase.auth.signOut();

// 3. Recharger la page
location.reload();

// 4. Se reconnecter
// (utilise le formulaire de connexion)
```

---

## ✅ Solution 4 : Vérifier les Données dans Supabase

### Étape 1 : Ouvrir Supabase Dashboard

1. Va sur https://supabase.com
2. Ouvre ton projet
3. Va dans **Table Editor**

### Étape 2 : Vérifier `company_settings`

1. Ouvre la table `company_settings`
2. Vérifie qu'il y a **une ligne** avec tes données
3. Note le **user_id** de cette ligne

### Étape 3 : Comparer avec ton User ID (PC)

Dans la console (F12) sur PC :

```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID PC:', user?.id);

// Compare avec le user_id dans Supabase
// Ils doivent être IDENTIQUES
```

### Si Différents

**Option A** : Mettre à jour le user_id dans Supabase

Dans Supabase → SQL Editor :

```sql
-- Remplace 'USER_ID_PC' par ton user_id du PC
UPDATE company_settings 
SET user_id = 'USER_ID_PC'
WHERE user_id = 'ANCIEN_USER_ID';
```

**Option B** : Sauvegarder à nouveau depuis le PC

1. Ouvre les paramètres entreprise
2. Modifie quelque chose
3. Clique sur "Enregistrer"
4. Recharge la page

---

## 🔍 Diagnostic Avancé

### Vérifier le Cache localStorage

Dans la console (F12) sur **PC** :

```javascript
// Voir toutes les clés
console.log('Clés localStorage:', Object.keys(localStorage));

// Voir le cache des paramètres
const userId = (await supabase.auth.getUser()).data.user?.id;
const cacheKey = `cache_company_settings_${userId}`;
const cached = localStorage.getItem(cacheKey);

if (cached) {
  console.log('Cache trouvé:', JSON.parse(cached));
} else {
  console.log('❌ Pas de cache pour cet utilisateur');
}
```

### Comparer avec le Téléphone

Fais la même chose sur **téléphone** (si possible) et compare les résultats.

---

## 📊 Tableau de Diagnostic

| Symptôme | Cause Probable | Solution |
|----------|----------------|----------|
| Cache vide sur PC | Cache pas encore créé | Recharger la page |
| User ID différent | Comptes différents | Se connecter avec le même compte |
| Erreur RLS | Permissions manquantes | Exécuter `fix_company_settings_rls.sql` |
| Cache corrompu | Données invalides | Vider le cache (Solution 1) |
| Session expirée | Token expiré | Se reconnecter |

---

## 🎯 Procédure Complète (Étape par Étape)

### Sur PC

1. **Ouvrir la console** (F12)

2. **Vider le cache**
```javascript
Object.keys(localStorage)
  .filter(k => k.startsWith('cache_'))
  .forEach(k => localStorage.removeItem(k));
```

3. **Vérifier l'utilisateur connecté**
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user?.email, user?.id);
```

4. **Si pas connecté ou mauvais compte**
   - Déconnecte-toi
   - Reconnecte-toi avec le **même email** que sur téléphone

5. **Recharger la page** (Ctrl+F5)

6. **Vérifier les logs**
   - Tu devrais voir : `📥 Chargement depuis Supabase...`
   - Puis : `✅ Paramètres chargés`

7. **Recharger à nouveau** (F5)
   - Tu devrais voir : `⚡ Paramètres chargés depuis le cache`

---

## ⚠️ Si Ça Ne Fonctionne Toujours Pas

### Vérifier les Erreurs

Dans la console (F12), cherche des erreurs en rouge :

#### Erreur : "Failed to fetch"
→ **Problème réseau** : Vérifie ta connexion internet

#### Erreur : "permission denied" (42501)
→ **Problème RLS** : Exécute `fix_company_settings_rls.sql`

#### Erreur : "relation does not exist" (42P01)
→ **Table manquante** : Exécute `supabase-schema-fixed.sql`

---

## 🔄 Synchronisation PC ↔ Téléphone

### Important à Comprendre

Le cache localStorage **n'est PAS synchronisé** entre appareils :
- Chaque appareil a son propre cache
- Les données sont dans **Supabase** (synchronisées)
- Le cache est juste une **copie locale** pour accélérer

### Workflow Normal

1. **Téléphone** : Charge depuis Supabase → Met en cache
2. **PC** : Charge depuis Supabase → Met en cache
3. Les deux ont maintenant leur propre cache
4. Si tu modifies sur téléphone → Sauvegarde dans Supabase
5. Sur PC, le cache est **invalidé** automatiquement
6. PC recharge depuis Supabase → Nouvelles données

---

## ✅ Checklist Finale

Après avoir suivi les solutions :

- [ ] Cache vidé sur PC
- [ ] Connecté avec le même compte (même email)
- [ ] User ID vérifié (identique à Supabase)
- [ ] Page rechargée (Ctrl+F5)
- [ ] Logs vérifiés dans la console
- [ ] Données chargées avec succès
- [ ] Cache créé (2ème chargement rapide)

---

## 📞 Support

Si après toutes ces étapes, ça ne fonctionne toujours pas :

1. **Copier les logs** de la console (Ctrl+A, Ctrl+C)
2. **Noter** :
   - Email de connexion (PC et téléphone)
   - User ID (PC et téléphone)
   - Erreurs affichées
3. **Faire une capture d'écran** de la console
4. Partager ces informations

---

**Créé par** : Kiro AI Assistant  
**Date** : 29 Mai 2026  
**Projet** : XorForm

