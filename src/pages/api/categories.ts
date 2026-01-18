// src/pages/api/categories.ts
import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { nanoid } from 'nanoid';

// GET - Listar todas las categorías
export const GET: APIRoute = async ({ url }) => {
  try {
    const includeSystem = url.searchParams.get('system') === 'true';
    
    let query = 'SELECT * FROM categories';
    if (!includeSystem) {
      query += ' WHERE is_system = 0';
    }
    query += ' ORDER BY created_at';
    
    const categories = db.prepare(query).all();
    
    return new Response(JSON.stringify(categories), {
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
    
    const id = nanoid();
    const now = new Date().toISOString();
    
    // Obtener el ID de Entity para heredar
    const entityCategory = db.prepare('SELECT id FROM categories WHERE slug = ?').get('entity') as { id: string } | undefined;
    const inheritsFrom = inherits_from || (entityCategory ? entityCategory.id : null);
    
    const stmt = db.prepare(`
      INSERT INTO categories (id, name, slug, description, is_system, inherits_from, icon, color, created_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, slug, description || '', inheritsFrom, icon || 'box', color || '#6b7280', now);
    
    // Si hereda de Entity, copiar sus campos base
    if (inheritsFrom) {
      const parentFields = db.prepare('SELECT * FROM fields WHERE category_id = ?').all(inheritsFrom);
      
      const insertField = db.prepare(`
        INSERT INTO fields (id, category_id, name, label, type, required, unique_value, config, field_order, help_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const field of parentFields as any[]) {
        insertField.run(
          nanoid(),
          id,
          field.name,
          field.label,
          field.type,
          field.required,
          field.unique_value,
          field.config,
          field.field_order,
          field.help_text
        );
      }
    }
    
    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    
    return new Response(JSON.stringify(newCategory), {
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
    const category = db.prepare('SELECT is_system FROM categories WHERE id = ?').get(id) as { is_system: number } | undefined;
    
    if (category && category.is_system === 1) {
      return new Response(JSON.stringify({ 
        error: 'Cannot delete system categories' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    
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