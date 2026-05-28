import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types pour la base de données
export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  created_at: string;
}

export interface Proforma {
  id: string;
  user_id: string;
  type: 'PROFORMA' | 'FACTURE';
  number: string;
  date: string;
  client_name: string;
  client_phone: string;
  items: any; // JSON
  discount_percent: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: string;
  user_id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  logo?: string;
  logo_width?: number;
  logo_height?: number;
  signature?: string;
  signature_width?: number;
  signature_height?: number;
  stamp?: string;
  stamp_width?: number;
  stamp_height?: number;
  watermark?: string;
  services?: string;
  siret?: string;
  siren?: string;
  rcs?: string;
  created_at: string;
  updated_at: string;
}
