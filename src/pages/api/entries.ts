// src/pages/api/entries.ts
import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { nanoid } from 'nanoid';

// GET - Obtener entradas de una categoría
export const GET: APIRoute = async ({ url }) => {
  try {
    const categoryId = url.searchParams.get('category_id');
    const entryId = url.searchParams.get('id');
    
    if (entryId) {
      const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId);
      
      if (!entry) {
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
    
    const entries = db.prepare('SELECT * FROM entries WHERE category_id = ? ORDER BY created_at DESC').all(categoryId);
    
    return new Response(JSON.stringify(entries), {
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
    
    const id = nanoid();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO entries (id, category_id, title, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      category_id,
      title,
      typeof data === 'string' ? data : JSON.stringify(data),
      now,
      now
    );
    
    const newEntry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
    
    return new Response(JSON.stringify(newEntry), {
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
    
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (data !== undefined) {
      updates.push('data = ?');
      values.push(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    updates.push('updated_at = ?');
    values.push(now);
    
    if (updates.length === 1) { // Solo updated_at
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    values.push(id);
    
    db.prepare(`UPDATE entries SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const updatedEntry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
    
    return new Response(JSON.stringify(updatedEntry), {
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
    
    db.prepare('DELETE FROM entries WHERE id = ?').run(id);
    
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