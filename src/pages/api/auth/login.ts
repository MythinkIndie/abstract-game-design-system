import type { APIRoute } from 'astro';
import { getServiceClient } from '@/lib/supabaseClient';
import crypto from 'crypto';

const supabase = getServiceClient();

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return new Response(JSON.stringify({ 
        error: 'Usuario y contraseña requeridos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Obtener contraseña guardada
    const appUserRow = await supabase.from('users').select('username, password_hash').eq('username', username).single();
    
    if (!appUserRow) {
      return new Response(JSON.stringify({ 
        error: 'Nombre de usuario o contraseña incorrectos 1' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar contraseña (hash SHA-256)
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    if (hashedPassword !== appUserRow.data!.password_hash) {
      return new Response(JSON.stringify({ 
        error: 'Nombre de usuario o contraseña incorrectos 2' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Crear sesión
    const now = new Date().toISOString();
    const token = crypto.randomBytes(32).toString('hex');

    await supabase.from('sessions').insert({
      token,
      username,
      created_at: now,
      last_activity: now
    });
    
    await supabase.from('activity_logs').insert({
      username,
      action: 'login',
      details: 'Usuario inició sesión',
      created_at: now
    });
    
    // Establecer cookies (7 días)
    cookies.set('auth_token', token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      httpOnly: true,
      sameSite: 'lax'
    });
    
    cookies.set('username', username, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax'
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      username 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// src/pages/api/auth/logout.ts
export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get('auth_token')?.value;
  const username = cookies.get('username')?.value;
  
  if (token) {
    
    await supabase.from('sessions').delete().eq('token', token);
    
    // Registrar actividad
    if (username) {
      await supabase.from('activity_logs').insert({
        id: crypto.randomUUID(),
        username,
        action: 'logout',
        details: 'Usuario cerró sesión',
        created_at: new Date().toISOString()
      });
    }
  }
  
  // Eliminar cookies
  cookies.delete('auth_token', { path: '/' });
  cookies.delete('username', { path: '/' });
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};