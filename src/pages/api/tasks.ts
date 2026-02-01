// src/pages/api/tasks.ts
import type { APIRoute } from 'astro';
import { getSupabaseClient } from '@/lib/supabaseClient';

const supabase = getSupabaseClient();
// GET - Listar tareas con jerarquía
export const GET: APIRoute = async ({ url }) => {
  try {
    const categoryId = url.searchParams.get('category_id');
    const parentId = url.searchParams.get('parent_id');
    
    const taskCategory = await supabase.from('categories').select('id').eq('slug', 'task').single();
    
    if (!taskCategory.data) {
      return new Response(JSON.stringify({ error: 'Task system not initialized' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tasks = await supabase
      .from('entries')
      .select('*')
      .eq('category_id', taskCategory.data.id);

    const filteredTasks = parentId ? tasks.data.filter(task => {
      const data = JSON.parse(task.data);
      return data.parent_task_id === parentId;
    }) : tasks.data;

    const statuses = await supabase.from('task_statuses').select('*').order('order_index', { ascending: true });

    const parsedTasks = await Promise.all(filteredTasks.map(async task => {
      const data = JSON.parse(task.data);

      let statusData = statuses.data.find(status => (status as any).id === data.status);
      statusData = typeof statusData === 'undefined' ? statuses.data[0] : statusData;
      
      // Si incluir subtareas, buscarlas recursivamente
      let subtasks: any[] = [];
      subtasks = await getSubtasks(task.id, taskCategory.data.id);

      return {
        ...task,
        data,
        statusData,
        subtasks
      };
    }));
    
    return new Response(JSON.stringify(parsedTasks), {
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

// Función recursiva para obtener subtareas
async function getSubtasks(parentId: string, taskCategoryId: string): Promise<any[]> {

  const subtasks = await supabase.from('entries').select('*').eq('category_id', taskCategoryId).eq('data->>parent_task_id', parentId).order('data->>order_index', { ascending: true }).order('created_at', { ascending: true });
  
  if (subtasks.data.length === 0) return [];
  
  return subtasks.data.map(task => {
    const data = JSON.parse(task.data);
    return {
      ...task,
      data,
      subtasks: getSubtasks(task.id, taskCategoryId)
    };
  });
}

// POST - Crear tarea
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { 
      title,
      description = '',
      parent_task_id = null,
      related_category_id = null,
      applies_to_all = false,
      specific_entry_ids = [],
      priority = 'medium',
      due_date = null,
      tags = [],
      order_index = 0,
      assigned_to = ''
    } = body;
    
    if (!title) {
      return new Response(JSON.stringify({ error: 'Title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const initialStatus = await supabase.from('task_statuses').select('*').eq('name', 'Sin empezar').single();
    
    const taskCategory = await supabase.from('categories').select('id').eq('slug', 'task').single();
    
    if (!taskCategory.data) {
      return new Response(JSON.stringify({ error: 'Task system not initialized' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const taskData = {
      title,
      description,
      is_completed: false,
      parent_task_id,
      related_category_id,
      applies_to_all,
      specific_entry_ids: Array.isArray(specific_entry_ids) ? specific_entry_ids : [],
      priority,
      due_date,
      statusData: initialStatus.data,
      tags: Array.isArray(tags) ? tags : [],
      order_index,
      assigned_to
    };

    await supabase.from('entries').insert({
      category_id: taskCategory.data.id,
      title: title,
      data: JSON.stringify(taskData)
    });
    
    const newTask = await supabase.from('entries').select('*').eq('data->>title', title).single();
    
    return new Response(JSON.stringify({
      ...newTask,
      data: JSON.parse(newTask.data)
    }), {
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

// PUT - Actualizar tarea
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const existingTask = await supabase.from('entries').select('*').eq('id', id).single();
    
    if (!existingTask.data) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const currentData = JSON.parse(existingTask.data.data);
    const updatedData = { ...currentData, ...updates };
    
    
    await supabase.from('entries').update({
      data: JSON.stringify(updatedData)
    }).eq('id', id);
    
    const updatedTask = await supabase.from('entries').select('*').eq('id', id).single();
    
    return new Response(JSON.stringify({
      ...updatedTask.data,
      data: JSON.parse(updatedTask.data.data)
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

// DELETE - Eliminar tarea (y sus subtareas)
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Eliminar subtareas recursivamente
    await deleteTaskAndSubtasks(id);
    
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

async function deleteTaskAndSubtasks(taskId: string) {
  const taskCategory = await supabase.from('categories').select('id').eq('slug', 'task').single();
  
  if (!taskCategory.data) return;
  
  // Buscar subtareas
  const subtasks = await supabase.from('entries').select('id').eq('category_id', taskCategory.data.id).eq('data->>parent_task_id', taskId);
  
  // Eliminar subtareas recursivamente
  for (const subtask of subtasks) {
    await deleteTaskAndSubtasks(subtask.id);
  }
  
  // Eliminar la tarea
  await supabase.from('entries').delete().eq('id', taskId);
}