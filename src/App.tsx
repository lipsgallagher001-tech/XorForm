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
  ChevronRight, 
  Settings,
  X,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Proforma, ProformaItem, CompanyInfo, ClientInfo } from './types';
import { generatePDF, getPDFBlob } from './lib/pdf-generator';

const DEFAULT_COMPANY: CompanyInfo = {
  name: "Mon Entreprise",
  address: "123 Rue du Commerce, Paris",
  email: "contact@entreprise.fr",
  phone: "01 23 45 67 89"
};

export default function App() {
  // State
  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
  };

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
    try {
      const saved = localStorage.getItem('company_info');
      return saved ? JSON.parse(saved) : DEFAULT_COMPANY;
    } catch (e) {
      console.error('Failed to load company info:', e);
      return DEFAULT_COMPANY;
    }
  });
  
  const [history, setHistory] = useState<Proforma[]>(() => {
    try {
      const saved = localStorage.getItem('proforma_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load history:', e);
      return [];
    }
  });

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

  // Derivatives
  const subtotal = useMemo(() => items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0), [items]);
  const discountAmount = useMemo(() => (subtotal * discountPercent) / 100, [subtotal, discountPercent]);
  const total = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

  // Initial number generation and updates when history changes or doc type changes
  useEffect(() => {
    if (!viewingHistoryId) {
      const count = history.length + 1;
      const prefix = docType === 'PROFORMA' ? 'PF' : 'FA';
      setProformaNumber(`${prefix}-${new Date().getFullYear()}-${count.toString().padStart(3, '0')}`);
    }
  }, [history.length, viewingHistoryId, docType]);

  // Reset selected IDs when history is closed
  useEffect(() => {
    if (!showHistory) {
      setSelectedHistoryIds([]);
    }
  }, [showHistory]);

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

  const deleteSelected = () => {
    if (selectedHistoryIds.length === 0) return;
    if (confirm(`Voulez-vous vraiment supprimer ${selectedHistoryIds.length} proformas ?`)) {
      setHistory(history.filter(p => !selectedHistoryIds.includes(p.id)));
      setSelectedHistoryIds([]);
    }
  };

  // Effects
  useEffect(() => {
    localStorage.setItem('company_info', JSON.stringify(companyInfo));
  }, [companyInfo]);

  useEffect(() => {
    localStorage.setItem('proforma_history', JSON.stringify(history));
  }, [history]);

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

  const saveProforma = () => {
    if (!client.name) return;
    
    const newProforma: Proforma = {
      id: viewingHistoryId || currentId,
      type: docType,
      number: proformaNumber,
      date: proformaDate,
      client,
      items,
      discountPercent,
      total
    };

    setHistory([newProforma, ...history.filter(p => p.id !== (viewingHistoryId || currentId))]);
    resetForm();
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

  const deleteFromHistory = (id: string) => {
    setHistory(history.filter(p => p.id !== id));
  };

  const handleExport = (p: Proforma) => {
    generatePDF(p, companyInfo);
  };

  const handleWhatsApp = (p: Proforma) => {
    const text = `Bonjour ${(p.client.name || 'Client').toUpperCase()},\n\nVoici votre ${p.type === 'PROFORMA' ? 'devis' : 'facture'} N° ${p.number} d'un montant de ${p.total.toLocaleString()} FCFA.\n\nCordialement, ${companyInfo.name}.`;
    const encodedText = encodeURIComponent(text);
    const phone = client.phone.replace(/\D/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handleShare = async (p: Proforma) => {
    try {
      const blob = getPDFBlob(p, companyInfo);
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
        handleExport(p);
        alert("Le partage de fichiers n'est pas supporté par votre navigateur. Le fichier a été téléchargé.");
      }
    } catch (error) {
      console.error('Error sharing:', error);
      handleExport(p);
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
            onClick={() => setShowHistory(true)}
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
            className="bg-app-yellow text-app-navy px-3 md:px-4 py-1.5 rounded-md text-xs md:sm font-bold shadow-sm hover:brightness-95 transition-colors flex items-center gap-2"
          >
            <Download size={14} className="md:w-4 md:h-4" />
            <span className="hidden xs:inline uppercase tracking-wider">PDF</span>
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-slate-400 hover:text-app-navy transition-colors"
          >
            <Settings size={18} />
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
                  <input 
                    type="text" 
                    placeholder="Studio Horizon Digital"
                    value={client.name}
                    onChange={e => setClient({...client, name: e.target.value})}
                    className="w-full border border-app-light-blue/50 rounded px-3 py-2 text-sm focus:border-app-navy focus:ring-1 focus:ring-app-navy/10 outline-none transition-all"
                  />
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
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="grid grid-cols-12 gap-2 group"
                    >
                      <div className="col-span-7">
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
                          value={item.quantity}
                          onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })}
                          className="w-full border border-app-light-blue/50 rounded px-2 py-1.5 text-[12px] text-center focus:border-app-navy outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          placeholder="FCFA"
                          value={item.unitPrice || ''}
                          onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full border border-app-light-blue/50 rounded px-2 py-1.5 text-[12px] text-right focus:border-app-navy outline-none font-medium"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-slate-300 hover:text-app-black"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
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
                {viewingHistoryId ? 'Mettre à jour' : 'Sauvegarder en local'}
              </button>
            </div>
            <p className="text-[10px] text-app-navy/40 mt-3 text-center italic">Auto-sauvegarde activée</p>
          </div>
        </section>

        {/* Preview Pane (Right) */}
        <section className={`flex-1 bg-app-light-blue/40 flex items-start justify-center p-0 sm:p-4 md:p-8 overflow-x-hidden overflow-y-auto ${mobileView === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
          {/* The "Paper" Document Container - strictly A4 ratio with better mobile scaling */}
          <div className="w-[400px] xs:w-[500px] sm:w-full sm:max-w-[580px] h-[565px] xs:h-[707px] sm:h-[820px] bg-white shadow-[0_20px_50px_rgba(10,31,44,0.1)] p-6 sm:p-12 flex flex-col relative overflow-hidden origin-top scale-[0.7] xs:scale-[0.75] sm:scale-90 md:scale-100 transition-transform duration-300">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] rotate-[-45deg]">
              <span className="text-6xl md:text-9xl font-black uppercase font-sans tracking-[0.2em] text-app-navy">
                {companyInfo.watermark || docType}
              </span>
            </div>

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-2 sm:gap-4 items-start pr-2">
                {/* Logo Box */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
                  {companyInfo.logo ? (
                    <img src={companyInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-app-navy flex items-center justify-center text-white rounded shadow-sm">
                      <span className="font-sans font-bold text-sm sm:text-lg">{companyInfo.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-sans font-black text-sm sm:text-lg tracking-tight leading-tight mb-0.5 sm:mb-1 text-app-navy uppercase truncate">{companyInfo.name}</h3>
                  <div className="font-sans text-[7px] sm:text-[9px] text-app-navy/60 font-medium leading-snug">
                    <p className="truncate">{companyInfo.address}</p>
                    <p>{companyInfo.email}</p>
                    <p>{companyInfo.phone}</p>
                  </div>
                </div>
              </div>
              <div className="text-right pt-1 sm:pt-2 border-l border-app-light-blue/20 pl-2 sm:pl-4 shrink-0">
                <h2 className="text-lg sm:text-2xl md:text-3xl font-sans font-black text-app-navy tracking-tighter uppercase leading-none">{docType}</h2>
              </div>
            </div>

            <div className="w-full h-px bg-app-light-blue/30 mb-8" />

            {/* Meta & Client Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-10">
              <div className="space-y-1 text-left">
                <p className="font-sans text-[9px] text-app-navy/40 font-bold uppercase tracking-widest leading-none mb-1">Destinataire:</p>
                <div className="font-sans text-[11px] text-app-navy leading-tight">
                  <span className="block font-black text-app-navy mb-0.5">{client.name.toUpperCase() || 'NOM DU CLIENT'}</span>
                  <span className="font-bold text-app-navy/70">{client.phone || ''}</span>
                </div>
              </div>
              <div className="text-left sm:text-right font-sans text-[10px] space-y-1.5 w-full sm:w-auto">
                <p className="flex justify-between sm:block gap-4"><span className="text-app-navy/30 uppercase font-black tracking-tighter mr-2">N°:</span> <span className="font-black text-app-navy">{proformaNumber}</span></p>
                <p className="flex justify-between sm:block gap-4"><span className="text-app-navy/30 uppercase font-black tracking-tighter mr-2">Date:</span> <span className="font-black text-app-navy">{format(new Date(proformaDate), 'dd/MM/yyyy')}</span></p>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-1 overflow-x-visible">
              <table className="w-full border-collapse border border-app-light-blue/20">
                <thead>
                  <tr className="bg-app-light-blue/50 text-app-navy font-sans text-[8px] sm:text-[9px] uppercase tracking-widest">
                    <th className="py-2.5 px-4 font-black text-left border-r border-app-navy/10">Description</th>
                    <th className="py-2.5 px-2 font-black text-center w-8 sm:w-16 border-r border-app-navy/10">Qté</th>
                    <th className="py-2.5 px-4 text-center font-black w-24 sm:w-32 border-r border-app-navy/10">Prix Unitaire</th>
                    <th className="py-2.5 px-4 text-center font-black w-28 sm:w-32">Total</th>
                  </tr>
                </thead>
                <tbody className="text-[9px] sm:text-[10px] md:text-[11px] text-app-navy">
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-app-light-blue/20">
                      <td className="py-2 px-4 font-bold uppercase truncate max-w-[100px] sm:max-w-none border-r border-app-light-blue/10">{item.description || 'Design Services'}</td>
                      <td className="py-2 px-2 text-center font-medium border-r border-app-light-blue/10">{item.quantity}</td>
                      <td className="py-2 px-4 text-right text-app-navy/60 font-bold border-r border-app-light-blue/10 whitespace-nowrap">{item.unitPrice.toLocaleString()} FCFA</td>
                      <td className="py-2 px-4 text-right font-black text-app-navy whitespace-nowrap">{(item.quantity * item.unitPrice).toLocaleString()} FCFA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Document Footer (Totals) */}
            <div className="mt-8 self-end w-full max-w-[320px] space-y-2 mb-6">
              <div className="flex justify-between items-center text-[10px] px-2">
                <span className="font-bold text-app-navy/30 uppercase tracking-widest italic">Sous-total</span>
                <span className="font-bold text-app-navy/60">{subtotal.toLocaleString()} FCFA</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between items-center text-[10px] px-2">
                  <span className="font-bold text-app-navy/30 uppercase tracking-widest italic">Réduction ({discountPercent}%)</span>
                  <span className="font-bold text-red-500">-{discountAmount.toLocaleString()} FCFA</span>
                </div>
              )}
              
              <div className="bg-app-yellow p-4 rounded-lg flex justify-between items-center shadow-lg shadow-app-yellow/10">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-app-navy italic">Total Général</span>
                <span className="text-xl font-black text-app-navy tracking-tighter">
                  {total.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            {(companyInfo.signature || companyInfo.stamp) && (
              <div className="flex justify-end gap-12 px-6 mb-4">
                <div className="text-center">
                  <p className="text-[8px] font-black text-app-navy/20 uppercase tracking-widest mb-2 border-b border-app-navy/5 pb-1">Cachet</p>
                  {companyInfo.stamp && (
                    <img src={companyInfo.stamp} alt="Stamp" className="h-16 object-contain mix-blend-multiply opacity-80" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-app-navy/20 uppercase tracking-widest mb-2 border-b border-app-navy/5 pb-1">Signature</p>
                  {companyInfo.signature && (
                    <img src={companyInfo.signature} alt="Signature" className="h-16 object-contain mix-blend-multiply" />
                  )}
                </div>
              </div>
            )}

            <div className="mt-auto pt-2 text-[8px] sm:text-[9px] text-app-navy/40 font-bold uppercase tracking-widest text-center border-t border-app-light-blue/10">
              {companyInfo.services ? (
                <div className="flex flex-wrap justify-center items-center gap-x-3 sm:gap-x-6 gap-y-1">
                  {companyInfo.services.split('\n').filter(s => s.trim()).map((service, idx, arr) => (
                    <span key={idx} className="flex items-center gap-3 sm:gap-6">
                      <span>{service.trim()}</span>
                      {idx < arr.length - 1 && <span className="h-3 w-px bg-app-navy/10" />}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="italic">Offre valable pendant 30 jours à compter de la date d'émission</span>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>


      {/* History Slide-over */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl p-8 flex flex-col"
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <h3 className="font-bold text-xl text-slate-800">Paramètres Entreprise</h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
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
                </div>
              </div>
              <div className="p-6 md:p-8 border-t border-slate-100 shrink-0">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 bg-app-navy text-white rounded-2xl font-bold shadow-lg shadow-app-navy/10 hover:brightness-110 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
    </>
  );
}
