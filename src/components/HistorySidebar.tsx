/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Trash2, 
  Calendar, 
  MessageSquare, 
  Share2, 
  Download, 
  Plus, 
  History as HistoryIcon,
  Search,
  FileText,
  Filter
} from 'lucide-react';
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

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  history,
  setHistory,
  selectedHistoryIds,
  setSelectedHistoryIds,
  onLoadFromHistory,
  currentUserId,
  setIsLoadingData,
  docType,
  resetForm,
  onWhatsApp,
  onShare,
  onExport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PROFORMA' | 'FACTURE'>('ALL');

  if (!isOpen) return null;

  // Filtrage intelligent
  const filteredHistory = history.filter(p => {
    const matchesSearch = 
      (p.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.number || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const toggleSelectAll = () => {
    if (selectedHistoryIds.length === filteredHistory.length && filteredHistory.length > 0) {
      setSelectedHistoryIds([]);
    } else {
      setSelectedHistoryIds(filteredHistory.map(p => p.id));
    }
  };

  const toggleSelectProforma = (id: string) => {
    setSelectedHistoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (selectedHistoryIds.length === 0 || !currentUserId) return;
    if (window.confirm(`Supprimer définitivement ${selectedHistoryIds.length} document(s) ?`)) {
      setIsLoadingData(true);
      const result = await deleteMultipleProformas(selectedHistoryIds, currentUserId);
      setIsLoadingData(false);
      if (result.success) {
        setHistory(history.filter(p => !selectedHistoryIds.includes(p.id)));
        setSelectedHistoryIds([]);
      }
    }
  };

  const deleteFromHistory = async (id: string) => {
    if (!currentUserId) return;
    if (window.confirm('Supprimer définitivement ce document ?')) {
      setIsLoadingData(true);
      const result = await deleteProforma(id, currentUserId);
      setIsLoadingData(false);
      if (result.success) {
        setHistory(history.filter(p => p.id !== id));
        setSelectedHistoryIds(prev => prev.filter(i => i !== id));
      }
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside 
        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col slide-over border-l border-border"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <HistoryIcon size={17} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-slate-900">Historique des Documents</h3>
              <p className="text-[11px] text-muted-foreground">{history.length} document(s) enregistrés</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-50/70 border-b border-border/80 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher par client ou numéro..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-border rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:border-secondary focus:ring-2 focus:ring-secondary/15 outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-border text-[10px] font-bold">
              <button 
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  filterType === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tous
              </button>
              <button 
                onClick={() => setFilterType('PROFORMA')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  filterType === 'PROFORMA' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Devis
              </button>
              <button 
                onClick={() => setFilterType('FACTURE')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  filterType === 'FACTURE' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Factures
              </button>
            </div>

            {/* Selection actions */}
            {filteredHistory.length > 0 && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleSelectAll}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {selectedHistoryIds.length === filteredHistory.length ? 'Désélectionner' : 'Tout sélectionner'}
                </button>
                {selectedHistoryIds.length > 0 && (
                  <button 
                    onClick={deleteSelected}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-destructive rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    <Trash2 size={11} />
                    <span>Supprimer ({selectedHistoryIds.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Document List */}
        {filteredHistory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Aucun document trouvé</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                {searchQuery ? 'Aucun résultat ne correspond à votre recherche.' : 'Vos devis et factures enregistrés apparaîtront ici.'}
              </p>
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-secondary hover:underline cursor-pointer pt-1"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredHistory.map(p => {
              const isSelected = selectedHistoryIds.includes(p.id);
              const isProforma = p.type === 'PROFORMA';

              return (
                <div 
                  key={p.id}
                  onClick={() => onLoadFromHistory(p)}
                  className={`group p-4 rounded-2xl border transition-all cursor-pointer relative flex gap-3.5 items-start ${
                    isSelected 
                      ? 'border-secondary bg-blue-50/40 shadow-xs' 
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="pt-0.5"
                  >
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-secondary cursor-pointer"
                      checked={isSelected}
                      onChange={() => toggleSelectProforma(p.id)}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                            isProforma 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}>
                            {isProforma ? 'Devis' : 'Facture'}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-slate-500">
                            #{p.number}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-xs truncate">
                          {p.client?.name ? p.client.name.toUpperCase() : 'CLIENT SANS NOM'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-mono font-extrabold text-sm text-slate-900">
                          {p.total.toLocaleString()} <span className="text-[10px] text-slate-500 font-semibold">F</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                        <Calendar size={11} />
                        <span>{format(new Date(p.date), 'dd MMM yyyy')}</span>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-0.5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onWhatsApp(p); }}
                          title="WhatsApp"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <MessageSquare size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onShare(p); }}
                          title="Partager"
                          className="p-1.5 text-slate-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors lg:hidden cursor-pointer"
                        >
                          <Share2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onExport(p); }}
                          title="Exporter PDF"
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteFromHistory(p.id); }}
                          title="Supprimer"
                          className="p-1.5 text-slate-400 hover:text-destructive hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Drawer Footer */}
        <div className="p-4 border-t border-border bg-slate-50/70">
          <button 
            onClick={() => { resetForm(); onClose(); }}
            className="w-full py-3 bg-primary hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <Plus size={15} />
            <span>Nouveau {docType === 'PROFORMA' ? 'Devis Pro-forma' : 'Facture'}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default HistorySidebar;
