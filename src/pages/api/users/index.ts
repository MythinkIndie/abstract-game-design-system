import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  try {

    const { username, password, role } = await request.json();
    
    if (!username || !password) {
      return new Response(JSON.stringify({ 
        error: 'Usuario y contraseña requeridos' 
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
    
    console.log('Creating user');

    // Hash de la contraseña
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    await db!.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hashedPassword);
    const newUserId: any = await db!.prepare('SELECT id FROM users WHERE username = ?').get(username);
    await db!.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(newUserId.id, role);

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

export const DELETE: APIRoute = async ({ request }) => {

  try {

    const {id, username} = await request.json();
    if (!id || !username) {
      return new Response(JSON.stringify({ 
        error: 'ID de usuario y nombre de usuario requeridos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    await db!.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id);
    await db!.prepare('DELETE FROM users WHERE id = ?').run(id);

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
}