import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function SupabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [message, setMessage] = useState('Vérification de la connexion...');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Tester la connexion en essayant de lire la table proformas
      const { error } = await supabase
        .from('proformas')
        .select('count')
        .limit(1);

      if (error) {
        setStatus('error');
        setMessage(`Erreur: ${error.message}`);
      } else {
        setStatus('connected');
        setMessage('Connecté à Supabase ✓');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(`Erreur: ${err?.message || 'Connexion impossible'}`);
    }
  };

  // Ne rien afficher en production
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
        status === 'checking' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
        status === 'connected' ? 'bg-green-50 text-green-700 border border-green-200' :
        'bg-red-50 text-red-700 border border-red-200'
      }`}>
        {status === 'checking' && <Loader2 size={16} className="animate-spin" />}
        {status === 'connected' && <CheckCircle2 size={16} />}
        {status === 'error' && <XCircle size={16} />}
        <span>{message}</span>
      </div>
    </div>
  );
}
