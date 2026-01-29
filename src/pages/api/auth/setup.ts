import type { APIRoute } from 'astro';
import { addTables, db, initDb } from '@/lib/db';
import crypto from 'crypto';

// GET - Verificar si ya está configurado
export const GET: APIRoute = async () => {
  try {
    const appPassword = db?.prepare('SELECT value FROM app_settings WHERE key = ?').get('app_password');
    const privateMode = db?.prepare('SELECT value FROM app_settings WHERE key = ?').get('private_mode') as any;
    
    return new Response(JSON.stringify({ 
      configured: !!appPassword,
      private_mode: privateMode?.value === 'true'
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

// POST - Configurar contraseña y modo privado
export const POST: APIRoute = async ({ request, cookies }) => {
  try {

    const { adminuser, password, enable_private_mode } = await request.json();
    
    if (!adminuser || adminuser.length < 3) {
      return new Response(JSON.stringify({ 
        error: 'El nombre de usuario debe tener al menos 3 caracteres' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!password || password.length < 8) {
      return new Response(JSON.stringify({ 
        error: 'La contraseña debe tener al menos 8 caracteres' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Hash de la contraseña
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    await initDb();
    await addTables();

    // ========================================
    // Autentificación
    // ========================================
    
    db!.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(adminuser, hashedPassword);
    db!.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(1, 1);

    const modeValue = enable_private_mode ? 'true' : 'false';
    
    db!.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('private_mode', modeValue);
    
    // Si se activó el modo privado, limpiar sesiones existentes
    if (enable_private_mode) {
      db!.prepare('DELETE FROM sessions').run();
      cookies.delete('auth_token', { path: '/' });
      cookies.delete('username', { path: '/' });
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      private_mode: enable_private_mode
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