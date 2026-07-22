/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, Building, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from './lib/supabase';

interface RegisterProps {
  onRegister: (userData: {
    name: string;
    email: string;
    password: string;
    company: string;
  }) => void;
  onBackToLogin: () => void;
}

export default function Register({ onRegister, onBackToLogin }: RegisterProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.company || !formData.password || !formData.confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!acceptTerms) {
      setError('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    setIsLoading(true);

    try {
      // Créer le compte avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            company: formData.company
          }
        }
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // Créer les paramètres d'entreprise par défaut
        const { error: settingsError } = await supabase
          .from('company_settings')
          .insert({
            user_id: authData.user.id,
            name: formData.company,
            address: '123 Rue du Commerce, Paris',
            email: formData.email,
            phone: '01 23 45 67 89'
          });

        if (settingsError) {
          console.error('Erreur lors de la création des paramètres:', settingsError);
        }

        // Appeler onRegister pour mettre à jour l'état de l'application
        onRegister({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          company: formData.company
        });
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Motifs géométriques discrets en arrière-plan */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-40 -right-40 w-96 h-96 border border-border rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 border border-border rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Bouton retour minimaliste */}
        <button
          onClick={onBackToLogin}
          className="flex items-center gap-2 text-slate-500 hover:text-primary mb-6 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Retour à la connexion</span>
        </button>

        {/* Conteneur principal style carte minimale */}
        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
          
          {/* En-tête minimaliste */}
          <div className="p-8 text-center pb-4 pt-10">
            <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <span className="text-3xl font-black">X</span>
            </div>
            <h1 className="text-4xl font-black text-primary tracking-tight mb-2">Créer un compte</h1>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Rejoignez XorForm</p>
          </div>

          {/* Formulaire d'inscription */}
          <div className="px-8 pb-8 pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nom Complet */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Nom complet
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jean Dupont"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Adresse E-mail */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jean@entreprise.com"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Entreprise */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Nom de l'entreprise
                </label>
                <div className="relative">
                  <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Mon Entreprise SARL"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-slate-50/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">6 caractères minimum</p>
              </div>

              {/* Confirmation Mot de passe */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-slate-50/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Messages d'erreur */}
              {error && (
                <div className="animate-fade-in-down bg-red-50 border border-red-100 text-destructive px-4 py-3 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Conditions d'utilisation */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-border text-primary accent-primary focus:ring-primary/10 cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed cursor-pointer font-medium">
                  J'accepte les{' '}
                  <button type="button" className="text-primary font-bold hover:underline cursor-pointer">
                    conditions d'utilisation
                  </button>
                  {' '}et la{' '}
                  <button type="button" className="text-primary font-bold hover:underline cursor-pointer">
                    politique de confidentialité
                  </button>
                </label>
              </div>

              {/* Bouton d'inscription */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/95 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer shadow-sm mt-6"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <span>Créer mon compte</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Lien de connexion */}
            <p className="text-center text-xs text-slate-500 mt-8">
              Vous avez déjà un compte ?{' '}
              <button onClick={onBackToLogin} className="text-primary font-bold hover:underline cursor-pointer">
                Se connecter
              </button>
            </p>
          </div>
        </div>

        {/* Pied de page */}
        <p className="text-center text-[10px] text-slate-400 mt-8">
          © 2026 XorForm. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
