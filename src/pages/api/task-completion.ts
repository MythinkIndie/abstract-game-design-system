// src/pages/api/task-completion.ts
import type { APIRoute } from 'astro';
import { getSupabaseClient } from '@/lib/supabaseClient';

const supabase = getSupabaseClient();

// GET - Obtener estado de tareas para una entrada o categoría
export const GET: APIRoute = async ({ url }) => {
  try {
    const entryId = url.searchParams.get('entry_id');
    const categoryId = url.searchParams.get('category_id');
    
    if (!entryId && !categoryId) {
      return new Response(JSON.stringify({ 
        error: 'entry_id or category_id is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const taskCategory = await supabase.from('categories').select('*').eq('slug', 'task').single();
    
    if (!taskCategory.data) {
      return new Response(JSON.stringify({ error: 'Task system not initialized' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (entryId) {
      // Obtener la entrada para saber su categoría
      const entry = await supabase.from('entries').select('*').eq('id', entryId).single();
      
      if (!entry.data) {
        return new Response(JSON.stringify({ error: 'Entry not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Buscar tareas que apliquen a esta entrada
      const allTasks = await supabase.from('entries').select('*').eq('category_id', taskCategory.data.id)
        .filter('data->>related_category_id', 'eq', entry.data.category_id)
        .filter('data->>parent_task_id', 'is', null)
        .order('data->>order_index', { ascending: true });
      
      const tasksWithStatus = allTasks.data.map(async (task) => {
        const data = JSON.parse(task.data);
        
        // Verificar si aplica a esta entrada específica
        const appliesToEntry = data.applies_to_all || 
                               (data.specific_entry_ids && data.specific_entry_ids.includes(entryId));
        
        if (!appliesToEntry) return null;
        
        // Obtener estado de completitud
        const completion = await supabase.from('task_completion').select('*').eq('task_id', task.id).eq('entry_id', entryId).single();

        // Obtener subtareas
        const subtasks = getSubtasksWithCompletion(task.id, entryId, taskCategory.data.id);
        
        return {
          ...task,
          data,
          is_completed: completion.data ? completion.data.is_completed === 1 : false,
          completed_at: completion?.data?.completed_at || null,
          notes: completion?.data?.notes || null,
          subtasks
        };
      }).filter(Boolean);
      
      return new Response(JSON.stringify({
        entry_id: entryId,
        tasks: tasksWithStatus
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Listar todas las entradas de la categoría con sus estados de tareas
      const entries = await supabase.from('entries').select('*').eq('category_id', categoryId);
      
      const entriesWithTaskStatus = entries.data.map(async (entry) => {
        const tasks = await supabase.from('entries').select('*').eq('category_id', taskCategory.data.id)
          .filter('data->>related_category_id', 'eq', entry.category_id)
          .filter('data->>parent_task_id', 'is', null);
        
        const totalTasks = tasks.data.filter((t: any) => {
          const data = JSON.parse(t.data);
          return data.applies_to_all || (data.specific_entry_ids && data.specific_entry_ids.includes(entry.id));
        }).length;
        
        const completedTasks = await supabase.from('task_completion').select('*').eq('entry_id', entry.id).eq('is_completed', 1);
        
        const hasPendingTasks = totalTasks > (completedTasks?.data?.length || 0);
        
        return {
          entry_id: entry.id,
          entry_title: entry.title,
          total_tasks: totalTasks,
          completed_tasks: completedTasks?.count || 0,
          has_pending_tasks: hasPendingTasks
        };
      });
      
      return new Response(JSON.stringify({
        category_id: categoryId,
        entries: entriesWithTaskStatus
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function getSubtasksWithCompletion(parentId: string, entryId: string, taskCategoryId: string): Promise<any[]> {
  const subtasks = await supabase.from('entries').select('*').eq('category_id', taskCategoryId)
    .filter('data->>parent_task_id', 'eq', parentId)
    .order('data->>order_index', { ascending: true });
  
  return subtasks.data.map(async (task) => {
    const data = JSON.parse(task.data);
    const completion = await supabase.from('task_completion').select('*').eq('task_id', task.id).eq('entry_id', entryId).single();
    
    return {
      ...task,
      data,
      is_completed: completion ? completion.is_completed === 1 : false,
      completed_at: completion?.completed_at || null,
      notes: completion?.notes || null,
      subtasks: await getSubtasksWithCompletion(task.id, entryId, taskCategoryId)
    };
  });
}

// POST - Marcar tarea como completada/pendiente para una entrada
export const POST: APIRoute = async ({ request }) => {
  try {
    const { task_id, entry_id, is_completed, notes } = await request.json();
    
    if (!task_id || !entry_id) {
      return new Response(JSON.stringify({ 
        error: 'task_id and entry_id are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const now = new Date().toISOString();
    
    // Verificar si ya existe
    const existing = await supabase.from('task_completion').select('*').eq('task_id', task_id).eq('entry_id', entry_id).single();
    
    if (existing.data) {
      // Actualizar
      await supabase.from('task_completion').update({
        is_completed: is_completed ? 1 : 0,
        completed_at: is_completed ? now : null,
        notes: notes || null,
      }).eq('task_id', task_id).eq('entry_id', entry_id); 
      
    } else {

      await supabase.from('task_completion').insert({
        task_id,
        entry_id,
        is_completed: is_completed ? 1 : 0,
        completed_at: is_completed ? now : null,
        notes: notes || null,
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