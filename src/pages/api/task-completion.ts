// src/pages/api/task-completion.ts
import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { nanoid } from 'nanoid';

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
    
    const taskCategory = db.prepare('SELECT id FROM categories WHERE slug = ?').get('task') as { id: string } | undefined;
    
    if (!taskCategory) {
      return new Response(JSON.stringify({ error: 'Task system not initialized' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (entryId) {
      // Obtener la entrada para saber su categoría
      const entry = db.prepare('SELECT category_id FROM entries WHERE id = ?').get(entryId) as any;
      
      if (!entry) {
        return new Response(JSON.stringify({ error: 'Entry not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Buscar tareas que apliquen a esta entrada
      const allTasks = db.prepare(`
        SELECT * FROM entries 
        WHERE category_id = ? 
          AND json_extract(data, '$.related_category_id') = ?
          AND json_extract(data, '$.parent_task_id') IS NULL
        ORDER BY json_extract(data, '$.order_index') ASC
      `).all(taskCategory.id, entry.category_id) as any[];
      
      const tasksWithStatus = allTasks.map(task => {
        const data = JSON.parse(task.data);
        
        // Verificar si aplica a esta entrada específica
        const appliesToEntry = data.applies_to_all || 
                               (data.specific_entry_ids && data.specific_entry_ids.includes(entryId));
        
        if (!appliesToEntry) return null;
        
        // Obtener estado de completitud
        const completion = db.prepare(`
          SELECT * FROM task_completion 
          WHERE task_id = ? AND entry_id = ?
        `).get(task.id, entryId) as any;
        
        // Obtener subtareas
        const subtasks = getSubtasksWithCompletion(task.id, entryId, taskCategory.id);
        
        return {
          ...task,
          data,
          is_completed: completion ? completion.is_completed === 1 : false,
          completed_at: completion?.completed_at || null,
          notes: completion?.notes || null,
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
      const entries = db.prepare('SELECT id, title FROM entries WHERE category_id = ?').all(categoryId) as any[];
      
      const entriesWithTaskStatus = entries.map(entry => {
        const tasks = db.prepare(`
          SELECT e.id, e.data FROM entries e
          WHERE e.category_id = ? 
            AND json_extract(e.data, '$.related_category_id') = ?
            AND json_extract(e.data, '$.parent_task_id') IS NULL
        `).all(taskCategory.id, categoryId) as any[];
        
        const totalTasks = tasks.filter((t: any) => {
          const data = JSON.parse(t.data);
          return data.applies_to_all || (data.specific_entry_ids && data.specific_entry_ids.includes(entry.id));
        }).length;
        
        const completedTasks = db.prepare(`
          SELECT COUNT(*) as count FROM task_completion tc
          JOIN entries e ON tc.task_id = e.id
          WHERE tc.entry_id = ? 
            AND tc.is_completed = 1
            AND json_extract(e.data, '$.related_category_id') = ?
        `).get(entry.id, categoryId) as any;
        
        const hasPendingTasks = totalTasks > (completedTasks?.count || 0);
        
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

function getSubtasksWithCompletion(parentId: string, entryId: string, taskCategoryId: string): any[] {
  const subtasks = db.prepare(`
    SELECT * FROM entries 
    WHERE category_id = ? AND json_extract(data, '$.parent_task_id') = ?
    ORDER BY json_extract(data, '$.order_index') ASC
  `).all(taskCategoryId, parentId) as any[];
  
  return subtasks.map(task => {
    const data = JSON.parse(task.data);
    const completion = db.prepare(`
      SELECT * FROM task_completion 
      WHERE task_id = ? AND entry_id = ?
    `).get(task.id, entryId) as any;
    
    return {
      ...task,
      data,
      is_completed: completion ? completion.is_completed === 1 : false,
      completed_at: completion?.completed_at || null,
      notes: completion?.notes || null,
      subtasks: getSubtasksWithCompletion(task.id, entryId, taskCategoryId)
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
    const existing = db.prepare(`
      SELECT id FROM task_completion 
      WHERE task_id = ? AND entry_id = ?
    `).get(task_id, entry_id);
    
    if (existing) {
      // Actualizar
      db.prepare(`
        UPDATE task_completion 
        SET is_completed = ?, completed_at = ?, notes = ?
        WHERE task_id = ? AND entry_id = ?
      `).run(
        is_completed ? 1 : 0,
        is_completed ? now : null,
        notes || null,
        task_id,
        entry_id
      );
    } else {
      // Insertar
      db.prepare(`
        INSERT INTO task_completion (id, task_id, entry_id, is_completed, completed_at, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        nanoid(),
        task_id,
        entry_id,
        is_completed ? 1 : 0,
        is_completed ? now : null,
        notes || null
      );
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