// src/pages/api/categories.ts
import type { APIRoute } from 'astro';
import { getSupabaseClient } from '@/lib/supabaseClient';

const supabase = getSupabaseClient();
// GET - Listar todas las categorías
export const GET: APIRoute = async ({ url }) => {
  try {
    
    const categories = await supabase.from('categories').select('*').eq('is_system', 0).order('name', { ascending: true });
    
    return new Response(JSON.stringify(categories.data), {
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

// POST - Crear nueva categoría
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, slug, description, icon, color, inherits_from } = body;
    
    // Validaciones
    if (!name || !slug) {
      return new Response(JSON.stringify({ 
        error: 'Name and slug are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const now = new Date().toISOString();
    
    // Obtener el ID de Entity para heredar
    const entityCategory = await supabase.from('categories').select('id').eq('slug', 'entity').single();
    const inheritsFrom = inherits_from || (entityCategory.data ? entityCategory.data.id : null);
    
    await supabase.from('categories').insert({
      name: name,
      slug: slug,
      description: description || '',
      is_system: 0,
      inherits_from: inheritsFrom,
      icon: icon || 'box',
      color: color || '#6b7280',
      created_at: now
    });

    const newCategoryRecord = await supabase.from('categories').select('id').eq('slug', slug).single();
    
    // Si hereda de Entity, copiar sus campos base
    if (inheritsFrom) {
      const parentFields = await supabase.from('fields').select('*').eq('category_id', inheritsFrom);
      
      for (const field of parentFields.data as any[]) {

        await supabase.from('fields').insert({ 
          category_id: newCategoryRecord.data.id,
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required,
          unique_value: field.unique_value,
          config: field.config,
          field_order: field.field_order,
          help_text: field.help_text
        });
      }
    }
    
    const newCategory = await supabase.from('categories').select('*').eq('id', newCategoryRecord.data.id).single();
    
    return new Response(JSON.stringify(newCategory.data), {
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

// DELETE - Eliminar categoría
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verificar que no sea una categoría del sistema
    const category = await supabase.from('categories').select('is_system').eq('id', id).single();
    
    if (category.data && category.data.is_system === 1) {
      return new Response(JSON.stringify({ 
        error: 'Cannot delete system categories' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await supabase.from('categories').delete().eq('id', id);
    
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