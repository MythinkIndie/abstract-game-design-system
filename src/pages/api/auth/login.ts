import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

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
    const appUserRow = db!.prepare('SELECT username, password_hash FROM users WHERE username = ?').get(username) as any;
    
    if (!appUserRow) {
      return new Response(JSON.stringify({ 
        error: 'Nombre de usuario o contraseña incorrectos 1' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.log(appUserRow)
    
    // Verificar contraseña (hash SHA-256)
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    if (hashedPassword !== appUserRow.password_hash) {
      return new Response(JSON.stringify({ 
        error: 'Nombre de usuario o contraseña incorrectos 2' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Crear sesión
    const token = nanoid(32);
    const sessionId = nanoid();
    const now = new Date().toISOString();
    
    db!.prepare(`
      INSERT INTO sessions (id, token, username, created_at, last_activity)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, token, username, now, now);
    
    // Registrar actividad
    db!.prepare(`
      INSERT INTO activity_logs (id, username, action, details, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(nanoid(), username, 'login', 'Usuario inició sesión', now);
    
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
    // Eliminar sesión
    db!.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    
    // Registrar actividad
    if (username) {
      db!.prepare(`
        INSERT INTO activity_logs (id, username, action, details, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(nanoid(), username, 'logout', 'Usuario cerró sesión', new Date().toISOString());
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