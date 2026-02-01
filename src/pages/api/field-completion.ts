// src/pages/api/field-completion.ts
import type { APIRoute } from 'astro';
import { getSupabaseClient } from '@/lib/supabaseClient';

const supabase = getSupabaseClient();

// GET - Obtener estado de completitud de campos de una entrada
export const GET: APIRoute = async ({ url }) => {
  try {
    const entryId = url.searchParams.get('entry_id');
    
    if (!entryId) {
      return new Response(JSON.stringify({ 
        error: 'entry_id is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Obtener la entrada
    const entry = await supabase.from('entries').select('*').eq('id', entryId).single();
    
    if (!entry.data) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Obtener todos los campos de la categoría
    const fields = await supabase.from('fields').select('*').eq('category_id', entry.data.category_id);
    
    // Obtener estado de completitud
    const completionStates = await supabase.from('field_completion').select('*').eq('entry_id', entryId);
    
    const completionMap = new Map(
      (completionStates.data as any[]).map(c => [c.field_id, {
        is_complete: c.is_complete === 1,
        completion_notes: c.completion_notes
      }])
    );
    
    // Parsear data de la entrada
    const entryData = JSON.parse(entry.data.data);
    
    // Calcular estado de cada campo
    const fieldStatus = (fields.data as any[]).map(field => {
      const hasValue = entryData[field.name] !== undefined && entryData[field.name] !== null && entryData[field.name] !== '';
      const manualCompletion = completionMap.get(field.id);
      
      return {
        field_id: field.id,
        field_name: field.name,
        field_label: field.label,
        has_value: hasValue,
        is_complete: manualCompletion?.is_complete ?? hasValue,
        completion_notes: manualCompletion?.completion_notes || null
      };
    });
    
    // Calcular progreso general
    const totalFields = fieldStatus.length;
    const completedFields = fieldStatus.filter(f => f.is_complete).length;
    const progress = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
    
    return new Response(JSON.stringify({
      entry_id: entryId,
      total_fields: totalFields,
      completed_fields: completedFields,
      progress_percentage: progress,
      fields: fieldStatus
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

// POST - Marcar campo como completo/incompleto
export const POST: APIRoute = async ({ request }) => {
  try {
    const { entry_id, field_id, is_complete, completion_notes } = await request.json();
    
    if (!entry_id || !field_id) {
      return new Response(JSON.stringify({ 
        error: 'entry_id and field_id are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const now = new Date().toISOString();
    
    // Verificar si ya existe
    const existing = await supabase.from('field_completion').select('*').eq('entry_id', entry_id).eq('field_id', field_id).single();
    
    if (existing.data) {
      // Actualizar
      await supabase.from('field_completion').update({
        is_complete: is_complete ? 1 : 0,
        completion_notes: completion_notes || null,
      }).eq('entry_id', entry_id).eq('field_id', field_id);

    } else {
      // Insertar
      await supabase.from('field_completion').insert({
        entry_id,
        field_id,
        is_complete: is_complete ? 1 : 0,
        completion_notes: completion_notes || null,
      });
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

// PUT - Actualizar múltiples campos a la vez
export const PUT: APIRoute = async ({ request }) => {
  try {
    const { entry_id, field_updates } = await request.json();
    
    if (!entry_id || !Array.isArray(field_updates)) {
      return new Response(JSON.stringify({ 
        error: 'entry_id and field_updates array are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const now = new Date().toISOString();
    
    for (const update of field_updates) {
      const { field_id, is_complete, completion_notes } = update;
      
      const existing = await supabase.from('field_completion').select('*').eq('entry_id', entry_id).eq('field_id', field_id).single();

      if (existing.data) {

        await supabase.from('field_completion').update({
          is_complete: is_complete ? 1 : 0,
          completion_notes: completion_notes || null,
        }).eq('entry_id', entry_id).eq('field_id', field_id);

      } else {

        await supabase.from('field_completion').insert({
          entry_id,
          field_id,
          is_complete: is_complete ? 1 : 0,
          completion_notes: completion_notes || null,
        });

      }
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