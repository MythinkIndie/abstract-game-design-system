import { createClient } from '@supabase/supabase-js';

// Singleton del cliente Supabase
let supabaseClient: any | null = null;

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    // Usar service key en el middleware (server-side)
    const key = typeof window === 'undefined' 
      ? supabaseServiceKey || supabaseAnonKey
      : supabaseAnonKey;
    
    supabaseClient = createClient(supabaseUrl, key, {
      auth: {
        persistSession: false, // No persistir en server
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    });
  }
  
  return supabaseClient;
};

// Helper para obtener el cliente en el servidor con permisos elevados
export const getServiceClient = () => {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service key');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
};