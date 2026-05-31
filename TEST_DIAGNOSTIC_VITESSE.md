# 🔍 Test Diagnostic Vitesse - Trouver la VRAIE Cause

**Objectif** : Identifier précisément pourquoi le chargement prend 45 secondes

---

## 🧪 Test 1 : Mesurer la Latence Supabase

1. Ouvrir votre app en production
2. Appuyer sur **F12** (ouvrir la console)
3. Coller ce code et appuyer sur Entrée :

```javascript
// Test de latence réseau vers Supabase
(async () => {
  const url = 'https://upmlijsgwfxeuynvmgkj.supabase.co';
  console.log('🌐 Test de latence réseau...');
  
  const start = performance.now();
  try {
    await fetch(url + '/rest/v1/', { method: 'HEAD' });
    const latency = performance.now() - start;
    console.log(`✅ Latence réseau: ${latency.toFixed(0)}ms`);
    
    if (latency < 200) console.log('🟢 EXCELLENT - Réseau rapide');
    else if (latency < 1000) console.log('🟡 MOYEN - Réseau acceptable');
    else console.log('🔴 LENT - Problème réseau/région');
  } catch (e) {
    console.error('❌ Erreur réseau:', e);
  }
})();
```

**Résultat attendu** : < 500ms  
**Si > 2000ms** : Problème de région Supabase

---

## 🧪 Test 2 : Mesurer une Requête Réelle

Coller ce code dans la console (remplacez VOTRE_USER_ID) :

```javascript
// Test d'une vraie requête proformas
(async () => {
  // Récupérer le client Supabase de l'app
  const { createClient } = await import('@supabase/supabase-js');
  
  console.log('⏱️ Test requête proformas...');
  const start = performance.now();
  
  // Cette requête utilise le client global de l'app
  const result = await window.supabase?.from('proformas').select('id, number, total').limit(20);
  
  const duration = performance.now() - start;
  console.log(`Requête terminée en: ${duration.toFixed(0)}ms`);
  console.log('Nombre de résultats:', result?.data?.length || 0);
  
  if (duration < 500) console.log('🟢 RAPIDE');
  else if (duration < 2000) console.log('🟡 MOYEN');
  else console.log('🔴 LENT - Besoin d\'index SQL');
})();
```

---

## 🧪 Test 3 : Vérifier la Taille du localStorage

```javascript
// Mesurer la taille du cache
(() => {
  let total = 0;
  const items = {};
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const size = localStorage[key].length;
      items[key] = (size / 1024).toFixed(1) + ' KB';
      total += size;
    }
  }
  console.log('💾 Taille totale localStorage:', (total / 1024).toFixed(1) + ' KB');
  console.table(items);
  
  if (total > 4 * 1024 * 1024) {
    console.warn('🔴 localStorage TROP GROS (>4MB) - Cause possible de lenteur');
  } else {
    console.log('🟢 localStorage OK');
  }
})();
```

**Important** : Les images (logo, signature, cachet) en base64 peuvent rendre le localStorage énorme !

---

## 📊 Interprétation des Résultats

### Cas 1 : Latence réseau > 2000ms
**Cause** : Région Supabase trop éloignée  
**Solution** : Migrer Supabase vers une région plus proche

### Cas 2 : Requête > 2000ms mais réseau OK
**Cause** : Pas d'index sur la base de données  
**Solution** : Exécuter `supabase-create-indexes.sql`

### Cas 3 : localStorage > 4MB
**Cause** : Trop d'images en cache (logo/signature/cachet en base64)  
**Solution** : Stocker les images dans Supabase Storage au lieu de la base

### Cas 4 : Tout est rapide mais l'app est lente
**Cause** : Problème dans le code (RLS, requêtes multiples)  
**Solution** : Vérifier les policies RLS

---

**Créé par** : Kiro AI Assistant  
**Date** : 31 Mai 2026
