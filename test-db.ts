import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Ok' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectDb() {
  console.log('\n--- Inspection de la table company_settings ---');
  const { data, error } = await supabase
    .from('company_settings')
    .select('*');
    
  if (error) {
    console.error('Erreur:', error);
  } else {
    console.log(`Nombre de lignes trouvées: ${data?.length}`);
    console.log('Données:', JSON.stringify(data, null, 2));
  }
}

inspectDb();
