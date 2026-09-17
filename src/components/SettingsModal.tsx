/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  CheckCircle2, 
  Building2, 
  Image as ImageIcon, 
  FileCheck, 
  UploadCloud,
  AlertCircle,
  Sliders
} from 'lucide-react';
import { CompanyInfo, DEFAULT_COMPANY } from '../types';
import { loadCompanyImages, saveCompanySettings } from '../lib/supabase-helpers';
import { validateCompanyInfo } from '../lib/validation';
import { formatValidationErrors } from '../lib/errors';
import { optimizeImageClient } from '../lib/image-optimizer';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyInfo: CompanyInfo;
  setCompanyInfo: React.Dispatch<React.SetStateAction<CompanyInfo>>;
  currentUserId: string | null;
}

type TabKey = 'general' | 'branding' | 'legal';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  companyInfo,
  setCompanyInfo,
  currentUserId
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveAndCloseSettings = async () => {
    setErrorMessage(null);
    if (!currentUserId) {
      setErrorMessage('Erreur : utilisateur non connecté.');
      return;
    }

    setIsSavingSettings(true);

    // ⚡ PROTECTION CRITIQUE : S'assurer que les images sont chargées avant de sauvegarder.
    let infoToSave = companyInfo;
    if (!companyInfo.logo && !companyInfo.signature && !companyInfo.stamp) {
      const existingImages = await loadCompanyImages(currentUserId);
      if (existingImages && (existingImages.logo || existingImages.signature || existingImages.stamp)) {
        infoToSave = {
          ...companyInfo,
          logo: existingImages.logo,
          signature: existingImages.signature,
          stamp: existingImages.stamp,
        };
        setCompanyInfo(infoToSave);
      }
    }

    // ✅ VALIDATION
    const validation = validateCompanyInfo(infoToSave);
    if (!validation.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = formatValidationErrors(validation.error.issues as any[]);
      setErrorMessage(errors);
      setIsSavingSettings(false);
      return;
    }

    const result = await saveCompanySettings(currentUserId, validation.data);
    setIsSavingSettings(false);
    
    if (result.success) {
      setSettingsSaved(true);
      window.setTimeout(() => {
        setSettingsSaved(false);
        onClose();
      }, 1200);
    } else {
      setErrorMessage(result.error?.userMessage || 'Erreur lors de la sauvegarde des paramètres.');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
        onClick={() => {
          if (!isSavingSettings) onClose();
        }}
      />

      {/* Modal Card */}
      <div 
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl relative z-10 flex flex-col animate-scale-in border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border flex justify-between items-center bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Paramètres de l'Entreprise</h3>
              <p className="text-xs text-muted-foreground">Personnalisez vos coordonnées, votre logo et vos mentions légales</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSavingSettings}
            className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border px-6 bg-white gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'general'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Building2 size={14} />
            <span>Coordonnées</span>
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'branding'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <ImageIcon size={14} />
            <span>Logo, Signature & Cachet</span>
          </button>
          <button
            onClick={() => setActiveTab('legal')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'legal'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <FileCheck size={14} />
            <span>Mentions Fiscales & Légales</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p className="whitespace-pre-line leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* TAB 1: COORDONNÉES */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nom commercial / Raison sociale *</label>
                <input 
                  type="text" 
                  value={companyInfo.name}
                  onChange={e => setCompanyInfo({...companyInfo, name: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-secondary/15 focus:border-secondary outline-none transition-all text-xs font-semibold"
                  placeholder="Ex: Studio Nova Design"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email professionnel *</label>
                  <input 
                    type="email" 
                    value={companyInfo.email}
                    onChange={e => setCompanyInfo({...companyInfo, email: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-secondary/15 focus:border-secondary outline-none transition-all text-xs font-semibold"
                    placeholder="contact@entreprise.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Téléphone *</label>
                  <input 
                    type="text" 
                    value={companyInfo.phone}
                    onChange={e => setCompanyInfo({...companyInfo, phone: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-secondary/15 focus:border-secondary outline-none transition-all text-xs font-semibold"
                    placeholder="+225 07 00 00 00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Adresse géographique</label>
                <textarea 
                  value={companyInfo.address}
                  onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-secondary/15 focus:border-secondary outline-none transition-all text-xs font-medium h-20 resize-none"
                  placeholder="Rue, Quartier, Ville, Pays..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Services proposés (affichés dans le pied de page du document)</label>
                <textarea 
                  value={companyInfo.services || ''}
                  onChange={e => setCompanyInfo({...companyInfo, services: e.target.value})}
                  placeholder="Ex: Stratégie Digitale · Création Web · Référencement SEO..."
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-secondary/15 focus:border-secondary outline-none transition-all text-xs font-medium h-20 resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: BRANDING */}
          {activeTab === 'branding' && (
            <div className="space-y-5 animate-fade-in">
              {/* Logo Card */}
              <div className="p-4 rounded-2xl border border-border bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Logo de l'entreprise</h4>
                    <p className="text-[10px] text-muted-foreground">Format PNG transparent ou JPEG haute résolution</p>
                  </div>
                  {companyInfo.logo && (
                    <button 
                      onClick={() => setCompanyInfo({ ...companyInfo, logo: undefined })}
                      className="text-xs font-bold text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Supprimer
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {companyInfo.logo ? (
                    <div className="w-20 h-20 bg-white rounded-xl border border-border p-2 flex items-center justify-center shrink-0">
                      <img src={companyInfo.logo} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-slate-100 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon size={24} />
                    </div>
                  )}

                  <label className="flex-1 border border-dashed border-slate-300 hover:border-secondary rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-all text-center">
                    <UploadCloud size={20} className="text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-700">
                      {companyInfo.logo ? 'Remplacer le logo' : 'Cliquez pour sélectionner un logo'}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Optimisation automatique &lt; 200 Ko</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          optimizeImageClient(file, 800, 800, 0.8)
                            .then(opt => setCompanyInfo(prev => ({ ...prev, logo: opt.data })))
                            .catch(() => {
                              const reader = new FileReader();
                              reader.onload = ev => setCompanyInfo(prev => ({ ...prev, logo: ev.target?.result as string }));
                              reader.readAsDataURL(file);
                            });
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Logo Dimensions */}
                {companyInfo.logo && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Largeur affichée (mm)</label>
                      <input 
                        type="number" 
                        value={companyInfo.logoWidth || 18}
                        onChange={e => setCompanyInfo({...companyInfo, logoWidth: parseFloat(e.target.value) || 18})}
                        min="5" max="60"
                        className="w-full px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Hauteur affichée (mm)</label>
                      <input 
                        type="number" 
                        value={companyInfo.logoHeight || 18}
                        onChange={e => setCompanyInfo({...companyInfo, logoHeight: parseFloat(e.target.value) || 18})}
                        min="5" max="60"
                        className="w-full px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Signature & Cachet Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Signature */}
                <div className="p-4 rounded-2xl border border-border bg-slate-50/60 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-900">Signature</h4>
                    {companyInfo.signature && (
                      <button 
                        onClick={() => setCompanyInfo({ ...companyInfo, signature: undefined })}
                        className="text-[10px] font-bold text-destructive hover:underline cursor-pointer"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  <label className="border border-dashed border-slate-300 hover:border-secondary rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-all text-center min-h-[90px]">
                    {companyInfo.signature ? (
                      <img src={companyInfo.signature} alt="Signature" className="max-h-12 object-contain" />
                    ) : (
                      <>
                        <UploadCloud size={16} className="text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Charger signature</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          optimizeImageClient(file, 400, 400, 0.8)
                            .then(opt => setCompanyInfo(prev => ({ ...prev, signature: opt.data })))
                            .catch(() => {
                              const reader = new FileReader();
                              reader.onload = ev => setCompanyInfo(prev => ({ ...prev, signature: ev.target?.result as string }));
                              reader.readAsDataURL(file);
                            });
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Cachet */}
                <div className="p-4 rounded-2xl border border-border bg-slate-50/60 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-900">Cachet officiel</h4>
                    {companyInfo.stamp && (
                      <button 
                        onClick={() => setCompanyInfo({ ...companyInfo, stamp: undefined })}
                        className="text-[10px] font-bold text-destructive hover:underline cursor-pointer"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  <label className="border border-dashed border-slate-300 hover:border-secondary rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-all text-center min-h-[90px]">
                    {companyInfo.stamp ? (
                      <img src={companyInfo.stamp} alt="Cachet" className="max-h-12 object-contain" />
                    ) : (
                      <>
                        <UploadCloud size={16} className="text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Charger cachet</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          optimizeImageClient(file, 400, 400, 0.8)
                            .then(opt => setCompanyInfo(prev => ({ ...prev, stamp: opt.data })))
                            .catch(() => {
                              const reader = new FileReader();
                              reader.onload = ev => setCompanyInfo(prev => ({ ...prev, stamp: ev.target?.result as string }));
                              reader.readAsDataURL(file);
                            });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEGAL */}
          {activeTab === 'legal' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl border border-border bg-slate-50/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Identifiants Légaux</h4>
                <p className="text-[11px] text-muted-foreground">Ces mentions apparaissent automatiquement dans l'en-tête et le pied de page du PDF.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Numéro SIRET</label>
                    <input 
                      type="text" 
                      value={companyInfo.siret || ''}
                      onChange={e => setCompanyInfo({...companyInfo, siret: e.target.value})}
                      placeholder="123 456 789 00012"
                      maxLength={20}
                      className="w-full px-3.5 py-2.5 bg-white border border-border rounded-xl text-xs font-mono font-semibold outline-none focus:border-secondary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Numéro SIREN</label>
                    <input 
                      type="text" 
                      value={companyInfo.siren || ''}
                      onChange={e => setCompanyInfo({...companyInfo, siren: e.target.value})}
                      placeholder="123 456 789"
                      maxLength={15}
                      className="w-full px-3.5 py-2.5 bg-white border border-border rounded-xl text-xs font-mono font-semibold outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-700">Registre du Commerce (RCS / RCCM)</label>
                  <input 
                    type="text" 
                    value={companyInfo.rcs || ''}
                    onChange={e => setCompanyInfo({...companyInfo, rcs: e.target.value})}
                    placeholder="RCS Paris B 123 456 789 ou RCCM CI-ABJ-..."
                    className="w-full px-3.5 py-2.5 bg-white border border-border rounded-xl text-xs font-semibold outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Filigrane personnalisé (optionnel)</label>
                <input 
                  type="text" 
                  value={companyInfo.watermark || ''}
                  onChange={e => setCompanyInfo({...companyInfo, watermark: e.target.value})}
                  placeholder="Ex: DUPLICATA, PAYÉ, ou laisser vide"
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-border rounded-xl text-xs font-medium outline-none focus:border-secondary"
                />
                <p className="text-[10px] text-muted-foreground">Si laissé vide, le type du document (PROFORMA ou FACTURE) sera utilisé.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-border bg-slate-50/70 flex gap-3 shrink-0">
          <button 
            onClick={onClose}
            disabled={isSavingSettings}
            className="px-5 py-2.5 bg-white border border-border text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
          >
            Annuler
          </button>
          <button 
            onClick={handleSaveAndCloseSettings}
            disabled={isSavingSettings || settingsSaved}
            className="flex-1 py-2.5 bg-primary hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSavingSettings ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sauvegarde des paramètres...</span>
              </>
            ) : settingsSaved ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Enregistré avec succès !</span>
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
