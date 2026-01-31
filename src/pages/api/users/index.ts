import type { APIRoute } from 'astro';
import { getSupabaseClient } from '@/lib/supabaseClient';
import crypto from 'crypto';

const supabase = getSupabaseClient();

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

    await supabase.from('users').insert({
      username,
      password_hash: hashedPassword
    });

    //!.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hashedPassword);
    const newUserId: any = await supabase.from('users').select('id').eq('username', username).single();
    await supabase.from('user_roles').insert({
      user_id: newUserId.data.id,
      role_id: role
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
    await supabase.from('user_roles').delete().eq('user_id', id);
    await supabase.from('users').delete().eq('id', id);

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