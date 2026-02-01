import { getSupabaseClient } from '@/lib/supabaseClient';
import type { APIRoute } from 'astro';

const supabase = getSupabaseClient();

// GET - Listar estados
export const GET: APIRoute = async () => {
  try {
    const statuses = await supabase.from('task_statuses').select('*').order('order_index', { ascending: true });
    
    return new Response(JSON.stringify(statuses.data), {
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

// POST - Crear estado personalizado
export const POST: APIRoute = async ({ request }) => {
  try {
    const { name, color, icon } = await request.json();
    
    if (!name) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    
    // Obtener el orden más alto
    const maxOrder = await supabase.from('task_statuses').select('MAX(order_index) as max').single();
    const orderIndex = (maxOrder?.data?.max || 0) + 1;

    await supabase.from('task_statuses').insert([{
      name,
      slug,
      color: color || '#6b7280',
      icon: icon || '📌',
      order_index: orderIndex,
      is_default: false,
      is_final: false,
      created_at: new Date().toISOString()
    }]);
    
    const newStatus = await supabase.from('task_statuses').select('*').eq('order_index', orderIndex).single();
    
    return new Response(JSON.stringify(newStatus.data), {
      status: 201,
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

// PUT - Actualizar estado
export const PUT: APIRoute = async ({ request }) => {
  try {
    const { id, name, color, icon, order_index } = await request.json();
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name) {
      updates.push('name = ?');
      values.push(name);
      updates.push('slug = ?');
      values.push(name.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
    }
    if (color) {
      updates.push('color = ?');
      values.push(color);
    }
    if (icon) {
      updates.push('icon = ?');
      values.push(icon);
    }
    if (order_index !== undefined) {
      updates.push('order_index = ?');
      values.push(order_index);
    }
    
    values.push(id);

    await supabase 
      .from('task_statuses')
      .update(Object.fromEntries(updates.map((u, i) => [u.split(' = ')[0], values[i]])))
      .eq('id', id);
    
    const updated = await supabase.from('task_statuses').select('*').eq('id', id).single();
    
    return new Response(JSON.stringify(updated.data), {
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

// DELETE - Eliminar estado
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    
    // No permitir eliminar estados por defecto
    const status = await supabase.from('task_statuses').select('is_default').eq('id', id).single();
    
    if (status?.data?.is_default) {
      return new Response(JSON.stringify({ 
        error: 'No se pueden eliminar estados por defecto' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await supabase.from('task_statuses').delete().eq('id', id);
    
    return new Response(JSON.stringify({ success: true }), {
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