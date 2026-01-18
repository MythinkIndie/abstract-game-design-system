// src/pages/api/tags.ts
import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { nanoid } from 'nanoid';

// GET - Listar todas las etiquetas o buscar
export const GET: APIRoute = async ({ url }) => {
  try {
    const search = url.searchParams.get('search');
    const entryId = url.searchParams.get('entry_id');
    
    if (entryId) {
      // Obtener etiquetas de una entrada específica
      const tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN entry_tags et ON t.id = et.tag_id
        WHERE et.entry_id = ?
        ORDER BY t.name
      `).all(entryId);
      
      return new Response(JSON.stringify(tags), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let query = 'SELECT * FROM tags';
    const params: any[] = [];
    
    if (search) {
      query += ' WHERE name LIKE ?';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY usage_count DESC, name ASC';
    
    const tags = db.prepare(query).all(...params);
    
    return new Response(JSON.stringify(tags), {
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
    let tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(normalizedName) as any;
    
    if (!tag) {
      const tagId = nanoid();
      const tagColor = color || generateRandomColor();
      
      db.prepare(`
        INSERT INTO tags (id, name, color, usage_count, created_at)
        VALUES (?, ?, ?, 0, ?)
      `).run(tagId, normalizedName, tagColor, new Date().toISOString());
      
      tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
    }
    
    // Si se proporciona entry_id, asignar etiqueta a entrada
    if (entry_id && tag) {
      const existing = db.prepare(`
        SELECT id FROM entry_tags 
        WHERE entry_id = ? AND tag_id = ?
      `).get(entry_id, tag.id);
      
      if (!existing) {
        db.prepare(`
          INSERT INTO entry_tags (id, entry_id, tag_id)
          VALUES (?, ?, ?)
        `).run(nanoid(), entry_id, tag.id);
        
        // Incrementar contador de uso
        db.prepare(`
          UPDATE tags 
          SET usage_count = usage_count + 1 
          WHERE id = ?
        `).run(tag.id);
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
      db.prepare('DELETE FROM tags WHERE id = ?').run(tag_id);
    } else if (entry_id) {
      // Eliminar solo la relación con la entrada
      db.prepare(`
        DELETE FROM entry_tags 
        WHERE entry_id = ? AND tag_id = ?
      `).run(entry_id, tag_id);
      
      // Decrementar contador
      db.prepare(`
        UPDATE tags 
        SET usage_count = usage_count - 1 
        WHERE id = ?
      `).run(tag_id);
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