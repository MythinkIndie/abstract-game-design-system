import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET - Listar estados
export const GET: APIRoute = async () => {
  try {
    const statuses = db.prepare('SELECT * FROM task_statuses ORDER BY order_index').all();
    
    return new Response(JSON.stringify(statuses), {
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
    const id = nanoid();
    
    // Obtener el orden más alto
    const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM task_statuses').get() as any;
    const orderIndex = (maxOrder?.max || 0) + 1;
    
    db.prepare(`
      INSERT INTO task_statuses (id, name, slug, color, icon, order_index, is_default, is_final, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
    `).run(id, name, slug, color || '#6b7280', icon || '📌', orderIndex, new Date().toISOString());
    
    const newStatus = db.prepare('SELECT * FROM task_statuses WHERE id = ?').get(id);
    
    return new Response(JSON.stringify(newStatus), {
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
    
    db.prepare(`UPDATE task_statuses SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const updated = db.prepare('SELECT * FROM task_statuses WHERE id = ?').get(id);
    
    return new Response(JSON.stringify(updated), {
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
    const status = db.prepare('SELECT is_default FROM task_statuses WHERE id = ?').get(id) as any;
    
    if (status?.is_default) {
      return new Response(JSON.stringify({ 
        error: 'No se pueden eliminar estados por defecto' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    db.prepare('DELETE FROM task_statuses WHERE id = ?').run(id);
    
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