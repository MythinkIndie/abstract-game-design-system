// src/pages/api/entries.ts
import type { APIRoute } from 'astro';
import { getSupabaseClient } from '@/lib/supabaseClient';

const supabase = getSupabaseClient();

// GET - Obtener entradas de una categoría
export const GET: APIRoute = async ({ url }) => {
  try {
    const categoryId = url.searchParams.get('category_id');
    const entryId = url.searchParams.get('id');
    
    if (entryId) {
      const entry = await supabase.from('entries').select('*').eq('id', entryId).single();
      
      if (!entry || !entry.data) {
        return new Response(JSON.stringify({ error: 'Entry not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(entry), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!categoryId) {
      return new Response(JSON.stringify({ 
        error: 'category_id or id is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const entries = await supabase.from('entries').select('*').eq('category_id', categoryId).order('created_at', { ascending: false });
    
    return new Response(JSON.stringify(entries.data), {
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

// POST - Crear nueva entrada
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { category_id, title, data } = body;
    
    if (!category_id || !title || !data) {
      return new Response(JSON.stringify({ 
        error: 'category_id, title, and data are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await supabase.from('entries').insert({
      category_id: category_id,
      title: title,
      data: typeof data === 'string' ? data : JSON.stringify(data),
    });

    const newEntryRecord = await supabase.from('entries').select('id').order('created_at', { ascending: false }).limit(1).single();

    const newEntry = await supabase.from('entries').select('*').eq('id', newEntryRecord.data.id).single();
    
    return new Response(JSON.stringify(newEntry.data), {
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

// PUT - Actualizar entrada
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, title, data } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await supabase.from('entries').update({
      ...(title !== undefined && { title }),
      ...(data !== undefined && { data: typeof data === 'string' ? data : JSON.stringify(data) })
    }).eq('id', id);
    
    const updatedEntry = await supabase.from('entries').select('*').eq('id', id).single();
    
    return new Response(JSON.stringify(updatedEntry.data), {
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

// DELETE - Eliminar entrada
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await supabase.from('entries').delete().eq('id', id);
    
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