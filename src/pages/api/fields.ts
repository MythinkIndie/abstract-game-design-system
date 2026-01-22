import type { APIRoute } from 'astro';
import db from '@/lib/db';
import { nanoid } from 'nanoid';

// GET - Obtener campos de una categoría
export const GET: APIRoute = async ({ url }) => {
  try {
    const categoryId = url.searchParams.get('category_id');
    
    if (!categoryId) {
      return new Response(JSON.stringify({ 
        error: 'category_id is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const fields = db.prepare('SELECT * FROM fields WHERE category_id = ? ORDER BY field_order, created_at').all(categoryId);
    
    return new Response(JSON.stringify(fields), {
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

// POST - Crear nuevo campo
export const POST: APIRoute = async ({ request }) => {

  try {
    const body = await request.json();
    const { category_id, name, label, type, required, unique_value, config, field_order, help_text } = body;
    
    // Validación básica
    if (!category_id || !name || !label || !type) {
      return new Response(JSON.stringify({ 
        error: 'category_id, name, label, and type are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validación especial para campos de relación
    if (type === 'relation') {
      let configObj: any;

      try {
        configObj = typeof config === 'string' ? JSON.parse(config) : config;
      } catch {
        return new Response(JSON.stringify({
          error: 'Config inválido para campo de tipo relation'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!configObj?.related_category_id) {
        return new Response(JSON.stringify({
          error: 'Campos de tipo "relation" requieren related_category_id en config'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const relatedCategory = db
        .prepare('SELECT id FROM categories WHERE id = ?')
        .get(configObj.related_category_id);

      if (!relatedCategory) {
        return new Response(JSON.stringify({
          error: 'La categoría relacionada no existe'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    const id = nanoid();
    
    // Asegurar que config sea un string JSON válido
    let configStr: string;
    if (config === null) {
      configStr = JSON.stringify({});
    } else if (typeof config === 'string') {
      try {
        JSON.parse(config);
        configStr = config;
      } catch {
        configStr = JSON.stringify({});
      }
    } else if (typeof config === 'object' && config !== null) {
      configStr = JSON.stringify(config);
    } else {
      configStr = JSON.stringify({});
    }
    
    const stmt = db.prepare(`
      INSERT INTO fields (id, category_id, name, label, type, required, unique_value, config, field_order, help_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      category_id,
      name,
      label,
      type,
      required ? 1 : 0,
      unique_value ? 1 : 0,
      configStr,
      field_order || 0,
      help_text || ''
    );
    
    const newField = db.prepare('SELECT * FROM fields WHERE id = ?').get(id);
    
    return new Response(JSON.stringify(newField), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating field:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Actualizar campo
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, label, required, unique_value, config, field_order, help_text } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (label !== undefined) {
      updates.push('label = ?');
      values.push(label);
    }
    if (required !== undefined) {
      updates.push('required = ?');
      values.push(required ? 1 : 0);
    }
    if (unique_value !== undefined) {
      updates.push('unique_value = ?');
      values.push(unique_value ? 1 : 0);
    }
    if (config !== undefined) {
      updates.push('config = ?');
      values.push(typeof config === 'string' ? config : JSON.stringify(config));
    }
    if (field_order !== undefined) {
      updates.push('field_order = ?');
      values.push(field_order);
    }
    if (help_text !== undefined) {
      updates.push('help_text = ?');
      values.push(help_text);
    }
    
    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    values.push(id);
    
    db.prepare(`UPDATE fields SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const updatedField = db.prepare('SELECT * FROM fields WHERE id = ?').get(id);
    
    return new Response(JSON.stringify(updatedField), {
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

// DELETE - Eliminar campo
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    db.prepare('DELETE FROM fields WHERE id = ?').run(id);
    
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