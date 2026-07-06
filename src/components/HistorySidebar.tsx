/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Trash2, Calendar, MessageSquare, Share2, Download, Plus, History as HistoryIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Proforma } from '../types';
import { deleteProforma, deleteMultipleProformas } from '../lib/supabase-helpers';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: Proforma[];
  setHistory: React.Dispatch<React.SetStateAction<Proforma[]>>;
  selectedHistoryIds: string[];
  setSelectedHistoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  onLoadFromHistory: (p: Proforma) => Promise<void>;
  currentUserId: string | null;
  isLoadingData: boolean;
  setIsLoadingData: React.Dispatch<React.SetStateAction<boolean>>;
  docType: 'PROFORMA' | 'FACTURE';
  resetForm: () => void;
  onWhatsApp: (p: Proforma) => void;
  onShare: (p: Proforma) => void;
  onExport: (p: Proforma) => void;
}

export default function HistorySidebar({
  isOpen,
  onClose,
  history,
  setHistory,
  selectedHistoryIds,
  setSelectedHistoryIds,
  onLoadFromHistory,
  currentUserId,
  isLoadingData,
  setIsLoadingData,
  docType,
  resetForm,
  onWhatsApp,
  onShare,
  onExport
}: HistorySidebarProps) {
  if (!isOpen) return null;

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
    if (confirm(`Voulez-vous vraiment supprimer ${selectedHistoryIds.length} documents ?`)) {
      setIsLoadingData(true);
      const result = await deleteMultipleProformas(selectedHistoryIds, currentUserId);
      setIsLoadingData(false);
      if (result.success) {
        setHistory(history.filter(p => !selectedHistoryIds.includes(p.id)));
        setSelectedHistoryIds([]);
      } else {
        alert(result.error?.userMessage || 'Erreur lors de la suppression des documents');
      }
    }
  };

  const deleteFromHistory = async (id: string) => {
    if (!currentUserId) return;
    setIsLoadingData(true);
    const result = await deleteProforma(id, currentUserId);
    setIsLoadingData(false);
    if (result.success) {
      setHistory(history.filter(p => p.id !== id));
      setSelectedHistoryIds(prev => prev.filter(i => i !== id));
    } else {
      alert(result.error?.userMessage || 'Erreur lors de la suppression du document');
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-overlay-in"
        onClick={onClose}
      />
      <aside 
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl p-8 flex flex-col slide-over"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black text-2xl tracking-tighter text-slate-800 italic">Historique</h3>
          <button onClick={onClose} className="bg-slate-50 p-2 rounded-xl text-slate-400 hover:text-slate-900 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {history.length > 0 && (
          <div className="mb-4 flex items-center justify-between pb-4 border-b border-app-light-blue/20">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded accent-primary cursor-pointer"
                checked={selectedHistoryIds.length === history.length && history.length > 0}
                onChange={toggleSelectAll}
              />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tout sélectionner</span>
            </div>
            {selectedHistoryIds.length > 0 && (
              <button 
                onClick={deleteSelected}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[11px] font-bold hover:bg-red-100 transition-colors cursor-pointer"
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
                className={`group p-5 rounded-2xl bg-slate-50 border transition-all cursor-pointer relative flex gap-4 items-start ${selectedHistoryIds.includes(p.id) ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-primary/30 hover:bg-slate-50/80'}`}
                onClick={() => onLoadFromHistory(p)}
              >
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  className="pt-1"
                >
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                    checked={selectedHistoryIds.includes(p.id)}
                    onChange={() => toggleSelectProforma(p.id)}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-slate-800 text-sm mb-0.5">{p.client.name.toUpperCase()}</p>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{p.number}</p>
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
                        onClick={(e) => { e.stopPropagation(); onWhatsApp(p); }}
                        title="Partager sur WhatsApp"
                        className="p-1.5 text-slate-400 hover:text-green-500 transition-colors cursor-pointer"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onShare(p); }}
                        title="Partager"
                        className="p-1.5 text-slate-400 hover:text-primary transition-colors lg:hidden cursor-pointer"
                      >
                        <Share2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onExport(p); }}
                        title="Télécharger PDF"
                        className="p-1.5 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteFromHistory(p.id); }}
                        title="Supprimer"
                        className={`p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer ${selectedHistoryIds.includes(p.id) ? 'opacity-0 pointer-events-none' : ''}`}
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
            onClick={() => { resetForm(); onClose(); }}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-105 transition-colors uppercase tracking-widest text-xs cursor-pointer shadow-sm"
          >
            <Plus size={18} />
            Nouvelle {docType === 'PROFORMA' ? 'Proforma' : 'Facture'}
          </button>
        </div>
      </aside>
    </>
  );
}
