/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { supabase } from './lib/supabase';

interface LoginProps {
  onLogin: (email: string, password: string) => void;
  onShowRegister: () => void;
}

export default function Login({ onLogin, onShowRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        onLogin(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Entrez votre email ci-dessus pour recevoir le lien de réinitialisation');
      return;
    }
    setError('');
    setIsSendingReset(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setForgotSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi du lien');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Motifs de fond géométriques discrets */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-40 -right-40 w-96 h-96 border border-border rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 border border-border rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Conteneur principal style carte minimale */}
        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
          
          {/* En-tête minimaliste et affirmé */}
          <div className="p-8 text-center pb-4 pt-10">
            <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <span className="text-3xl font-black">X</span>
            </div>
            <h1 className="text-4xl font-black text-primary tracking-tight mb-2">XorForm</h1>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Facturation & Proforma</p>
          </div>

          {/* Formulaire */}
          <div className="px-8 pb-8 pt-4">
            <h2 className="text-xl font-bold text-foreground mb-1">Bienvenue</h2>
            <p className="text-slate-500 text-xs mb-6">Connectez-vous pour accéder à votre espace de travail</p>

            {forgotSent ? (
              <div className="animate-fade-in text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-foreground">Lien de réinitialisation envoyé</p>
                <p className="text-xs text-slate-500">Veuillez vérifier votre boîte de réception pour continuer.</p>
                <button
                  onClick={() => setForgotSent(false)}
                  className="text-primary font-semibold text-xs hover:underline cursor-pointer"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Saisie de l'Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@entreprise.com"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Saisie du Mot de passe */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Messages d'erreur */}
                {error && (
                  <div className="animate-fade-in-down bg-red-50 border border-red-100 text-destructive px-4 py-3 rounded-xl text-xs font-semibold">
                    {error}
                  </div>
                )}

                {/* Options supplémentaires */}
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border text-primary accent-primary focus:ring-primary/10 cursor-pointer"
                    />
                    <span className="text-slate-500 group-hover:text-primary transition-colors font-medium">
                      Se souvenir de moi
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSendingReset}
                    className="text-primary hover:text-primary/80 font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingReset ? 'Envoi...' : 'Mot de passe oublié ?'}
                  </button>
                </div>

                {/* Bouton de validation */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/95 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connexion...</span>
                    </>
                  ) : (
                    <>
                      <span>Se connecter</span>
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Lien d'inscription */}
            {!forgotSent && (
              <p className="text-center text-xs text-slate-500 mt-8">
                Pas encore de compte ?{' '}
                <button onClick={onShowRegister} className="text-primary font-bold hover:underline cursor-pointer">
                  Créer un compte
                </button>
              </p>
            )}
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
