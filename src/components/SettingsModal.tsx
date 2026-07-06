/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Trash2, CheckCircle2 } from 'lucide-react';
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

export default function SettingsModal({
  isOpen,
  onClose,
  companyInfo,
  setCompanyInfo,
  currentUserId
}: SettingsModalProps) {
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  if (!isOpen) return null;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = formatValidationErrors(validation.error.issues as any[]);
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
        onClose();
      }, 1500);
    } else {
      console.error('❌ Échec de la sauvegarde');
      alert(result.error?.userMessage || 'Erreur lors de la sauvegarde des paramètres.');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-overlay-in"
        onClick={() => {
          if (!isSavingSettings) onClose();
        }}
      />
      <div 
        className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl relative z-10 flex flex-col animate-scale-in"
      >
        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h3 className="font-bold text-xl text-slate-800">Paramètres Entreprise</h3>
          <button 
            onClick={onClose} 
            disabled={isSavingSettings}
            className="text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adresse complète</label>
              <textarea 
                value={companyInfo.address}
                onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium h-24 resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email professionnel</label>
              <input 
                type="email" 
                value={companyInfo.email}
                onChange={e => setCompanyInfo({...companyInfo, email: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filigrane (Watermark)</label>
              <input 
                type="text" 
                value={companyInfo.watermark || ''}
                onChange={e => setCompanyInfo({...companyInfo, watermark: e.target.value})}
                placeholder="Laisse vide pour PROFORMA/FACTURE"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nos Services (affichés en haut)</label>
              <textarea 
                value={companyInfo.services || ''}
                onChange={e => setCompanyInfo({...companyInfo, services: e.target.value})}
                placeholder="Liste de vos services ou description courte..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium h-20 resize-none"
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">RCS (Registre du Commerce)</label>
                  <input 
                    type="text" 
                    value={companyInfo.rcs || ''}
                    onChange={e => setCompanyInfo({...companyInfo, rcs: e.target.value})}
                    placeholder="RCS Paris B 123 456 789"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logo de l'entreprise</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center px-4 py-3 bg-white border border-slate-200 border-dashed rounded-2xl cursor-pointer hover:border-primary transition-all text-xs font-medium text-slate-500">
                    {companyInfo.logo ? 'Changer logo' : 'Logo'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          optimizeImageClient(file, 800, 800, 0.8)
                            .then(opt => {
                              setCompanyInfo(prev => ({ ...prev, logo: opt.data }));
                            })
                            .catch(err => {
                              console.warn("Erreur d'optimisation du logo, chargement brut :", err);
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                setCompanyInfo(prev => ({ ...prev, logo: base64 }));
                              };
                              reader.readAsDataURL(file);
                            });
                        }
                      }}
                    />
                  </label>
                  {companyInfo.logo && (
                    <button 
                      onClick={() => setCompanyInfo({ ...companyInfo, logo: undefined })}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Logo Dimensions */}
            {companyInfo.logo && (
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-border p-4 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Largeur du logo (mm)</label>
                  <input 
                    type="number" 
                    value={companyInfo.logoWidth || 15}
                    onChange={e => setCompanyInfo({...companyInfo, logoWidth: parseFloat(e.target.value) || 15})}
                    placeholder="15"
                    min="5"
                    max="50"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
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
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Signature</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center px-4 py-3 bg-white border border-slate-200 border-dashed rounded-2xl cursor-pointer hover:border-primary transition-all text-xs font-medium text-slate-500">
                    {companyInfo.signature ? 'Changer' : 'Charger'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          optimizeImageClient(file, 400, 400, 0.8)
                            .then(opt => {
                              setCompanyInfo(prev => ({ ...prev, signature: opt.data }));
                            })
                            .catch(err => {
                              console.warn("Erreur d'optimisation de la signature, chargement brut :", err);
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                setCompanyInfo(prev => ({ ...prev, signature: base64 }));
                              };
                              reader.readAsDataURL(file);
                            });
                        }
                      }}
                    />
                  </label>
                  {companyInfo.signature && (
                    <button 
                      onClick={() => setCompanyInfo({ ...companyInfo, signature: undefined })}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cachet</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center px-4 py-3 bg-white border border-slate-200 border-dashed rounded-2xl cursor-pointer hover:border-primary transition-all text-xs font-medium text-slate-500">
                    {companyInfo.stamp ? 'Changer' : 'Charger'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          optimizeImageClient(file, 400, 400, 0.8)
                            .then(opt => {
                              setCompanyInfo(prev => ({ ...prev, stamp: opt.data }));
                            })
                            .catch(err => {
                              console.warn("Erreur d'optimisation du cachet, chargement brut :", err);
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                setCompanyInfo(prev => ({ ...prev, stamp: base64 }));
                              };
                              reader.readAsDataURL(file);
                            });
                        }
                      }}
                    />
                  </label>
                  {companyInfo.stamp && (
                    <button 
                      onClick={() => setCompanyInfo({ ...companyInfo, stamp: undefined })}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Dimensions Signature et Cachet */}
            {(companyInfo.signature || companyInfo.stamp) && (
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-border p-4 rounded-2xl">
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium"
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium"
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium"
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium"
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
              onClick={onClose}
              disabled={isSavingSettings}
              className="px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Annuler
            </button>
            <button 
              onClick={handleSaveAndCloseSettings}
              disabled={isSavingSettings || settingsSaved}
              className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/10 hover:brightness-110 transition-all active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
  );
}
