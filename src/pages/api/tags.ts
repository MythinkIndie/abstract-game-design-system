// src/pages/api/tags.ts
import type { APIRoute } from 'astro';
import { getSupabaseClient } from '@/lib/supabaseClient';

const supabase = getSupabaseClient();

// GET - Listar todas las etiquetas o buscar
export const GET: APIRoute = async ({ url }) => {
  try {
    const search = url.searchParams.get('search');
    const entryId = url.searchParams.get('entry_id');
    
    if (entryId) {
      // Obtener etiquetas de una entrada específica
      const tags = await supabase.from('tags').select('tags.*').eq('entry_tags.entry_id', entryId).order('name', { ascending: true });
      
      return new Response(JSON.stringify(tags.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const tags = await supabase.from('tags').select('*').order('usage_count', { ascending: false });
    
    return new Response(JSON.stringify(tags.data), {
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

// POST - Crear etiqueta o asignar a entrada
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, color, entry_id } = body;
    
    if (!name) {
      return new Response(JSON.stringify({ error: 'Tag name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Normalizar nombre (lowercase, trim)
    const normalizedName = name.trim().toLowerCase();
    
    // Buscar o crear etiqueta
    let tag = await supabase.from('tags').select('*').eq('name', normalizedName).single();
    
    if (!tag.data) {
      const tagColor = color || generateRandomColor();
      
      await supabase.from('tags').insert({
        name: normalizedName,
        color: tagColor,
        usage_count: 0,
        created_at: new Date().toISOString()
      });
      
      tag = await supabase.from('tags').select('*').eq('name', normalizedName).single();
    }
    
    // Si se proporciona entry_id, asignar etiqueta a entrada
    if (entry_id && tag.data) {
      const existing = await supabase.from('entry_tags').select('id').eq('entry_id', entry_id).eq('tag_id', tag.data.id).single();
      
      if (!existing.data) {

        await supabase.from('entry_tags').insert({
          entry_id,
          tag_id: tag.data.id
        });
        
        await supabase.from('tags').update({
          usage_count: tag.data.usage_count + 1
        }).eq('id', tag.data.id);
      
      }
    }
    
    return new Response(JSON.stringify(tag), {
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

// DELETE - Eliminar etiqueta de entrada o completamente
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { tag_id, entry_id, delete_completely } = await request.json();
    
    if (!tag_id) {
      return new Response(JSON.stringify({ error: 'tag_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (delete_completely) {
      // Eliminar etiqueta completamente
      await supabase.from('tags').delete().eq('id', tag_id);

    } else if (entry_id) {

      await supabase.from('entry_tags').delete().eq('entry_id', entry_id).eq('tag_id', tag_id);

      await supabase.from('tags').update({
        usage_count: supabase.gte('usage_count', 1)
      }).eq('id', tag_id);

    }
    
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

function generateRandomColor(): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}