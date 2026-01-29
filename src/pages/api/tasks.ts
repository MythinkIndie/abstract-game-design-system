// src/pages/api/tasks.ts
import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET - Listar tareas con jerarquía
export const GET: APIRoute = async ({ url }) => {
  try {
    const categoryId = url.searchParams.get('category_id');
    const parentId = url.searchParams.get('parent_id');
    
    const taskCategory = db!.prepare('SELECT id FROM categories WHERE slug = ?').get('task') as { id: string } | undefined;
    
    if (!taskCategory) {
      return new Response(JSON.stringify({ error: 'Task system not initialized' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let query = 'SELECT * FROM entries WHERE category_id = ?';
    const params: any[] = [taskCategory.id];
    
    // Filtrar por categoría relacionada
    if (categoryId) {
      query += ` AND json_extract(data, '$.related_category_id') = ?`;
      params.push(categoryId);
    }
    
    // Filtrar por tarea padre
    if (parentId !== undefined) {
      if (parentId === 'null' || parentId === '') {
        query += ` AND (json_extract(data, '$.parent_task_id') IS NULL OR json_extract(data, '$.parent_task_id') = '')`;
      } else {
        query += ` AND json_extract(data, '$.parent_task_id') = ?`;
        params.push(parentId);
      }
    }
    
    query += ' ORDER BY json_extract(data, \'$.order_index\') ASC, created_at ASC';
    
    const tasks = db!.prepare(query).all(...params) as any[];
    const statuses = db!.prepare('SELECT * FROM task_statuses ORDER BY order_index').all();
    
    const parsedTasks = tasks.map(task => {
      const data = JSON.parse(task.data);

      let statusData = statuses.find(status => (status as any).id === data.status);
      statusData = typeof statusData === 'undefined' ? statuses[0] : statusData;
      
      // Si incluir subtareas, buscarlas recursivamente
      let subtasks: any[] = [];
      subtasks = getSubtasks(task.id, taskCategory.id);

      return {
        ...task,
        data,
        statusData,
        subtasks
      };
    });
    
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
function getSubtasks(parentId: string, taskCategoryId: string): any[] {
  const subtasks = db!.prepare(`
    SELECT * FROM entries 
    WHERE category_id = ? AND json_extract(data, '$.parent_task_id') = ?
    ORDER BY json_extract(data, '$.order_index') ASC, created_at ASC
  `).all(taskCategoryId, parentId) as any[];
  
  return subtasks.map(task => {
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

    const initialStatus = db!.prepare('SELECT * FROM task_statuses WHERE name = ?').get('Sin empezar') as any;
    
    const taskCategory = db!.prepare('SELECT id FROM categories WHERE slug = ?').get('task') as { id: string } | undefined;
    
    if (!taskCategory) {
      return new Response(JSON.stringify({ error: 'Task system not initialized' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const id = nanoid();
    const now = new Date().toISOString();
    
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
      statusData: initialStatus,
      tags: Array.isArray(tags) ? tags : [],
      order_index,
      assigned_to
    };
    
    db!.prepare(`
      INSERT INTO entries (id, category_id, title, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      taskCategory.id,
      title,
      JSON.stringify(taskData),
      now,
      now
    );
    
    const newTask = db!.prepare('SELECT * FROM entries WHERE id = ?').get(id) as any;
    
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
    
    const existingTask = db!.prepare('SELECT * FROM entries WHERE id = ?').get(id) as any;
    
    if (!existingTask) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const currentData = JSON.parse(existingTask.data);
    const updatedData = { ...currentData, ...updates };
    const now = new Date().toISOString();
    
    db!.prepare(`
      UPDATE entries 
      SET data = ?, updated_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify(updatedData),
      now,
      id
    );
    
    const updatedTask = db!.prepare('SELECT * FROM entries WHERE id = ?').get(id) as any;
    
    return new Response(JSON.stringify({
      ...updatedTask,
      data: JSON.parse(updatedTask.data)
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
    deleteTaskAndSubtasks(id);
    
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

function deleteTaskAndSubtasks(taskId: string) {
  const taskCategory = db!.prepare('SELECT id FROM categories WHERE slug = ?').get('task') as { id: string } | undefined;
  
  if (!taskCategory) return;
  
  // Buscar subtareas
  const subtasks = db!.prepare(`
    SELECT id FROM entries 
    WHERE category_id = ? AND json_extract(data, '$.parent_task_id') = ?
  `).all(taskCategory.id, taskId) as any[];
  
  // Eliminar subtareas recursivamente
  for (const subtask of subtasks) {
    deleteTaskAndSubtasks(subtask.id);
  }
  
  // Eliminar la tarea
  db!.prepare('DELETE FROM entries WHERE id = ?').run(taskId);
}