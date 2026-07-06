/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  History as HistoryIcon, 
  FileText, 
  Settings,
  X,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Share2,
  Menu
} from 'lucide-react';
import { format } from 'date-fns';
import { Proforma, ProformaItem, CompanyInfo, ClientInfo, DEFAULT_COMPANY } from './types';
import Login from './Login';
import Register from './Register';
import SupabaseStatus from './components/SupabaseStatus';
import SEO from './components/SEO';
import SettingsModal from './components/SettingsModal';
import HistorySidebar from './components/HistorySidebar';
import A4Preview from './components/A4Preview';
import { supabase } from './lib/supabase';
import { 
  loadCompanySettings, 
  loadCompanyImages,
  loadProformas,
  loadProformaDetails,
  saveProforma as saveProformaToSupabase
} from './lib/supabase-helpers';
import { validateProforma } from './lib/validation';
import { formatValidationErrors } from './lib/errors';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [showRegister, setShowRegister] = useState(false);

  // Vérifier la session Supabase au démarrage
  useEffect(() => {
    // ⚡ Charger les données utilisateur en arrière-plan (NON bloquant)
    // L'interface reste affichée pendant le chargement.
    const loadUserDataInBackground = (userId: string) => {
      console.log('📥 Chargement automatique des données en arrière-plan...');
      setIsLoadingData(true);

      Promise.all([
        loadCompanySettings(userId),
        loadProformas(userId, 20),
      ])
        .then(([settings, proformas]) => {
          if (settings) setCompanyInfo(settings);
          setHistory(proformas);
          console.log('✅ Données chargées:', { hasSettings: !!settings, proformas: proformas.length });
        })
        .catch((loadError) => {
          console.error('❌ Erreur chargement données:', loadError);
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    };

    const checkSession = async () => {
      try {
        // ⚡ PROTECTION: Timeout de 5s pour éviter un blocage si le token est invalide
        // Si getSession() ne répond pas en 5s (token corrompu, réseau lent),
        // on abandonne et on affiche la page de connexion.
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => {
            console.warn('⚠️ getSession() timeout (5s) - affichage page de connexion');
            resolve({ data: { session: null } });
          }, 5000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        setIsAuthenticated(!!session);

        // ⚡ Afficher l'interface IMMÉDIATEMENT (non bloquant)
        setIsCheckingAuth(false);

        if (session?.user) {
          setCurrentUserId(session.user.id);
          // ⚡ Puis charger les données automatiquement en arrière-plan
          loadUserDataInBackground(session.user.id);
        }
      } catch (error) {
        console.error('Erreur session:', error);
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
      }
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth:', event);

      // ⚡ GESTION TOKEN INVALIDE: Si le rafraîchissement du token échoue,
      // nettoyer le cache d'auth corrompu et déconnecter proprement.
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('⚠️ Échec du rafraîchissement du token - nettoyage et déconnexion');
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setCurrentUserId(null);
        return;
      }

      setIsAuthenticated(!!session);

      if (session?.user) {
        setCurrentUserId(session.user.id);
        // ⚡ Charger les données automatiquement après connexion (en arrière-plan)
        if (event === 'SIGNED_IN') {
          loadUserDataInBackground(session.user.id);
        }
      } else {
        setCurrentUserId(null);
        setCompanyInfo(DEFAULT_COMPANY);
        setHistory([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // State - TOUS LES HOOKS DOIVENT ÊTRE ICI, AVANT TOUT RETURN
  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
  };

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_COMPANY);
  
  const [history, setHistory] = useState<Proforma[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [currentId, setCurrentId] = useState<string>(generateId);
  const [docType, setDocType] = useState<'PROFORMA' | 'FACTURE'>('PROFORMA');
  const [client, setClient] = useState<ClientInfo>({ name: '', phone: '' });
  const [items, setItems] = useState<ProformaItem[]>([{ id: '1', description: '', quantity: 1, unitPrice: 0 }]);
  const [proformaNumber, setProformaNumber] = useState<string>('');
  const [proformaDate, setProformaDate] = useState<string>(new Date().toISOString());
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false); // ⚡ Nouveau: indicateur de chargement
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);

  // Derivatives - TOUS LES HOOKS AVANT LE RETURN
  const subtotal = useMemo(() => items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0), [items]);
  const discountAmount = useMemo(() => (subtotal * discountPercent) / 100, [subtotal, discountPercent]);
  const total = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

  // Client autocomplete
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const uniqueClients = useMemo(() => {
    const seen = new Map<string, ClientInfo>();
    history.forEach(p => {
      const key = p.client.name.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, p.client);
    });
    return Array.from(seen.values());
  }, [history]);
  const clientSuggestions = useMemo(() => {
    const q = client.name.trim().toLowerCase();
    if (!q) return uniqueClients.slice(0, 6);
    return uniqueClients.filter(c => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [client.name, uniqueClients]);

  // Initial number generation and updates when history changes or doc type changes
  useEffect(() => {
    if (!viewingHistoryId) {
      const prefix = docType === 'PROFORMA' ? 'PF' : 'FA';
      const year = new Date().getFullYear();
      // Parse existing numbers to find the highest index for this prefix+year
      const maxIndex = history.reduce((max, p) => {
        const match = p.number?.match(new RegExp(`^${prefix}-${year}-(\\d+)$`));
        if (match) return Math.max(max, parseInt(match[1], 10));
        return max;
      }, 0);
      setProformaNumber(`${prefix}-${year}-${(maxIndex + 1).toString().padStart(3, '0')}`);
    }
  }, [history.length, viewingHistoryId, docType]);

  // Reset selected IDs when history is closed
  useEffect(() => {
    if (!showHistory) {
      setSelectedHistoryIds([]);
    }
  }, [showHistory]);

  // Surveiller les changements d'authentification
  useEffect(() => {
    console.log('État d\'authentification changé:', isAuthenticated);
  }, [isAuthenticated]);

  // Raccourcis clavier globaux (productivité Desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModifierPressed = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl + S / Cmd + S : Sauvegarde du document
      if (isModifierPressed && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (client.name && items.some(i => i.description && i.quantity > 0 && i.unitPrice >= 0)) {
          saveProforma();
        }
      }

      // Ctrl + P / Cmd + P : Exportation PDF
      if (isModifierPressed && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleExport({
          id: viewingHistoryId || currentId,
          type: docType,
          number: proformaNumber,
          date: proformaDate,
          client,
          items,
          total,
          discountPercent
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [client, items, viewingHistoryId, currentId, docType, proformaNumber, proformaDate, total, discountPercent]);

  const handleLogin = async (email: string, password: string) => {
    // La connexion est déjà gérée dans Login.tsx
    // On met juste à jour l'état local
    setIsAuthenticated(true);
  };

  const handleRegister = (userData: {
    name: string;
    email: string;
    password: string;
    company: string;
  }) => {
    // L'inscription est déjà gérée dans Register.tsx
    // On met juste à jour l'état local
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      console.log('Déconnexion en cours...');
      // Déconnexion de Supabase
      await supabase.auth.signOut();
      // Mettre à jour l'état
      setIsAuthenticated(false);
      console.log('Déconnexion terminée');
    } catch (e) {
      console.error('Erreur lors de la déconnexion:', e);
    }
  };
  // Afficher un écran de chargement pendant la vérification de la session (max 3 secondes)
  if (isCheckingAuth) {
    return (
      <div className="h-screen bg-gradient-to-br from-app-light-blue/30 via-white to-app-yellow/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-app-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="w-8 h-8 border-4 border-app-navy border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-app-navy font-bold text-sm">Chargement...</p>
          <p className="text-slate-400 text-xs mt-1">Vérification de la session</p>
        </div>
      </div>
    );
  }

  // Si non authentifié, afficher la page de connexion ou d'inscription
  if (!isAuthenticated) {
    console.log('État non authentifié, showRegister:', showRegister);
    if (showRegister) {
      return (
        <>
          <SEO 
            title="Inscription - XorForm"
            description="Créez votre compte XorForm gratuitement pour générer des proformas et factures professionnels"
          />
          <Register onRegister={handleRegister} onBackToLogin={() => setShowRegister(false)} />
          <SupabaseStatus />
        </>
      );
    }
    return (
      <>
        <SEO 
          title="Connexion - XorForm"
          description="Connectez-vous à XorForm pour accéder à votre générateur de proformas et factures"
        />
        <Login onLogin={handleLogin} onShowRegister={() => setShowRegister(true)} />
        <SupabaseStatus />
      </>
    );
  }

  console.log('État authentifié, affichage de l\'application');



  // Effects
  // Actions
  const addItem = (customId?: string) => {
    const id = customId || generateId();
    setItems([...items, { id, description: '', quantity: 1, unitPrice: 0 }]);
    return id;
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, updates: Partial<ProformaItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const saveProforma = async () => {
    if (!client.name || !currentUserId) {
      console.warn('⚠️ Impossible de sauvegarder:', { 
        hasClientName: !!client.name, 
        hasUserId: !!currentUserId,
        currentUserId 
      });
      if (!currentUserId) {
        alert('Erreur: Utilisateur non connecté. Veuillez vous reconnecter.');
      } else {
        alert('Veuillez remplir le nom du client.');
      }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = formatValidationErrors(validation.error.issues as any[]);
      alert(`Erreurs de validation:\n\n${errors}`);
      console.error('Validation errors:', validation.error);
      return;
    }

    console.log('🚀 Appel de saveProformaToSupabase avec:', {
      userId: currentUserId,
      proformaId: validation.data.id
    });

    // Sauvegarder dans Supabase
    const result = await saveProformaToSupabase(currentUserId, validation.data);
    
    if (result.success) {
      console.log('✅ Sauvegarde réussie, mise à jour de l\'état local');
      // Mettre à jour l'état local
      setHistory([validation.data, ...history.filter(p => p.id !== (viewingHistoryId || currentId))]);
      resetForm();
    } else {
      console.error('❌ Échec de la sauvegarde');
      alert(result.error?.userMessage || 'Erreur lors de la sauvegarde du proforma.');
    }
  };

  const resetForm = () => {
    setCurrentId(generateId());
    setClient({ name: '', phone: '' });
    setItems([{ id: '1', description: '', quantity: 1, unitPrice: 0 }]);
    setDiscountPercent(0);
    setViewingHistoryId(null);
    setProformaDate(new Date().toISOString());
    const count = history.length + 1;
    const prefix = docType === 'PROFORMA' ? 'PF' : 'FA';
    setProformaNumber(`${prefix}-${new Date().getFullYear()}-${count.toString().padStart(3, '0')}`);
  };



  // ⚡ Helper: Combiner companyInfo avec les images chargées à la demande pour le PDF
  const getCompanyInfoWithImages = async (): Promise<CompanyInfo> => {
    if (!currentUserId) return companyInfo;
    // Si les images sont déjà présentes, pas besoin de recharger
    if (companyInfo.logo || companyInfo.signature || companyInfo.stamp) {
      return companyInfo;
    }
    const images = await loadCompanyImages(currentUserId);
    if (!images) return companyInfo;
    return {
      ...companyInfo,
      logo: images.logo,
      signature: images.signature,
      stamp: images.stamp,
    };
  };

  /**
   * Retourne un proforma avec ses items chargés.
   * Si les items sont vides (optimisation perf du chargement depuis l'historique),
   * les récupère depuis Supabase. Ne tente PAS Supabase pour les nouvelles saisies.
   */
  const getProformaWithItems = async (p: Proforma): Promise<Proforma> => {
    // Si les items sont présents, pas besoin de charger depuis Supabase
    if (p.items && p.items.length > 0) return p;
    // Si c'est l'ID courant (nouvelle saisie non encore sauvegardée), retourner tel quel
    if (p.id === currentId && !viewingHistoryId) return p;
    // Sinon, c'est un document de l'historique avec items vides → recharger depuis Supabase
    const details = await loadProformaDetails(p.id);
    if (details) {
      // Mettre à jour le cache local pour éviter une double requête
      setHistory(prev => prev.map(h => h.id === p.id ? details : h));
      return details;
    }
    return p;
  };

  const handleExport = async (p: Proforma) => {
    setIsGeneratingPDF(true);
    try {
      // ⚡ LAZY LOADING: jsPDF chargé uniquement à la demande (-417 KB au démarrage)
      const { generatePDF } = await import('./lib/pdf-generator');
      const [companyWithImages, proformaWithItems] = await Promise.all([
        getCompanyInfoWithImages(),
        getProformaWithItems(p)
      ]);
      await generatePDF(proformaWithItems, companyWithImages);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleWhatsApp = (p: Proforma) => {
    const text = `Bonjour ${(p.client.name || 'Client').toUpperCase()},\n\nVoici votre ${p.type === 'PROFORMA' ? 'devis' : 'facture'} N° ${p.number} d'un montant de ${p.total.toLocaleString()} FCFA.\n\nCordialement, ${companyInfo.name}.`;
    const encodedText = encodeURIComponent(text);
    const phone = client.phone.replace(/\D/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handleShare = async (p: Proforma) => {
    setIsGeneratingPDF(true);
    try {
      // ⚡ LAZY LOADING: jsPDF chargé uniquement à la demande
      const { generatePDF, getPDFBlob } = await import('./lib/pdf-generator');
      const [companyWithImages, proformaWithItems] = await Promise.all([
        getCompanyInfoWithImages(),
        getProformaWithItems(p)
      ]);
      const blob = await getPDFBlob(proformaWithItems, companyWithImages);
      const filename = `${proformaWithItems.type.toLowerCase()}-${proformaWithItems.number}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${proformaWithItems.type} ${proformaWithItems.number}`,
          text: `Voici votre ${proformaWithItems.type.toLowerCase()} N° ${proformaWithItems.number}`
        });
      } else {
        // Fallback for browsers that don't support file sharing
        await generatePDF(proformaWithItems, companyWithImages);
        alert("Le partage de fichiers n'est pas supporté par votre navigateur. Le fichier a été téléchargé.");
      }
    } catch (error) {
      console.error('Error sharing:', error);
      await handleExport(p);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const loadFromHistory = async (p: Proforma) => {
    // Si les items ne sont pas chargés (optimisation perf au chargement),
    // on les récupère depuis Supabase avant de remplir le formulaire.
    let proformaToLoad = p;
    if (!p.items || p.items.length === 0) {
      const details = await loadProformaDetails(p.id);
      if (details) {
        proformaToLoad = details;
        // Mettre à jour l'entrée dans l'historique local pour éviter de refaire la requête
        setHistory(prev => prev.map(h => h.id === p.id ? details : h));
      }
    }

    setViewingHistoryId(proformaToLoad.id);
    setDocType(proformaToLoad.type || 'PROFORMA');
    setClient(proformaToLoad.client);
    setItems(proformaToLoad.items);
    setDiscountPercent(proformaToLoad.discountPercent || 0);
    setProformaNumber(proformaToLoad.number);
    setProformaDate(new Date(proformaToLoad.date).toISOString());
    setShowHistory(false);
  };

  return (
    <>
    <SEO 
      title="XorForm - Générateur de Proforma et Factures Professionnel"
      description="Créez des proformas et factures professionnels en quelques clics. Solution gratuite, intuitive et sécurisée pour gérer vos devis et facturations."
    />

    <div className="h-screen bg-background text-foreground font-sans flex flex-col overflow-hidden">
      
      {/* Barre de navigation supérieure minimaliste */}
      <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 shrink-0 z-30 relative">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm">
            X
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-black text-lg tracking-tight text-primary">XorForm</span>
            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-widest hidden sm:inline">Edition Personnelle</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Menu bureau (Masqué sur mobile) */}
          <div className="hidden md:flex items-center gap-2">
            {/* Bouton Historique épuré */}
            <button 
              onClick={async () => {
                setShowHistory(true);
                if (currentUserId && history.length === 0) {
                  console.log('📥 Chargement historique à la demande...');
                  setIsLoadingData(true);
                  const proformas = await loadProformas(currentUserId, 20);
                  setHistory(proformas);
                  setIsLoadingData(false);
                  console.log('✅ Historique chargé:', proformas.length);
                }
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-primary hover:bg-slate-50 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
            >
              <HistoryIcon size={14} />
              <span>Historique</span>
              {history.length > 0 && (
                <span className="bg-primary text-white text-[9px] px-2 py-0.5 rounded-full font-black">
                  {history.length}
                </span>
              )}
            </button>
            
            <div className="w-px h-5 bg-border mx-1" />

            {/* Bouton Paramètres */}
            <button 
              onClick={async () => {
                setShowSettings(true);
                if (currentUserId) {
                  console.log('📥 Chargement paramètres + images...');
                  const [settings, images] = await Promise.all([
                    companyInfo.name === DEFAULT_COMPANY.name
                      ? loadCompanySettings(currentUserId)
                      : Promise.resolve(null),
                    (!companyInfo.logo && !companyInfo.signature && !companyInfo.stamp)
                      ? loadCompanyImages(currentUserId)
                      : Promise.resolve(null),
                  ]);

                  setCompanyInfo((prev) => {
                    const base = settings ? { ...prev, ...settings } : { ...prev };
                    if (images) {
                      base.logo = images.logo;
                      base.signature = images.signature;
                      base.stamp = images.stamp;
                    }
                    return base;
                  });
                  console.log('✅ Paramètres et images chargés');
                }
              }}
              className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              title="Paramètres"
            >
              <Settings size={16} />
            </button>
            
            <div className="w-px h-5 bg-border mx-1" />
            
            {/* Bouton Déconnexion */}
            <button 
              onClick={handleLogout}
              className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50/50 rounded-xl transition-all uppercase tracking-widest cursor-pointer"
              title="Déconnexion"
            >
              Déconnexion
            </button>

            <div className="w-px h-5 bg-border mx-1" />
          </div>
          
          {/* Bouton de génération de PDF vert émeraude (Toujours visible pour accessibilité rapide) */}
          <button 
            onClick={() => handleExport({
              id: viewingHistoryId || currentId,
              type: docType,
              number: proformaNumber,
              date: proformaDate,
              client,
              items,
              total,
              discountPercent
            })}
            disabled={isGeneratingPDF}
            className="bg-accent hover:bg-accent/95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-widest shadow-sm"
          >
            {isGeneratingPDF ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="hidden xs:inline">Génération...</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span className="hidden xs:inline">Exporter PDF</span>
              </>
            )}
          </button>

          {/* Bouton Hamburger mobile (Masqué sur bureau) */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-500 hover:text-primary hover:bg-slate-50 rounded-xl transition-all md:hidden cursor-pointer"
            title="Menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Tiroir Mobile Déroulant (Menu Hamburger) */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-border shadow-md py-4 px-6 flex flex-col gap-4 animate-fade-in-down md:hidden z-30">
            <button 
              onClick={async () => {
                setIsMobileMenuOpen(false);
                setShowHistory(true);
                if (currentUserId && history.length === 0) {
                  setIsLoadingData(true);
                  const proformas = await loadProformas(currentUserId, 20);
                  setHistory(proformas);
                  setIsLoadingData(false);
                }
              }}
              className="flex items-center justify-between py-2 text-sm font-bold text-slate-600 hover:text-primary transition-colors cursor-pointer uppercase tracking-wider text-left"
            >
              <span className="flex items-center gap-3">
                <HistoryIcon size={16} />
                Historique
              </span>
              {history.length > 0 && (
                <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                  {history.length}
                </span>
              )}
            </button>

            <button 
              onClick={async () => {
                setIsMobileMenuOpen(false);
                setShowSettings(true);
                if (currentUserId) {
                  const [settings, images] = await Promise.all([
                    companyInfo.name === DEFAULT_COMPANY.name ? loadCompanySettings(currentUserId) : Promise.resolve(null),
                    (!companyInfo.logo && !companyInfo.signature && !companyInfo.stamp) ? loadCompanyImages(currentUserId) : Promise.resolve(null),
                  ]);
                  setCompanyInfo((prev) => {
                    const base = settings ? { ...prev, ...settings } : { ...prev };
                    if (images) {
                      base.logo = images.logo;
                      base.signature = images.signature;
                      base.stamp = images.stamp;
                    }
                    return base;
                  });
                }
              }}
              className="flex items-center gap-3 py-2 text-sm font-bold text-slate-600 hover:text-primary transition-colors cursor-pointer uppercase tracking-wider text-left"
            >
              <Settings size={16} />
              Paramètres Entreprise
            </button>

            <div className="h-px bg-border my-1" />

            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50/50 rounded-xl transition-all cursor-pointer uppercase tracking-wider text-left"
            >
              Déconnexion
            </button>
          </div>
        )}
      </header>


      <main className="flex flex-1 overflow-hidden relative flex-col lg:flex-row">
        {/* Sélecteur mobile minimaliste */}
        <div className="flex lg:hidden bg-slate-50 p-1 shrink-0 border-b border-border">
          <button 
            onClick={() => setMobileView('editor')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all tracking-widest ${mobileView === 'editor' ? 'bg-white text-primary shadow-sm border border-border' : 'text-slate-400'}`}
          >
            ÉDITEUR
          </button>
          <button 
            onClick={() => setMobileView('preview')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all tracking-widest ${mobileView === 'preview' ? 'bg-white text-primary shadow-sm border border-border' : 'text-slate-400'}`}
          >
            APERÇU
          </button>
        </div>

        {/* Editor Pane (Left) */}
        <section className={`w-full lg:w-[450px] bg-white border-r border-border flex flex-col shrink-0 overflow-y-auto ${mobileView === 'editor' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-4 md:p-6 space-y-6 flex-1">

            {/* Sélecteur de type de document minimaliste */}
            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex gap-1.5 border border-border">
              <button 
                onClick={() => setDocType('PROFORMA')}
                className={`flex-1 py-2.5 text-[9px] font-black rounded-xl transition-all tracking-widest cursor-pointer ${docType === 'PROFORMA' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-primary hover:bg-slate-200/50'}`}
              >
                PROFORMA
              </button>
              <button 
                onClick={() => setDocType('FACTURE')}
                className={`flex-1 py-2.5 text-[9px] font-black rounded-xl transition-all tracking-widest cursor-pointer ${docType === 'FACTURE' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-primary hover:bg-slate-200/50'}`}
              >
                FACTURE
              </button>
            </div>

            {/* Détails du Client */}
            <div className="space-y-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={13} />
                Détails du Client
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Identifiant */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Identifiant</label>
                    <input 
                      type="text" 
                      value={proformaNumber} 
                      readOnly 
                      className="w-full bg-slate-50 border border-border rounded-xl px-3.5 py-2.5 text-xs text-slate-500 font-mono focus:outline-none"
                    />
                  </div>
                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={format(new Date(proformaDate), 'dd MMM yyyy')} 
                        readOnly 
                        className="w-full bg-slate-50 border border-border rounded-xl px-3.5 py-2.5 text-xs text-slate-500 focus:outline-none"
                      />
                      <Calendar size={13} className="absolute right-3.5 top-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Nom du Client */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom du Client</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Studio Horizon Digital"
                      value={client.name}
                      onChange={e => { 
                        setClient({...client, name: e.target.value}); 
                        setShowClientSuggestions(true);
                        setActiveSuggestionIndex(-1);
                      }}
                      onFocus={() => {
                        setShowClientSuggestions(true);
                        setActiveSuggestionIndex(-1);
                      }}
                      onBlur={() => setTimeout(() => {
                        setShowClientSuggestions(false);
                        setActiveSuggestionIndex(-1);
                      }, 150)}
                      onKeyDown={e => {
                        if (showClientSuggestions && clientSuggestions.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setActiveSuggestionIndex(prev => 
                              prev < clientSuggestions.length - 1 ? prev + 1 : prev
                            );
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
                          } else if (e.key === 'Enter') {
                            if (activeSuggestionIndex >= 0 && activeSuggestionIndex < clientSuggestions.length) {
                              e.preventDefault();
                              const selected = clientSuggestions[activeSuggestionIndex];
                              setClient({ name: selected.name, phone: selected.phone || '' });
                              setShowClientSuggestions(false);
                              setActiveSuggestionIndex(-1);
                            }
                          }
                        }
                      }}
                      className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                    {showClientSuggestions && clientSuggestions.length > 0 && (
                      <ul className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-border rounded-2xl shadow-lg overflow-hidden">
                        {clientSuggestions.map((c, idx) => (
                          <li
                            key={idx}
                            onMouseDown={() => { 
                              setClient({ name: c.name, phone: c.phone || '' }); 
                              setShowClientSuggestions(false); 
                              setActiveSuggestionIndex(-1);
                            }}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              idx === activeSuggestionIndex 
                                ? 'bg-slate-100 text-primary font-bold' 
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-xs font-bold text-foreground truncate">{c.name}</span>
                            {c.phone && <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{c.phone}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Téléphone */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</label>
                  <input 
                    type="text" 
                    placeholder="+33 6 12 34 56 78"
                    value={client.phone}
                    onChange={e => setClient({...client, phone: e.target.value})}
                    className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Services / Produits */}
            <div className="pt-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={13} />
                  Services / Produits
                </h3>
                <button 
                  onClick={addItem}
                  className="text-primary text-[10px] font-black hover:text-secondary flex items-center gap-1.5 transition-colors cursor-pointer uppercase tracking-widest py-2 px-3 hover:bg-slate-50 rounded-xl -my-2 -mx-3"
                >
                  <Plus size={11} />
                  Ajouter ligne
                </button>
              </div>
              
              <div className="space-y-3">
                {items.map((item) => (
                  <div 
                    key={item.id}
                    className="grid grid-cols-12 gap-2.5 group item-row-enter items-center"
                  >
                    <div className="col-span-6">
                      <input 
                        type="text" 
                        id={`desc-input-${item.id}`}
                        placeholder="Description du produit/service..."
                        value={item.description}
                        onChange={e => updateItem(item.id, { description: e.target.value })}
                        className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                      />
                    </div>
                    <div className="col-span-2">
                      <input 
                        type="number" 
                        min="1"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={item.quantity}
                        onChange={e => updateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full bg-white border border-border rounded-xl px-2 py-2 text-xs text-center focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold"
                      />
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center border border-border rounded-xl bg-white overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                        <input 
                          type="number" 
                          min="0"
                          inputMode="decimal"
                          placeholder="0"
                          value={item.unitPrice || ''}
                          onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const isLastItem = items[items.length - 1].id === item.id;
                              if (isLastItem) {
                                const newId = generateId();
                                addItem(newId);
                                setTimeout(() => {
                                  const nextInput = document.getElementById(`desc-input-${newId}`);
                                  if (nextInput) nextInput.focus();
                                }, 50);
                              } else {
                                const currentIndex = items.findIndex(i => i.id === item.id);
                                const nextItem = items[currentIndex + 1];
                                if (nextItem) {
                                  const nextInput = document.getElementById(`desc-input-${nextItem.id}`);
                                  if (nextInput) nextInput.focus();
                                }
                              }
                            }
                          }}
                          className="w-full px-2 py-2 text-xs text-right outline-none font-bold bg-transparent"
                        />
                        <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-2.5 border-l border-border shrink-0 select-none uppercase tracking-wider">F</span>
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-destructive cursor-pointer transition-colors p-3 -m-3 rounded-lg"
                        title="Supprimer la ligne"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Réduction */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Réduction (%)</label>
                <div className="flex items-center gap-3">
                  {discountAmount > 0 && (
                    <span className="text-[10px] font-black text-slate-400">-{discountAmount.toLocaleString()} F CFA</span>
                  )}
                  <input 
                    type="number" 
                    value={discountPercent || ''}
                    inputMode="decimal"
                    onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-20 bg-white border border-border rounded-xl px-3 py-2 text-right text-xs focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer de l'éditeur */}
          <div className="p-6 bg-slate-50 border-t border-border shrink-0">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Général</span>
              <span className="text-2xl font-black text-primary tracking-tight">{total.toLocaleString()} F CFA</span>
            </div>
            <div>
              <button 
                onClick={saveProforma}
                disabled={!client.name || total === 0}
                className="w-full bg-primary hover:bg-primary/95 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm flex items-center justify-center"
              >
                {viewingHistoryId ? 'Mettre à jour' : 'Sauvegarder'}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest mt-3.5 text-center">Sauvegarde Cloud Sécurisée</p>
          </div>
        </section>

        {/* Panneau d'Aperçu (Droite) - Rendu Premium A4 */}
        <A4Preview 
          companyInfo={companyInfo}
          docType={docType}
          proformaDate={proformaDate}
          proformaNumber={proformaNumber}
          client={client}
          items={items}
          subtotal={subtotal}
          discountPercent={discountPercent}
          discountAmount={discountAmount}
          total={total}
          mobileView={mobileView}
        />
      </main>
    </div>

    {/* Historique latéral */}
    <HistorySidebar 
      isOpen={showHistory}
      onClose={() => setShowHistory(false)}
      history={history}
      setHistory={setHistory}
      selectedHistoryIds={selectedHistoryIds}
      setSelectedHistoryIds={setSelectedHistoryIds}
      onLoadFromHistory={loadFromHistory}
      currentUserId={currentUserId}
      isLoadingData={isLoadingData}
      setIsLoadingData={setIsLoadingData}
      docType={docType}
      resetForm={resetForm}
      onWhatsApp={handleWhatsApp}
      onShare={handleShare}
      onExport={handleExport}
    />

    {/* Paramètres entreprise */}
    <SettingsModal 
      isOpen={showSettings}
      onClose={() => setShowSettings(false)}
      companyInfo={companyInfo}
      setCompanyInfo={setCompanyInfo}
      currentUserId={currentUserId}
    />

    {/* Mobile Totals Bar */}
    <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border flex items-center justify-between z-30 shadow-[0_-10px_20px_rgba(10,31,44,0.05)]">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-black text-primary">{total.toLocaleString()} FCFA</p>
          {discountPercent > 0 && <span className="text-[10px] text-destructive font-bold">-{discountAmount.toLocaleString()}</span>}
        </div>
      </div>
      <button 
        onClick={saveProforma}
        disabled={!client.name || total === 0}
        className="px-6 py-2.5 bg-accent text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-accent/10 disabled:opacity-30 transition-all active:scale-95 cursor-pointer"
      >
        {viewingHistoryId ? 'MÀJ' : 'Enregistrer'}
      </button>
    </div>
    <SupabaseStatus />
    </>
  );
}
