/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Menu,
  FilePlus,
  Sparkles,
  User,
  Phone,
  Hash,
  Layers,
  LogOut,
  ChevronRight,
  Pencil,
  MapPin,
  PackageOpen
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
import ToastContainer, { ToastMessage, ToastType } from './components/Toast';
import ItemModal from './components/ItemModal';
import { supabase } from './lib/supabase';
import { 
  loadCompanySettings, 
  loadCompanyImages,
  loadProformas,
  loadProformaDetails,
  saveProforma as saveProformaToSupabase,
  saveCompanySettings
} from './lib/supabase-helpers';
import { optimizeImageClient } from './lib/image-optimizer';
import { validateProforma } from './lib/validation';
import { formatValidationErrors } from './lib/errors';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [showRegister, setShowRegister] = useState(false);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message, title }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

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

          // ⚡ Précharger les images de l'entreprise (logo, signature, cachet) en arrière-plan
          // avec auto-optimisation transparente si les images stockées sont trop lourdes
          loadCompanyImages(userId).then(async (images) => {
            if (images && settings) {
              let logo = images.logo;
              let signature = images.signature;
              let stamp = images.stamp;
              let needsUpdate = false;


              if (logo && logo.length > 200000) {
                try {
                  console.log('⚡ Auto-optimisation du logo lourd (> 150 Ko) en arrière-plan...');
                  const opt = await optimizeImageClient(logo, 800, 800, 0.8);
                  logo = opt.data;
                  needsUpdate = true;
                } catch (e) {
                  console.warn('Échec auto-optimisation logo:', e);
                }
              }

              if (signature && signature.length > 150000) {
                try {
                  console.log('⚡ Auto-optimisation de la signature lourde (> 110 Ko) en arrière-plan...');
                  const opt = await optimizeImageClient(signature, 400, 400, 0.8);
                  signature = opt.data;
                  needsUpdate = true;
                } catch (e) {
                  console.warn('Échec auto-optimisation signature:', e);
                }
              }

              if (stamp && stamp.length > 150000) {
                try {
                  console.log('⚡ Auto-optimisation du cachet lourd (> 110 Ko) en arrière-plan...');
                  const opt = await optimizeImageClient(stamp, 400, 400, 0.8);
                  stamp = opt.data;
                  needsUpdate = true;
                } catch (e) {
                  console.warn('Échec auto-optimisation cachet:', e);
                }
              }

              const updatedSettings = {
                ...settings,
                logo,
                signature,
                stamp
              };

              setCompanyInfo(updatedSettings);
              console.log('✅ Images de l\'entreprise préchargées et nettoyées');

              if (needsUpdate) {
                console.log('💾 Sauvegarde en base de données des images optimisées...');
                await saveCompanySettings(userId, updatedSettings);
                console.log('✅ Images optimisées sauvegardées en base de données');
              }
            }
          }).catch(err => console.warn('Erreur préchargement images:', err));
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
  const [items, setItems] = useState<ProformaItem[]>([]);
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

  // Modale d'ajout / modification d'articles et prestations
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProformaItem | null>(null);

  const handleOpenAddItemModal = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItemModal = (item: ProformaItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleSaveItemFromModal = (itemData: Omit<ProformaItem, 'id'>, editId?: string) => {
    if (editId) {
      setItems(prev => prev.map(i => i.id === editId ? { ...i, ...itemData } : i));
      addToast('success', 'Prestation mise à jour.', 'Modification enregistrée');
    } else {
      const newId = generateId();
      setItems(prev => [...prev, { id: newId, ...itemData }]);
      addToast('success', `"${itemData.description}" a été ajouté.`, 'Article ajouté');
    }
  };

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

  // Précharger le générateur de PDF (jsPDF) en arrière-plan dès la connexion
  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        console.log('⚡ Préchargement du générateur de PDF en arrière-plan...');
        import('./lib/pdf-generator').catch(err => 
          console.warn('Erreur préchargement PDF:', err)
        );
      }, 2000);
      return () => clearTimeout(timer);
    }
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
  const addItem = (customId?: unknown) => {
    const id = typeof customId === 'string' ? customId : generateId();
    setItems(prev => [...prev, { id, description: '', quantity: 1, unitPrice: 0 }]);
    return id;
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    addToast('info', 'Prestation retirée du document.', 'Ligne supprimée');
  };

  const updateItem = (id: string, updates: Partial<ProformaItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const saveProforma = async () => {
    if (items.length === 0) {
      addToast('error', 'Veuillez ajouter au moins un article ou une prestation avant d\'enregistrer.', 'Document vide');
      return;
    }

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
    
    const sanitizedItems = items.map((item, index) => ({
      ...item,
      id: typeof item.id === 'string' && item.id ? item.id : `item-${Date.now()}-${index}`
    }));

    const proformaData = {
      id: viewingHistoryId || currentId,
      type: docType,
      number: proformaNumber,
      date: proformaDate,
      client,
      items: sanitizedItems,
      discountPercent,
      total
    };

    // ✅ VALIDATION
    const validation = validateProforma(proformaData);
    if (!validation.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = formatValidationErrors(validation.error.issues as any[]);
      addToast('error', errors, 'Erreurs de validation');
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
      addToast('success', viewingHistoryId ? 'Document mis à jour avec succès !' : 'Nouveau document sauvegardé dans le Cloud.', 'Sauvegarde réussie');
      resetForm();
    } else {
      console.error('❌ Échec de la sauvegarde');
      addToast('error', result.error?.userMessage || 'Erreur lors de la sauvegarde du proforma.', 'Échec de la sauvegarde');
    }
  };

  const resetForm = () => {
    setCurrentId(generateId());
    setClient({ name: '', phone: '' });
    setItems([]);
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
      addToast('success', `PDF ${proformaWithItems.number} téléchargé avec succès.`, 'Export PDF réussi');
    } catch (error) {
      console.error('Error generating PDF:', error);
      addToast('error', 'Erreur lors de la génération du PDF. Veuillez réessayer.', 'Échec de l\'export');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleWhatsApp = (p: Proforma) => {
    const acompteMention = p.type === 'PROFORMA' ? ` (Acompte 70% : ${Math.round(p.total * 0.70).toLocaleString()} FCFA)` : '';
    const text = `Bonjour ${(p.client.name || 'Client').toUpperCase()},\n\nVoici votre ${p.type === 'PROFORMA' ? 'devis' : 'facture'} N° ${p.number} d'un montant de ${p.total.toLocaleString()} FCFA.${acompteMention}\n\nCordialement, ${companyInfo.name}.`;
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
        addToast('info', "Le partage de fichiers direct n'est pas supporté par votre navigateur. Le fichier a été téléchargé.", 'Téléchargement PDF');
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

    <div className="h-screen bg-slate-50/50 text-foreground font-sans flex flex-col overflow-hidden">
      
      {/* ── BARRE DE NAVIGATION SUPÉRIEURE ULTRA-MODERNE ── */}
      <header className="h-16 glass-header border-b border-border/80 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 relative shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-950 text-white flex items-center justify-center font-black text-sm tracking-tighter shadow-md ring-1 ring-white/20">
            X
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900">XorForm</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {docType === 'PROFORMA' ? 'Devis Pro-forma' : 'Facture Officielle'}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium hidden md:inline">
              Édition & Facturation Professionnelle
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nouveau Document Button */}
          <button
            onClick={() => {
              resetForm();
              addToast('info', 'Formulaire réinitialisé pour un nouveau document.', 'Nouveau document');
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Créer un nouveau document vierge"
          >
            <FilePlus size={15} className="text-secondary" />
            <span className="hidden sm:inline">Nouveau</span>
          </button>

          {/* Bouton Historique */}
          <button 
            onClick={async () => {
              setShowHistory(true);
              if (currentUserId && history.length === 0) {
                setIsLoadingData(true);
                const proformas = await loadProformas(currentUserId, 20);
                setHistory(proformas);
                setIsLoadingData(false);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer relative"
          >
            <HistoryIcon size={15} />
            <span className="hidden sm:inline">Historique</span>
            {history.length > 0 && (
              <span className="bg-secondary text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {history.length}
              </span>
            )}
          </button>

          {/* Bouton Paramètres */}
          <button 
            onClick={async () => {
              setShowSettings(true);
              if (currentUserId) {
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
              }
            }}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Paramètres de l'entreprise"
          >
            <Settings size={17} />
          </button>

          <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

          {/* Bouton Exporter PDF */}
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
            disabled={isGeneratingPDF || items.length === 0}
            className="bg-primary hover:bg-slate-800 active:scale-[0.98] text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            {isGeneratingPDF ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="hidden xs:inline">Génération...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Exporter PDF</span>
              </>
            )}
          </button>

          {/* Bouton Déconnexion (Desktop) */}
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-destructive hover:bg-red-50/80 rounded-xl transition-all cursor-pointer hidden md:flex items-center"
            title="Déconnexion"
          >
            <LogOut size={16} />
          </button>

          {/* Bouton Hamburger mobile */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-xl transition-all md:hidden cursor-pointer"
            title="Menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Tiroir Mobile Déroulant (Menu Hamburger) */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-border shadow-xl py-4 px-6 flex flex-col gap-3 animate-fade-in-down md:hidden z-30">
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
              className="flex items-center justify-between py-2.5 text-xs font-bold text-slate-700 hover:text-primary transition-colors cursor-pointer uppercase tracking-wider"
            >
              <span className="flex items-center gap-3">
                <HistoryIcon size={16} />
                Historique des documents
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
              className="flex items-center gap-3 py-2.5 text-xs font-bold text-slate-700 hover:text-primary transition-colors cursor-pointer uppercase tracking-wider"
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
              className="flex items-center gap-3 py-2.5 text-xs font-bold text-destructive hover:bg-red-50/50 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
            >
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        )}
      </header>


      <main className="flex flex-1 overflow-hidden relative flex-col lg:flex-row">
        {/* Sélecteur mobile épuré */}
        <div className="flex lg:hidden bg-white p-1.5 shrink-0 border-b border-border shadow-xs">
          <button 
            onClick={() => setMobileView('editor')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all tracking-wider ${mobileView === 'editor' ? 'bg-slate-100 text-slate-900 shadow-xs' : 'text-slate-400'}`}
          >
            ÉDITEUR
          </button>
          <button 
            onClick={() => setMobileView('preview')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all tracking-wider ${mobileView === 'preview' ? 'bg-slate-100 text-slate-900 shadow-xs' : 'text-slate-400'}`}
          >
            APERÇU A4
          </button>
        </div>

        {/* ── PANNEAU ÉDITEUR (GAUCHE) ── */}
        <section className={`w-full lg:w-[480px] bg-slate-50/60 border-r border-border flex flex-col shrink-0 overflow-y-auto ${mobileView === 'editor' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-4 sm:p-6 space-y-5 flex-1">

            {/* Sélecteur de type de document (Pill Segmenté) */}
            <div className="bg-slate-200/60 p-1 rounded-xl flex gap-1 border border-slate-200">
              <button 
                onClick={() => setDocType('PROFORMA')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer tracking-wide flex items-center justify-center gap-1.5 ${
                  docType === 'PROFORMA' 
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5 font-extrabold' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>Devis Pro-forma</span>
              </button>
              <button 
                onClick={() => setDocType('FACTURE')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer tracking-wide flex items-center justify-center gap-1.5 ${
                  docType === 'FACTURE' 
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5 font-extrabold' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>Facture Définitive</span>
              </button>
            </div>

            {/* Carte 1: Informations Client & Document */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <User size={14} className="text-secondary" />
                  Client & Document
                </h2>
                {viewingHistoryId && (
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-full">
                    Modification en cours
                  </span>
                )}
              </div>
              
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  {/* Identifiant */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Numéro</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={proformaNumber} 
                        readOnly 
                        className="w-full bg-slate-50 border border-border rounded-xl px-3 py-2 text-xs text-slate-600 font-mono font-semibold focus:outline-none select-all"
                      />
                      <Hash size={12} className="absolute right-3 top-3 text-slate-400" />
                    </div>
                  </div>
                  {/* Date */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date d'émission</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={format(new Date(proformaDate), 'dd MMM yyyy')} 
                        readOnly 
                        className="w-full bg-slate-50 border border-border rounded-xl px-3 py-2 text-xs text-slate-600 font-medium focus:outline-none"
                      />
                      <Calendar size={13} className="absolute right-3 top-2.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Nom du Client */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nom du Client ou Entreprise *</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ex: Société Horizon SARL"
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
                      className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:border-secondary focus:ring-2 focus:ring-secondary/15 outline-none transition-all placeholder:text-slate-300"
                    />
                    {showClientSuggestions && clientSuggestions.length > 0 && (
                      <ul className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-2xl shadow-xl overflow-hidden animate-fade-in">
                        {clientSuggestions.map((c, idx) => (
                          <li
                            key={idx}
                            onMouseDown={() => { 
                              setClient({ name: c.name, phone: c.phone || '' }); 
                              setShowClientSuggestions(false); 
                              setActiveSuggestionIndex(-1);
                            }}
                            className={`px-4 py-2.5 cursor-pointer transition-colors flex items-center justify-between ${
                              idx === activeSuggestionIndex 
                                ? 'bg-secondary/10 text-secondary font-bold' 
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-bold truncate">{c.name}</span>
                            </div>
                            {c.phone && <span className="text-[10px] text-muted-foreground font-mono">{c.phone}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Téléphone */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Téléphone de contact</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="+225 07 00 00 00 00"
                      value={client.phone}
                      onChange={e => setClient({...client, phone: e.target.value})}
                      className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-secondary focus:ring-2 focus:ring-secondary/15 outline-none transition-all placeholder:text-slate-300"
                    />
                    <Phone size={13} className="absolute right-3.5 top-3 text-slate-400" />
                  </div>
                </div>

                {/* Adresse / Ville */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adresse ou Ville (optionnel)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ex: Lomégan, Lomé - Togo"
                      value={client.address || ''}
                      onChange={e => setClient({...client, address: e.target.value})}
                      className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-secondary focus:ring-2 focus:ring-secondary/15 outline-none transition-all placeholder:text-slate-300"
                    />
                    <MapPin size={13} className="absolute right-3.5 top-3 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Carte 2: Prestations & Articles */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} className="text-secondary" />
                    Articles & Prestations
                  </h3>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="py-7 px-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center shadow-2xs">
                    <PackageOpen size={20} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Aucune prestation ajoutée</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Définissez la description, la quantité et le prix unitaire en un clic.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddItemModal}
                    className="mt-2 px-4 py-2 bg-primary hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Ajouter un article ou une prestation</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      const lineTotal = item.quantity * item.unitPrice;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => handleOpenEditItemModal(item)}
                          className="group flex items-center justify-between p-3 bg-slate-50/60 hover:bg-blue-50/40 border border-slate-200/80 hover:border-secondary/40 rounded-xl transition-all cursor-pointer shadow-2xs"
                          title="Cliquez pour modifier cette prestation"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {item.description || 'Sans description'}
                              </p>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium mt-1 pl-7">
                              <span className="font-semibold text-slate-700 font-mono">{item.quantity}</span> × {item.unitPrice.toLocaleString()} F CFA
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-black text-primary font-mono whitespace-nowrap">
                                {lineTotal.toLocaleString()} F CFA
                              </span>
                            </div>

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditItemModal(item)}
                                className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                                title="Modifier cette prestation"
                                aria-label="Modifier"
                              >
                                <Pencil size={13} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="w-8 h-8 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-destructive border border-slate-200 hover:border-red-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                                title="Supprimer cette prestation"
                                aria-label="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bouton unique d'ajout */}
                  <button
                    type="button"
                    onClick={handleOpenAddItemModal}
                    className="w-full py-2.5 bg-slate-50 hover:bg-blue-50/50 border border-dashed border-slate-300 hover:border-secondary/60 text-slate-700 hover:text-secondary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
                  >
                    <Plus size={14} className="text-slate-400 group-hover:text-secondary transition-colors" />
                    <span>Ajouter un article ou une prestation</span>
                  </button>
                </>
              )}
            </div>

            {/* Carte 3: Réduction & Remise */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Remise commerciale</label>
                  <p className="text-[10px] text-muted-foreground">Appliquer un pourcentage sur le sous-total</p>
                </div>
                <div className="flex items-center gap-3">
                  {discountAmount > 0 && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 font-mono">
                      -{discountAmount.toLocaleString()} F
                    </span>
                  )}
                  <div className="flex items-center border border-border rounded-xl bg-white overflow-hidden focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/15 transition-all">
                    <input 
                      type="number" 
                      value={discountPercent || ''}
                      inputMode="decimal"
                      onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      placeholder="0"
                      className="w-16 px-2.5 py-2 text-right text-xs font-mono font-bold outline-none"
                    />
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-2 border-l border-border select-none">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FOOTER DE L'ÉDITEUR AVEC TOTAUX ÉPURÉS ── */}
          <div className="p-5 sm:p-6 bg-white border-t border-border shadow-xs shrink-0 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Sous-total brut</span>
                <span className="font-mono font-semibold">{subtotal.toLocaleString()} F CFA</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600 font-medium">
                  <span>Remise accordée ({discountPercent}%)</span>
                  <span className="font-mono">-{discountAmount.toLocaleString()} F CFA</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Net à payer</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                  {total.toLocaleString()} <span className="text-sm font-bold text-slate-500">F CFA</span>
                </span>
              </div>
              {docType === 'PROFORMA' && total > 0 && (
                <div className="flex justify-between items-center text-xs text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-2 mt-2 font-medium">
                  <span className="font-bold uppercase text-[10px] tracking-wider text-amber-700">Acompte exigé (70%)</span>
                  <span className="font-mono font-black text-amber-900 text-sm">{Math.round(total * 0.70).toLocaleString()} F CFA</span>
                </div>
              )}
            </div>

            <div>
              <button 
                onClick={saveProforma}
                disabled={!client.name || total === 0 || items.length === 0}
                className="w-full bg-primary hover:bg-slate-800 active:scale-[0.99] text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>{viewingHistoryId ? 'Mettre à jour le document' : 'Enregistrer dans le Cloud'}</span>
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Sauvegarde Cloud Supabase</span>
              <span>•</span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">Ctrl+S</span>
            </div>
          </div>
        </section>

        {/* ── PANNEAU D'APERÇU A4 (DROITE) ── */}
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

    {/* Modale d'ajout / modification d'une ligne d'article */}
    <ItemModal 
      isOpen={isItemModalOpen}
      onClose={() => setIsItemModalOpen(false)}
      onSave={handleSaveItemFromModal}
      editingItem={editingItem}
    />

    {/* Mobile Totals Bar */}
    <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-border flex items-center justify-between z-30 shadow-[0_-10px_25px_rgba(0,0,0,0.06)]">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Net</p>
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-black text-slate-900 font-mono">{total.toLocaleString()} FCFA</p>
          {discountPercent > 0 && <span className="text-[10px] text-destructive font-bold font-mono">-{discountAmount.toLocaleString()}</span>}
        </div>
      </div>
      <button 
        onClick={saveProforma}
        disabled={!client.name || total === 0}
        className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-30 transition-all active:scale-95 cursor-pointer"
      >
        {viewingHistoryId ? 'MÀJ' : 'Enregistrer'}
      </button>
    </div>

    {/* Notifications Toast */}
    <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    <SupabaseStatus />
    </>
  );
}
