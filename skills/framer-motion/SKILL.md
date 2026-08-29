---
name: framer-motion
description: Guidelines, patterns, and best practices for building 60fps smooth animations in React applications using Framer Motion (tab switches, staggered lists, hover/tap micro-interactions, modal overlays).
---

# Framer Motion Integration & Animation Standards

Ce document répertorie les bonnes pratiques, patterns de code et règles de performance pour intégrer des animations fluides (60 FPS) avec **Framer Motion** dans des projets React.

---

## 1. Principes Fondamentaux

- **Animations basées sur le GPU** : Privilégier les propriétés CSS `opacity` et `transform` (`scale`, `translate3d`, `rotate`) pour garantir 60 FPS sans causer de reflow layout.
- **AnimatePresence pour les sorties** : Utiliser `<AnimatePresence mode="wait">` lors du démontage de composants ou du changement d'onglets pour assurer des transitions d'entrée/sortie sans saccades.
- **Micro-interactions au survol** : Ajouter `whileHover` et `whileTap` sur les boutons et cartes pour une réactivité tactile haut de gamme.

---

## 2. Patterns d'Animation Réutilisables

### Pattern 1 : Transitions d'Onglets Fluides (Tab Switch)

Permet de basculer dynamiquement entre différents contenus d'onglets sans coupure visuelle.

```jsx
import { motion, AnimatePresence } from 'framer-motion';

export function TabContainer({ activeTab, children }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

### Pattern 2 : Apparition Échelonnée de Listes (Staggered Children)

Parfait pour les grilles de projets, compétences, timelines ou cartes.

```jsx
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Délai entre chaque enfant
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
};

export function AnimatedList({ items }) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid">
      {items.map((item, index) => (
        <motion.div key={index} variants={itemVariants} className="card">
          {item.content}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

---

### Pattern 3 : Micro-Interactions au Survol (Hover & Tap)

À appliquer systématiquement sur les boutons et cartes interactives.

```jsx
<motion.button
  whileHover={{ scale: 1.04, y: -2 }}
  whileTap={{ scale: 0.96 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
  className="btn-purple"
>
  Me Contacter
</motion.button>
```

---

### Pattern 4 : Modales & Surimpressions (Overlays & Dialogs)

```jsx
import { motion } from 'framer-motion';

export function ModalOverlay({ onClose, children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="modal-backdrop"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-content"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
```

---

## 3. Recommandations de Performance

1. **Ne pas animer la largeur (`width`) ou la hauteur (`height`)** en direct : Utiliser `scaleX` / `scaleY` ou `layout` prop de Framer Motion (`<motion.div layout>`).
2. **Propriété `will-change`** : Pour les listes denses, appliquer `style={{ willChange: 'transform, opacity' }}` si nécessaire.
3. **Accessibilité (`prefers-reduced-motion`)** :
   ```jsx
   import { useReducedMotion } from 'framer-motion';
   const shouldReduceMotion = useReducedMotion();
   ```
