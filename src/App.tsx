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
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { Proforma, ProformaItem, CompanyInfo, ClientInfo } from './types';
import Login from './Login';
import Register from './Register';
import SupabaseStatus from './components/SupabaseStatus';
import SEO from './components/SEO';
import { supabase } from './lib/supabase';
import { 
  loadCompanySettings, 
  loadCompanyImages,
  saveCompanySettings, 
  loadProformas, 
  saveProforma as saveProformaToSupabase, 
  deleteProforma,
  deleteMultipleProformas 
} from './lib/supabase-helpers';
import { validateProforma, validateCompanyInfo } from './lib/validation';
import { formatValidationErrors } from './lib/errors';

const DEFAULT_COMPANY: CompanyInfo = {
  name: "Mon Entreprise",
  address: "123 Rue du Commerce, Paris",
  email: "contact@entreprise.fr",
  phone: "01 23 45 67 89"
};

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
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false); // ⚡ Nouveau: indicateur de chargement

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

  const handleSaveAndCloseSettings = async () => {
    if (!currentUserId) {
      alert('Erreur: Utilisateur non connecté');
      return;
    }

    setIsSavingSettings(true);

    // ⚡ PROTECTION CRITIQUE: S'assurer que les images sont chargées avant de sauvegarder.
    // Sinon une sauvegarde partielle effacerait le logo/signature/cachet en base.
    let infoToSave = companyInfo;
    if (!companyInfo.logo && !companyInfo.signature && !companyInfo.stamp) {
      console.log('🔒 Vérification des images existantes avant sauvegarde...');
      const existingImages = await loadCompanyImages(currentUserId);
      if (existingImages && (existingImages.logo || existingImages.signature || existingImages.stamp)) {
        // Des images existent en base mais pas en mémoire: les préserver
        infoToSave = {
          ...companyInfo,
          logo: existingImages.logo,
          signature: existingImages.signature,
          stamp: existingImages.stamp,
        };
        setCompanyInfo(infoToSave);
        console.log('✅ Images existantes préservées');
      }
    }

    // ✅ VALIDATION
    const validation = validateCompanyInfo(infoToSave);
    if (!validation.success) {
      const errors = formatValidationErrors(validation.error.errors);
      alert(`Erreurs de validation:\n\n${errors}`);
      console.error('Validation errors:', validation.error);
      setIsSavingSettings(false);
      return;
    }

    console.log('💾 Sauvegarde des paramètres dans Supabase...');
    console.log('👤 User ID:', currentUserId);

    const result = await saveCompanySettings(currentUserId, validation.data);
    setIsSavingSettings(false);
    
    if (result.success) {
      console.log('✅ Sauvegarde réussie dans Supabase !');
      setSettingsSaved(true);
      
      // Fermer immédiatement après avoir affiché le message de succès
      window.setTimeout(() => {
        setSettingsSaved(false);
        setShowSettings(false);
      }, 1500);
    } else {
      console.error('❌ Échec de la sauvegarde');
      alert(result.error?.userMessage || 'Erreur lors de la sauvegarde des paramètres.');
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

  // Actions
  const toggleSelectAll = () => {
    if (selectedHistoryIds.length === history.length) {
      setSelectedHistoryIds([]);
    } else {
      setSelectedHistoryIds(history.map(p => p.id));
    }
  };

  const toggleSelectProforma = (id: string) => {
    setSelectedHistoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (selectedHistoryIds.length === 0 || !currentUserId) return;
    if (confirm(`Voulez-vous vraiment supprimer ${selectedHistoryIds.length} proformas ?`)) {
      const result = await deleteMultipleProformas(selectedHistoryIds, currentUserId);
      if (result.success) {
        setHistory(history.filter(p => !selectedHistoryIds.includes(p.id)));
        setSelectedHistoryIds([]);
      } else {
        alert(result.error?.userMessage || 'Erreur lors de la suppression des proformas');
      }
    }
  };

  // Effects
  // Actions
  const addItem = () => {
    setItems([...items, { id: generateId(), description: '', quantity: 1, unitPrice: 0 }]);
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
      const errors = formatValidationErrors(validation.error.errors);
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

  const deleteFromHistory = async (id: string) => {
    if (!currentUserId) return;
    const result = await deleteProforma(id, currentUserId);
    if (result.success) {
      setHistory(history.filter(p => p.id !== id));
    } else {
      alert(result.error?.userMessage || 'Erreur lors de la suppression du proforma');
    }
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

  const handleExport = async (p: Proforma) => {
    setIsGeneratingPDF(true);
    try {
      // ⚡ LAZY LOADING: jsPDF chargé uniquement à la demande (-417 KB au démarrage)
      const { generatePDF } = await import('./lib/pdf-generator');
      const companyWithImages = await getCompanyInfoWithImages();
      await generatePDF(p, companyWithImages);
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
      const companyWithImages = await getCompanyInfoWithImages();
      const blob = await getPDFBlob(p, companyWithImages);
      const filename = `${p.type.toLowerCase()}-${p.number}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${p.type} ${p.number}`,
          text: `Voici votre ${p.type.toLowerCase()} N° ${p.number}`
        });
      } else {
        // Fallback for browsers that don't support file sharing
        await generatePDF(p, companyWithImages);
        alert("Le partage de fichiers n'est pas supporté par votre navigateur. Le fichier a été téléchargé.");
      }
    } catch (error) {
      console.error('Error sharing:', error);
      await handleExport(p);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const loadFromHistory = (p: Proforma) => {
    setViewingHistoryId(p.id);
    setDocType(p.type || 'PROFORMA');
    setClient(p.client);
    setItems(p.items);
    setDiscountPercent(p.discountPercent || 0);
    setProformaNumber(p.number);
    setProformaDate(p.date);
    setShowHistory(false);
  };

  return (
    <>
    <SEO 
      title="XorForm - Générateur de Proforma et Factures Professionnel"
      description="Créez des proformas et factures professionnels en quelques clics. Solution gratuite, intuitive et sécurisée pour gérer vos devis et facturations."
    />
    <div className="h-screen bg-white text-app-navy font-sans flex flex-col overflow-hidden">
      
      {/* Top Navigation Bar */}
      <header className="h-14 bg-white border-b border-app-light-blue flex items-center justify-between px-4 md:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-app-navy rounded flex items-center justify-center text-white font-bold text-sm shadow-sm">
            X
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-semibold text-base md:text-lg tracking-tight text-app-navy">XorForm</h1>
            <span className="text-slate-400 font-normal text-[10px] md:text-xs italic hidden sm:inline">Personal Edition</span>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={async () => {
              setShowHistory(true);
              // ⚡ CHARGEMENT À LA DEMANDE: Charger l'historique uniquement quand l'utilisateur clique
              if (currentUserId && history.length === 0) {
                console.log('📥 Chargement historique à la demande...');
                setIsLoadingData(true);
                const proformas = await loadProformas(currentUserId, 20);
                setHistory(proformas);
                setIsLoadingData(false);
                console.log('✅ Historique chargé:', proformas.length);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-app-light-blue/20 rounded-md transition-colors"
          >
            <HistoryIcon size={16} />
            <span>Historique</span>
            {history.length > 0 && (
              <span className="bg-app-light-blue text-app-navy text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {history.length}
              </span>
            )}
          </button>
          <div className="w-px h-4 bg-app-light-blue/50 mx-1" />
          <button 
            onClick={() => handleExport({
              id: currentId,
              type: docType,
              number: proformaNumber,
              date: new Date().toISOString(),
              client,
              items,
              total,
              discountPercent
            })}
            disabled={isGeneratingPDF}
            className="bg-app-yellow text-app-navy px-3 md:px-4 py-1.5 rounded-md text-xs md:sm font-bold shadow-sm hover:brightness-95 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-app-navy border-t-transparent rounded-full animate-spin" />
                <span className="hidden xs:inline uppercase tracking-wider">Génération...</span>
              </>
            ) : (
              <>
                <Download size={14} className="md:w-4 md:h-4" />
                <span className="hidden xs:inline uppercase tracking-wider">PDF</span>
              </>
            )}
          </button>
          <button 
            onClick={async () => {
              setShowSettings(true);
              // ⚡ Charger les paramètres + images quand l'utilisateur ouvre les réglages
              // (les images sont nécessaires pour afficher le logo/signature/cachet déjà enregistrés)
              if (currentUserId) {
                console.log('📥 Chargement paramètres + images...');
                const [settings, images] = await Promise.all([
                  companyInfo.name === DEFAULT_COMPANY.name
                    ? loadCompanySettings(currentUserId)
                    : Promise.resolve(null),
                  // Charger les images seulement si elles ne sont pas déjà présentes
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
            className="p-1.5 text-slate-400 hover:text-app-navy transition-colors"
          >
            <Settings size={18} />
          </button>
          <div className="w-px h-4 bg-app-light-blue/50 mx-1" />
          <button 
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-md transition-colors uppercase tracking-wider"
            title="Déconnexion"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative flex-col lg:flex-row">
        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden bg-app-light-blue/20 p-1 shrink-0 border-b border-app-light-blue/30">
          <button 
            onClick={() => setMobileView('editor')}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${mobileView === 'editor' ? 'bg-white text-app-navy shadow-sm border border-app-light-blue/50' : 'text-slate-500'}`}
          >
            ÉDITEUR
          </button>
          <button 
            onClick={() => setMobileView('preview')}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${mobileView === 'preview' ? 'bg-white text-app-navy shadow-sm border border-app-light-blue/50' : 'text-slate-500'}`}
          >
            APERÇU
          </button>
        </div>

        {/* Editor Pane (Left) */}
        <section className={`w-full lg:w-[450px] bg-white border-r border-app-light-blue/30 flex flex-col shrink-0 overflow-y-auto ${mobileView === 'editor' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-4 md:p-6 space-y-6 flex-1">
            {/* Document Type Selector */}
            <div className="bg-app-light-blue/10 p-1 rounded-xl flex gap-1">
              <button 
                onClick={() => setDocType('PROFORMA')}
                className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all tracking-widest ${docType === 'PROFORMA' ? 'bg-app-navy text-white shadow-md' : 'text-app-navy/40 hover:bg-app-light-blue/20'}`}
              >
                PROFORMA
              </button>
              <button 
                onClick={() => setDocType('FACTURE')}
                className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all tracking-widest ${docType === 'FACTURE' ? 'bg-app-navy text-white shadow-md' : 'text-app-navy/40 hover:bg-app-light-blue/20'}`}
              >
                FACTURE
              </button>
            </div>

            <div>
              <h2 className="text-xs font-bold text-app-navy/60 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText size={14} className="text-app-yellow" />
                Détails du Client
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-app-navy/40 uppercase tracking-wider">Identifiant</label>
                    <input 
                      type="text" 
                      value={proformaNumber} 
                      readOnly 
                      className="w-full bg-slate-50/50 border border-app-light-blue/30 rounded px-3 py-2 text-sm focus:outline-none text-slate-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-app-navy/40 uppercase tracking-wider">Date</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={format(new Date(proformaDate), 'dd MMM yyyy')} 
                        readOnly 
                        className="w-full bg-slate-50/50 border border-app-light-blue/30 rounded px-3 py-2 text-sm text-slate-500"
                      />
                      <Calendar size={14} className="absolute right-3 top-2.5 text-slate-300" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-app-navy/40 uppercase tracking-wider">Nom du Client</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Studio Horizon Digital"
                      value={client.name}
                      onChange={e => { setClient({...client, name: e.target.value}); setShowClientSuggestions(true); }}
                      onFocus={() => setShowClientSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 150)}
                      className="w-full border border-app-light-blue/50 rounded px-3 py-2 text-sm focus:border-app-navy focus:ring-1 focus:ring-app-navy/10 outline-none transition-all"
                    />
                    {showClientSuggestions && clientSuggestions.length > 0 && (
                      <ul className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-app-light-blue/50 rounded-lg shadow-lg overflow-hidden">
                        {clientSuggestions.map((c, idx) => (
                          <li
                            key={idx}
                            onMouseDown={() => { setClient({ name: c.name, phone: c.phone || '' }); setShowClientSuggestions(false); }}
                            className="px-3 py-2 cursor-pointer hover:bg-app-light-blue/20 transition-colors"
                          >
                            <span className="block text-sm font-bold text-app-navy truncate">{c.name}</span>
                            {c.phone && <span className="block text-[11px] text-app-navy/40 font-medium">{c.phone}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-app-navy/40 uppercase tracking-wider">Téléphone</label>
                  <input 
                    type="text" 
                    placeholder="+33 6 12 34 56 78"
                    value={client.phone}
                    onChange={e => setClient({...client, phone: e.target.value})}
                    className="w-full border border-app-light-blue/50 rounded px-3 py-2 text-sm focus:border-app-navy focus:ring-1 focus:ring-app-navy/10 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-app-navy/60 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-app-yellow" />
                  Services / Produits
                </h3>
                <button 
                  onClick={addItem}
                  className="text-app-navy text-[11px] font-bold hover:text-app-yellow flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} />
                  AJOUTER LIGNE
                </button>
              </div>
              
              <div className="space-y-2">
                  {items.map((item) => (
                    <div 
                      key={item.id}
                      className="grid grid-cols-12 gap-2 group item-row-enter"
                    >
                      <div className="col-span-6">
                        <input 
                          type="text" 
                          placeholder="Description..."
                          value={item.description}
                          onChange={e => updateItem(item.id, { description: e.target.value })}
                          className="w-full border border-app-light-blue/50 rounded px-2 py-1.5 text-[12px] focus:border-app-navy outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full border border-app-light-blue/50 rounded px-2 py-1.5 text-[12px] text-center focus:border-app-navy outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center border border-app-light-blue/50 rounded overflow-hidden focus-within:border-app-navy">
                          <input 
                            type="number" 
                            min="0"
                            placeholder="0"
                            value={item.unitPrice || ''}
                            onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 text-[12px] text-right outline-none font-medium bg-transparent"
                          />
                          <span className="text-[10px] font-bold text-app-navy/40 bg-app-light-blue/20 px-1.5 py-1.5 border-l border-app-light-blue/50 shrink-0 select-none">FCFA</span>
                        </div>
                      </div>
                      <div className="col-span-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-slate-300 hover:text-app-black"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
            </div>

            <div className="pt-6 mt-4 border-t border-app-light-blue/10">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-app-navy/40 uppercase tracking-wider">Réduction (%)</label>
                <div className="flex items-center gap-2">
                  {discountAmount > 0 && (
                    <span className="text-[10px] font-bold text-app-navy/40">-{discountAmount.toLocaleString()} FCFA</span>
                  )}
                  <input 
                    type="number" 
                    value={discountPercent || ''}
                    onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-20 border border-app-light-blue/50 rounded px-2 py-1.5 text-right text-xs focus:border-app-navy outline-none font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Editor Footer */}
          <div className="p-6 bg-app-light-blue/10 border-t border-app-light-blue/30 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-app-navy/60 font-bold text-xs uppercase tracking-wider">Total Général</span>
              <span className="text-xl md:text-2xl font-black text-app-navy">{total.toLocaleString()} FCFA</span>
            </div>
            <div className="mt-4">
              <button 
                onClick={saveProforma}
                disabled={!client.name || total === 0}
                className="w-full bg-app-navy text-white py-3 rounded-lg font-bold text-sm hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest shadow-lg shadow-app-navy/10"
              >
                {viewingHistoryId ? 'Mettre à jour' : 'Sauvegarder'}
              </button>
            </div>
            <p className="text-[10px] text-app-navy/40 mt-3 text-center italic">Sauvegarde cloud sécurisée</p>
          </div>
        </section>

        {/* Preview Pane (Right) */}
        <section className={`flex-1 bg-slate-200 flex items-start justify-center p-0 sm:p-4 md:p-8 overflow-x-hidden overflow-y-auto ${mobileView === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
          {/* A4 paper */}
          <div className="w-full max-w-[560px] h-auto bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] flex flex-col relative overflow-hidden" style={{ minHeight: '790px' }}>

            {/* ── HEADER ── */}
            <div className="relative z-10 px-10 pt-10 pb-2">
              <div className="flex justify-between items-start">
                {/* Left: logo + company info */}
                <div className="flex items-start gap-3">
                  {companyInfo.logo ? (
                    <img
                      src={companyInfo.logo}
                      alt="Logo"
                      className="object-contain shrink-0"
                      style={{
                        width:  `${(companyInfo.logoWidth  || 15) * 3.2}px`,
                        height: `${(companyInfo.logoHeight || 15) * 3.2}px`,
                      }}
                    />
                  ) : (
                    <div className="w-9 h-9 bg-app-navy rounded flex items-center justify-center text-white font-bold text-base shrink-0">
                      {companyInfo.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-black text-[11px] text-app-navy leading-tight">{companyInfo.name}</p>
                    <p className="text-[8px] text-slate-500 leading-[1.5] mt-0.5">{companyInfo.address}</p>
                    <p className="text-[8px] text-app-navy/70 leading-[1.5]">{companyInfo.phone}</p>
                    <p className="text-[8px] text-blue-600 leading-[1.5]">{companyInfo.email}</p>
                    {companyInfo.siret && <p className="text-[7px] text-slate-400 leading-[1.5]">SIRET: {companyInfo.siret}</p>}
                  </div>
                </div>
                {/* Right: doc type + date */}
                <div className="text-right shrink-0">
                  <p className="font-black text-[11px] text-app-navy uppercase leading-tight">
                    {docType === 'FACTURE' ? 'FACTURE' : 'PRO-FORMA'}
                  </p>
                  <p className="text-[8px] text-slate-600 mt-0.5">Date : {format(new Date(proformaDate), 'dd/MM/yyyy')}</p>
                  <p className="text-[8px] text-slate-600">Validité :</p>
                </div>
              </div>
              {/* Separator */}
              <div className="w-full h-[1.5px] bg-app-navy mt-3" />
            </div>

            {/* ── TITLE ── */}
            <div className="relative z-10 px-10 py-2 text-center">
              <p className="font-black text-[15px] sm:text-[17px] text-app-navy tracking-tight">
                {docType === 'FACTURE' ? 'N° DE FACTURE' : 'N° PRO-FORMA'} : {proformaNumber}
              </p>
              <div className="w-full h-px bg-slate-300 mt-1" />
            </div>

            {/* ── CLIENT BAND ── */}
            <div className="relative z-10 mx-10 mb-3 bg-app-light-blue/60 px-3 py-2">
              <p className="text-[8px] font-bold text-app-navy leading-none">Facture à</p>
              <p className="text-[9px] font-black text-app-navy mt-0.5">
                Client : {(client.name || 'NOM DU CLIENT').toUpperCase()}
              </p>
            </div>

            {/* ── TABLE ── */}
            <div className="relative z-10 px-10">
              <table className="w-full border-collapse text-[8px] sm:text-[9px]">
                <thead>
                  <tr className="bg-app-navy text-white">
                    <th className="py-2 px-3 font-bold text-left border-r border-white/20">Description</th>
                    <th className="py-2 px-2 font-bold text-center w-14 border-r border-white/20">Quantité</th>
                    <th className="py-2 px-3 font-bold text-right w-24 border-r border-white/20">Prix unitaire</th>
                    <th className="py-2 px-3 font-bold text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Real items */}
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      <td className="py-1.5 px-3 text-app-navy border-r border-slate-200">{item.description || ''}</td>
                      <td className="py-1.5 px-2 text-center text-app-navy border-r border-slate-200">{item.quantity}</td>
                      <td className="py-1.5 px-3 text-right text-app-navy/70 border-r border-slate-200 whitespace-nowrap">{item.unitPrice.toLocaleString()} F</td>
                      <td className="py-1.5 px-3 text-right font-bold text-app-navy whitespace-nowrap">{(item.quantity * item.unitPrice).toLocaleString()} F</td>
                    </tr>
                  ))}
                  {/* Empty rows to fill table like the reference */}
                  {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="border-b border-slate-200">
                      <td className="py-1.5 px-3 border-r border-slate-200">&nbsp;</td>
                      <td className="py-1.5 px-2 border-r border-slate-200">&nbsp;</td>
                      <td className="py-1.5 px-3 border-r border-slate-200">&nbsp;</td>
                      <td className="py-1.5 px-3">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── TOTALS ── */}
            <div className="relative z-10 px-10 -mt-px">
              {/* Sous-total + Remise (right aligned text) */}
              <div className="text-right text-[8px] text-slate-500 space-y-0.5 mb-0">
                <p>Sous-total : {subtotal.toLocaleString()} F CFA</p>
                {discountPercent > 0 && (
                  <p>Remise : {discountAmount.toLocaleString()} F</p>
                )}
              </div>
              {/* Yellow total bar */}
              <div className="bg-app-yellow flex items-center justify-end px-3 py-2">
                <span className="font-black text-[10px] sm:text-[11px] text-app-navy">
                  Total HT : {total.toLocaleString()} F CFA
                </span>
              </div>
            </div>

            {/* ── AMOUNT IN WORDS ── */}
            <div className="relative z-10 px-10 mt-2">
              <p className="text-[7.5px] italic text-slate-600">
                Arrêtée la présente facture à la somme de : <span className="font-bold text-app-navy uppercase">{
                  (() => {
                    const n = Math.round(total);
                    if (n === 0) return 'ZÉRO';
                    const u = ['','UN','DEUX','TROIS','QUATRE','CINQ','SIX','SEPT','HUIT','NEUF','DIX','ONZE','DOUZE','TREIZE','QUATORZE','QUINZE','SEIZE','DIX-SEPT','DIX-HUIT','DIX-NEUF'];
                    const t = ['','','VINGT','TRENTE','QUARANTE','CINQUANTE','SOIXANTE','SOIXANTE','QUATRE-VINGT','QUATRE-VINGT'];
                    const b100 = (x: number): string => {
                      if (x < 20) return u[x];
                      const d = Math.floor(x/10), r = x%10;
                      if (d===7) return r===1?'SOIXANTE ET ONZE':`SOIXANTE-${u[10+r]}`;
                      if (d===9) return r===0?'QUATRE-VINGT-DIX':`QUATRE-VINGT-${u[10+r]}`;
                      return r===0?t[d]:r===1&&d!==8?`${t[d]} ET UN`:`${t[d]}-${u[r]}`;
                    };
                    const b1000 = (x: number): string => {
                      if (x<100) return b100(x);
                      const h=Math.floor(x/100), r=x%100;
                      return r===0?(h===1?'CENT':`${u[h]} CENT`):(h===1?`CENT ${b100(r)}`:`${u[h]} CENT ${b100(r)}`);
                    };
                    let s='';
                    const M2=Math.floor(n/1000000), K=Math.floor((n%1000000)/1000), R=n%1000;
                    if(M2>0) s+=M2===1?'UN MILLION ':`${b1000(M2)} MILLIONS `;
                    if(K>0) s+=K===1?'MILLE ':`${b1000(K)} MILLE `;
                    if(R>0) s+=b1000(R);
                    return s.trim();
                  })()
                }</span>
              </p>
            </div>

            {/* Spacer — pousse le footer en bas */}
            <div className="flex-1" />

            {/* ── SIGNATURE ZONE ── */}
            <div className="relative z-10 px-10 mt-2 flex justify-between items-end min-h-[60px]">
              {/* Services (left) */}
              <div className="text-[7.5px] text-app-navy max-w-[55%]">
                {companyInfo.services && (
                  <p className="font-bold leading-snug">
                    NOS SERVICES : {companyInfo.services.split('\n').filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              {/* Responsable + images (right) */}
              <div className="text-right">
                <p className="text-[8px] font-black text-app-navy underline mb-1">RESPONSABLE</p>
                {(companyInfo.stamp || companyInfo.signature) && (
                  <div className="flex items-end justify-end gap-3">
                    {companyInfo.stamp && (
                      <img src={companyInfo.stamp} alt="Cachet"
                        className="object-contain mix-blend-multiply opacity-80"
                        style={{ height: `${(companyInfo.stampHeight || 22) * 3.2}px` }} />
                    )}
                    {companyInfo.signature && (
                      <img src={companyInfo.signature} alt="Signature"
                        className="object-contain mix-blend-multiply"
                        style={{ height: `${(companyInfo.signatureHeight || 22) * 3.2}px` }} />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── FOOTER ── */}
            <div className="relative z-10 px-10 mt-2 pb-10 flex justify-between items-end">
              {/* Slogan */}
              <p className="font-black italic text-[11px] sm:text-[13px] text-app-navy leading-tight max-w-[60%]">
                {companyInfo.watermark || 'COMMUNIQUER LA DIFFÉRENCE'}
              </p>
              {/* Short name + small square */}
              <div className="flex items-end gap-2">
                <p className="text-[8px] text-slate-500">{companyInfo.name.split(' ')[0]}</p>
                <div className="w-5 h-5 border border-slate-300" />
              </div>
            </div>

            {/* Navy bottom band */}
            <div className="relative z-10 w-full h-3 bg-app-navy mt-1" />
          </div>
        </section>
      </main>
    </div>


      {/* History Slide-over */}
      {showHistory && (
          <>
            <div 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-overlay-in"
              onClick={() => setShowHistory(false)}
            />
            <aside 
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl p-8 flex flex-col slide-over"
            >
               <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-2xl tracking-tighter text-slate-800 italic">Historique</h3>
                <button onClick={() => setShowHistory(false)} className="bg-slate-50 p-2 rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {history.length > 0 && (
                <div className="mb-4 flex items-center justify-between pb-4 border-b border-app-light-blue/20">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-app-navy cursor-pointer"
                      checked={selectedHistoryIds.length === history.length && history.length > 0}
                      onChange={toggleSelectAll}
                    />
                    <span className="text-xs font-bold text-app-navy/60 uppercase tracking-widest">Tout sélectionner</span>
                  </div>
                  {selectedHistoryIds.length > 0 && (
                    <button 
                      onClick={deleteSelected}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[11px] font-bold hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} />
                      SUPPRIMER ({selectedHistoryIds.length})
                    </button>
                  )}
                </div>
              )}

              {history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="bg-slate-50 p-6 rounded-full text-slate-300">
                    <HistoryIcon size={48} strokeWidth={1} />
                  </div>
                  <p className="text-sm font-medium text-slate-400">Aucun historique pour le moment.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
                  {history.map(p => (
                    <div 
                      key={p.id}
                      className={`group p-5 rounded-2xl bg-slate-50 border transition-all cursor-pointer relative flex gap-4 items-start ${selectedHistoryIds.includes(p.id) ? 'border-app-navy bg-app-light-blue/10' : 'border-slate-100 hover:border-app-yellow/50 hover:bg-app-yellow/[0.03]'}`}
                      onClick={() => loadFromHistory(p)}
                    >
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="pt-1"
                      >
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded accent-app-navy cursor-pointer"
                          checked={selectedHistoryIds.includes(p.id)}
                          onChange={() => toggleSelectProforma(p.id)}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-slate-800 text-sm mb-0.5">{p.client.name.toUpperCase()}</p>
                            <p className="text-[10px] font-bold text-app-navy uppercase tracking-widest">{p.number}</p>
                          </div>
                          <p className="font-black text-lg text-slate-800 shrink-0 ml-2">{p.total.toLocaleString()} FCFA</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Calendar size={12} />
                            <span className="text-[10px] font-medium">{format(new Date(p.date), 'dd/MM/yy')}</span>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleWhatsApp(p); }}
                              title="Partager sur WhatsApp"
                              className="p-1.5 text-slate-400 hover:text-green-500 transition-colors"
                            >
                              <MessageSquare size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleShare(p); }}
                              title="Partager"
                              className="p-1.5 text-slate-400 hover:text-app-navy transition-colors lg:hidden"
                            >
                              <Share2 size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleExport(p); }}
                              title="Télécharger PDF"
                              className="p-1.5 text-slate-400 hover:text-app-navy transition-colors"
                            >
                              <Download size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteFromHistory(p.id); }}
                              title="Supprimer"
                              className={`p-1.5 text-slate-400 hover:text-app-black transition-colors ${selectedHistoryIds.includes(p.id) ? 'opacity-0 pointer-events-none' : ''}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => { resetForm(); setShowHistory(false); }}
                  className="w-full py-4 bg-app-yellow text-app-navy rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-95 transition-colors uppercase tracking-widest text-xs"
                >
                  <Plus size={18} />
                  Nouvelle {docType === 'PROFORMA' ? 'Proforma' : 'Facture'}
                </button>
              </div>
            </aside>
          </>
        )}

      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-overlay-in"
            />
            <div 
              className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl relative z-10 flex flex-col animate-scale-in"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <h3 className="font-bold text-xl text-slate-800">Paramètres Entreprise</h3>
                <button 
                  onClick={() => setShowSettings(false)} 
                  disabled={isSavingSettings}
                  className="text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50"
                  title="Fermer sans sauvegarder"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nom commercial</label>
                    <input 
                      type="text" 
                      value={companyInfo.name}
                      onChange={e => setCompanyInfo({...companyInfo, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adresse complète</label>
                    <textarea 
                      value={companyInfo.address}
                      onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-sm font-medium h-24 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email professionnel</label>
                    <input 
                      type="email" 
                      value={companyInfo.email}
                      onChange={e => setCompanyInfo({...companyInfo, email: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filigrane (Watermark)</label>
                    <input 
                      type="text" 
                      value={companyInfo.watermark || ''}
                      onChange={e => setCompanyInfo({...companyInfo, watermark: e.target.value})}
                      placeholder="Laisse vide pour PROFORMA/FACTURE"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nos Services (affichés en haut)</label>
                    <textarea 
                      value={companyInfo.services || ''}
                      onChange={e => setCompanyInfo({...companyInfo, services: e.target.value})}
                      placeholder="Liste de vos services ou description courte..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-sm font-medium h-20 resize-none"
                    />
                  </div>

                  {/* Informations légales */}
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Informations légales (affichées en bas)</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">SIRET (14 chiffres)</label>
                        <input 
                          type="text" 
                          value={companyInfo.siret || ''}
                          onChange={e => setCompanyInfo({...companyInfo, siret: e.target.value})}
                          placeholder="123 456 789 00012"
                          maxLength={17}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">SIREN (9 chiffres)</label>
                        <input 
                          type="text" 
                          value={companyInfo.siren || ''}
                          onChange={e => setCompanyInfo({...companyInfo, siren: e.target.value})}
                          placeholder="123 456 789"
                          maxLength={11}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">RCS (Registre du Commerce)</label>
                        <input 
                          type="text" 
                          value={companyInfo.rcs || ''}
                          onChange={e => setCompanyInfo({...companyInfo, rcs: e.target.value})}
                          placeholder="RCS Paris B 123 456 789"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-sm font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Téléphone</label>
                      <input 
                        type="text" 
                        value={companyInfo.phone}
                        onChange={e => setCompanyInfo({...companyInfo, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logo de l'entreprise</label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center justify-center px-4 py-3 bg-white border border-slate-200 border-dashed rounded-2xl cursor-pointer hover:border-app-navy transition-all text-xs font-medium text-slate-500">
                          {companyInfo.logo ? 'Changer logo' : 'Logo'}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const base64 = event.target?.result as string;
                                  setCompanyInfo({ ...companyInfo, logo: base64 });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {companyInfo.logo && (
                          <button 
                            onClick={() => setCompanyInfo({ ...companyInfo, logo: undefined })}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Logo Dimensions */}
                  {companyInfo.logo && (
                    <div className="grid grid-cols-2 gap-4 bg-app-light-blue/10 p-4 rounded-2xl">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Largeur du logo (mm)</label>
                        <input 
                          type="number" 
                          value={companyInfo.logoWidth || 15}
                          onChange={e => setCompanyInfo({...companyInfo, logoWidth: parseFloat(e.target.value) || 15})}
                          placeholder="15"
                          min="5"
                          max="50"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hauteur du logo (mm)</label>
                        <input 
                          type="number" 
                          value={companyInfo.logoHeight || 15}
                          onChange={e => setCompanyInfo({...companyInfo, logoHeight: parseFloat(e.target.value) || 15})}
                          placeholder="15"
                          min="5"
                          max="50"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-sm font-medium"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Signature</label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center justify-center px-4 py-3 bg-white border border-slate-200 border-dashed rounded-2xl cursor-pointer hover:border-app-navy transition-all text-xs font-medium text-slate-500">
                          {companyInfo.signature ? 'Changer' : 'Charger'}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const base64 = event.target?.result as string;
                                  setCompanyInfo({ ...companyInfo, signature: base64 });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {companyInfo.signature && (
                          <button 
                            onClick={() => setCompanyInfo({ ...companyInfo, signature: undefined })}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cachet</label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center justify-center px-4 py-3 bg-white border border-slate-200 border-dashed rounded-2xl cursor-pointer hover:border-app-navy transition-all text-xs font-medium text-slate-500">
                          {companyInfo.stamp ? 'Changer' : 'Charger'}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const base64 = event.target?.result as string;
                                  setCompanyInfo({ ...companyInfo, stamp: base64 });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {companyInfo.stamp && (
                          <button 
                            onClick={() => setCompanyInfo({ ...companyInfo, stamp: undefined })}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dimensions Signature et Cachet */}
                  {(companyInfo.signature || companyInfo.stamp) && (
                    <div className="grid grid-cols-2 gap-4 bg-app-light-blue/10 p-4 rounded-2xl">
                      {companyInfo.signature && (
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dimensions Signature (mm)</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Largeur</label>
                              <input 
                                type="number" 
                                value={companyInfo.signatureWidth || 35}
                                onChange={e => setCompanyInfo({...companyInfo, signatureWidth: parseFloat(e.target.value) || 35})}
                                placeholder="35"
                                min="10"
                                max="80"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-xs font-medium"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Hauteur</label>
                              <input 
                                type="number" 
                                value={companyInfo.signatureHeight || 25}
                                onChange={e => setCompanyInfo({...companyInfo, signatureHeight: parseFloat(e.target.value) || 25})}
                                placeholder="25"
                                min="10"
                                max="80"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-xs font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {companyInfo.stamp && (
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dimensions Cachet (mm)</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Largeur</label>
                              <input 
                                type="number" 
                                value={companyInfo.stampWidth || 35}
                                onChange={e => setCompanyInfo({...companyInfo, stampWidth: parseFloat(e.target.value) || 35})}
                                placeholder="35"
                                min="10"
                                max="80"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-xs font-medium"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Hauteur</label>
                              <input 
                                type="number" 
                                value={companyInfo.stampHeight || 25}
                                onChange={e => setCompanyInfo({...companyInfo, stampHeight: parseFloat(e.target.value) || 25})}
                                placeholder="25"
                                min="10"
                                max="80"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-app-navy/10 focus:border-app-navy outline-none transition-all text-xs font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 md:p-8 border-t border-slate-100 shrink-0">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowSettings(false)}
                    disabled={isSavingSettings}
                    className="px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleSaveAndCloseSettings}
                    disabled={isSavingSettings || settingsSaved}
                    className="flex-1 py-4 bg-app-navy text-white rounded-2xl font-bold shadow-lg shadow-app-navy/10 hover:brightness-110 transition-all active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSavingSettings ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sauvegarde en cours...</span>
                      </>
                    ) : settingsSaved ? (
                      <>
                        <CheckCircle2 size={18} />
                        <span>✓ Enregistré avec succès !</span>
                      </>
                    ) : (
                      'Enregistrer les modifications'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Mobile Totals Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-app-light-blue/20 flex items-center justify-between z-30 shadow-[0_-10px_20px_rgba(10,31,44,0.05)]">
        <div>
          <p className="text-[10px] font-black text-app-navy/40 uppercase tracking-widest">Total</p>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-black text-app-navy">{total.toLocaleString()} FCFA</p>
            {discountPercent > 0 && <span className="text-[10px] text-red-500 font-bold">-{discountAmount.toLocaleString()}</span>}
          </div>
        </div>
        <button 
          onClick={saveProforma}
          disabled={!client.name || total === 0}
          className="px-6 py-2.5 bg-app-yellow text-app-navy rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-app-yellow/10 disabled:opacity-30 transition-all active:scale-95"
        >
          {viewingHistoryId ? 'MÀJ' : 'Enregistrer'}
        </button>
      </div>
      <SupabaseStatus />
    </>
  );
}
