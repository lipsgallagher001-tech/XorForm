/**
 * Outil de diagnostic de performance
 * Mesure les temps de chargement pour identifier les goulots d'étranglement
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();

  /**
   * Démarrer un timer
   */
  start(name: string): void {
    this.timers.set(name, performance.now());
    console.log(`⏱️ [PERF] Début: ${name}`);
  }

  /**
   * Arrêter un timer et enregistrer la métrique
   */
  end(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`⚠️ [PERF] Timer "${name}" non trouvé`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    this.timers.delete(name);

    // Afficher avec code couleur selon la durée
    if (duration < 100) {
      console.log(`✅ [PERF] ${name}: ${duration.toFixed(2)}ms (rapide)`);
    } else if (duration < 500) {
      console.log(`⚠️ [PERF] ${name}: ${duration.toFixed(2)}ms (moyen)`);
    } else {
      console.log(`❌ [PERF] ${name}: ${duration.toFixed(2)}ms (LENT)`);
    }

    return duration;
  }

  /**
   * Obtenir toutes les métriques
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Afficher un rapport de performance
   */
  report(): void {
    console.log('\n📊 ===== RAPPORT DE PERFORMANCE =====\n');

    if (this.metrics.length === 0) {
      console.log('Aucune métrique enregistrée');
      return;
    }

    // Trier par durée (du plus lent au plus rapide)
    const sorted = [...this.metrics].sort((a, b) => b.duration - a.duration);

    console.table(
      sorted.map(m => ({
        'Opération': m.name,
        'Durée (ms)': m.duration.toFixed(2),
        'État': m.duration < 100 ? '✅ Rapide' : m.duration < 500 ? '⚠️ Moyen' : '❌ LENT',
      }))
    );

    const total = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    console.log(`\n⏱️ Temps total: ${total.toFixed(2)}ms`);
    console.log(`📊 Nombre d'opérations: ${this.metrics.length}`);
    console.log(`📈 Moyenne: ${(total / this.metrics.length).toFixed(2)}ms\n`);

    // Identifier les goulots d'étranglement
    const bottlenecks = sorted.filter(m => m.duration > 500);
    if (bottlenecks.length > 0) {
      console.log('🔴 GOULOTS D\'ÉTRANGLEMENT DÉTECTÉS:');
      bottlenecks.forEach(m => {
        console.log(`   - ${m.name}: ${m.duration.toFixed(2)}ms`);
      });
      console.log('');
    }
  }

  /**
   * Réinitialiser toutes les métriques
   */
  reset(): void {
    this.metrics = [];
    this.timers.clear();
    console.log('🔄 [PERF] Métriques réinitialisées');
  }

  /**
   * Mesurer une fonction async
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }
}

// Instance globale
export const perfMonitor = new PerformanceMonitor();

// Exposer dans window pour accès depuis la console
if (typeof window !== 'undefined') {
  (window as any).perfMonitor = perfMonitor;
}

/**
 * Mesurer la taille du localStorage
 */
export function measureLocalStorageSize(): { total: number; byKey: Record<string, number> } {
  const byKey: Record<string, number> = {};
  let total = 0;

  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const size = localStorage[key].length;
      byKey[key] = size;
      total += size;
    }
  }

  return { total, byKey };
}

/**
 * Afficher les statistiques du localStorage
 */
export function logLocalStorageStats(): void {
  const { total, byKey } = measureLocalStorageSize();

  console.log('\n💾 ===== STATISTIQUES LOCALSTORAGE =====\n');
  console.log(`📊 Taille totale: ${(total / 1024).toFixed(2)} KB`);
  console.log(`📦 Nombre de clés: ${Object.keys(byKey).length}\n`);

  // Trier par taille
  const sorted = Object.entries(byKey)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Top 10

  console.log('🔝 Top 10 des clés les plus volumineuses:');
  sorted.forEach(([key, size]) => {
    const sizeKB = (size / 1024).toFixed(2);
    console.log(`   ${key}: ${sizeKB} KB`);
  });
  console.log('');

  // Avertissement si trop gros
  if (total > 5 * 1024 * 1024) {
    console.warn('⚠️ ATTENTION: localStorage > 5 MB, risque de ralentissement');
  }
}

/**
 * Mesurer la latence réseau vers Supabase
 */
export async function measureNetworkLatency(supabaseUrl: string): Promise<number> {
  const start = performance.now();
  try {
    await fetch(supabaseUrl, { method: 'HEAD' });
    const latency = performance.now() - start;
    console.log(`🌐 Latence réseau Supabase: ${latency.toFixed(2)}ms`);
    return latency;
  } catch (error) {
    console.error('❌ Erreur mesure latence:', error);
    return -1;
  }
}

/**
 * Diagnostic complet de performance
 */
export async function runPerformanceDiagnostic(supabaseUrl?: string): Promise<void> {
  console.log('\n🔍 ===== DIAGNOSTIC DE PERFORMANCE =====\n');

  // 1. Métriques de chargement
  perfMonitor.report();

  // 2. localStorage
  logLocalStorageStats();

  // 3. Latence réseau
  if (supabaseUrl) {
    await measureNetworkLatency(supabaseUrl);
  }

  // 4. Informations navigateur
  console.log('\n🌐 ===== INFORMATIONS NAVIGATEUR =====\n');
  console.log(`Navigateur: ${navigator.userAgent}`);
  console.log(`Connexion: ${(navigator as any).connection?.effectiveType || 'Inconnue'}`);
  console.log(`Online: ${navigator.onLine ? '✅' : '❌'}`);
  console.log('');
}
