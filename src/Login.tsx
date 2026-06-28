/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
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
    <div className="min-h-screen bg-gradient-to-br from-app-light-blue/30 via-white to-app-yellow/20 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-app-yellow/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-app-light-blue/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-app-navy/10 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-app-navy to-app-navy/90 p-8 text-center">
            <div className="w-16 h-16 bg-app-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-fade-in-scale">
              <span className="text-3xl font-black text-app-navy">X</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">XorForm</h1>
            <p className="text-app-light-blue/80 text-sm font-medium">Générateur de Proforma Professionnel</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-app-navy mb-2">Bienvenue !</h2>
            <p className="text-slate-500 text-sm mb-6">Connectez-vous pour accéder à votre espace</p>

            {forgotSent ? (
              <div className="animate-fade-in text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-slate-800">Email envoyé !</p>
                <p className="text-sm text-slate-500">Vérifiez votre boîte mail pour le lien de réinitialisation.</p>
                <button
                  onClick={() => setForgotSent(false)}
                  className="text-app-navy font-semibold text-sm hover:underline"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-app-navy/20 focus:border-app-navy outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-app-navy/20 focus:border-app-navy outline-none transition-all text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-app-navy transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="animate-fade-in-down bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-app-navy focus:ring-app-navy/20 cursor-pointer"
                  />
                  <span className="text-slate-600 group-hover:text-app-navy transition-colors font-medium">
                    Se souvenir
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isSendingReset}
                  className="text-app-navy hover:text-app-navy/80 font-semibold transition-colors disabled:opacity-50"
                >
                  {isSendingReset ? 'Envoi...' : 'Mot de passe oublié ?'}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-app-navy text-white py-4 rounded-xl font-bold text-sm hover:bg-app-navy/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-app-navy/20 flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
            )}

            {/* Sign Up Link */}
            {!forgotSent && (
              <p className="text-center text-sm text-slate-500 mt-6">
                Pas encore de compte ?{' '}
                <button onClick={onShowRegister} className="text-app-navy font-bold hover:underline">
                  Créer un compte
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 XorForm. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
