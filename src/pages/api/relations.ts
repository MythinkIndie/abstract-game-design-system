import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { nanoid } from 'nanoid';

// GET - Obtener relaciones de una categoría o entrada
export const GET: APIRoute = async ({ url }) => {
  try {
    const sourceCategoryId = url.searchParams.get('source_category_id');
    const targetCategoryId = url.searchParams.get('target_category_id');
    const sourceEntryId = url.searchParams.get('source_entry_id');
    const targetEntryId = url.searchParams.get('target_entry_id');
    
    if (sourceEntryId) {
      // Obtener relaciones de una entrada específica
      const links = db.prepare(`
        SELECT rl.*, r.name, r.cardinality, r.reverse_name,
               e.title as target_title, c.name as target_category
        FROM relation_links rl
        JOIN relations r ON rl.relation_id = r.id
        JOIN entries e ON rl.target_entry_id = e.id
        JOIN categories c ON e.category_id = c.id
        WHERE rl.source_entry_id = ?
      `).all(sourceEntryId);
      
      return new Response(JSON.stringify(links), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (targetEntryId) {
      // Obtener relaciones inversas
      const links = db.prepare(`
        SELECT rl.*, r.name, r.cardinality, r.reverse_name,
               e.title as source_title, c.name as source_category
        FROM relation_links rl
        JOIN relations r ON rl.relation_id = r.id
        JOIN entries e ON rl.source_entry_id = e.id
        JOIN categories c ON e.category_id = c.id
        WHERE rl.target_entry_id = ?
      `).all(targetEntryId);
      
      return new Response(JSON.stringify(links), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Obtener definiciones de relaciones
    let query = 'SELECT * FROM relations';
    const params: any[] = [];
    
    if (sourceCategoryId) {
      query += ' WHERE source_category_id = ?';
      params.push(sourceCategoryId);
    } else if (targetCategoryId) {
      query += ' WHERE target_category_id = ?';
      params.push(targetCategoryId);
    }
    
    const relations = db.prepare(query).all(...params);
    
    return new Response(JSON.stringify(relations), {
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

// POST - Crear relación o vincular entradas
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Si viene source_entry_id y target_entry_id, es un vínculo
    if (body.source_entry_id && body.target_entry_id && body.relation_id) {
      const { relation_id, source_entry_id, target_entry_id } = body;
      
      // Verificar que la relación existe
      const relation = db.prepare('SELECT * FROM relations WHERE id = ?').get(relation_id) as any;
      
      if (!relation) {
        return new Response(JSON.stringify({ error: 'Relation not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Verificar cardinalidad 1:1
      if (relation.cardinality === '1:1') {
        const existing = db.prepare(`
          SELECT id FROM relation_links 
          WHERE relation_id = ? AND (source_entry_id = ? OR target_entry_id = ?)
        `).get(relation_id, source_entry_id, target_entry_id);
        
        if (existing) {
          return new Response(JSON.stringify({ 
            error: 'This relation is 1:1 and already has a link' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Verificar si ya existe el vínculo
      const duplicate = db.prepare(`
        SELECT id FROM relation_links 
        WHERE relation_id = ? AND source_entry_id = ? AND target_entry_id = ?
      `).get(relation_id, source_entry_id, target_entry_id);
      
      if (duplicate) {
        return new Response(JSON.stringify({ 
          error: 'This link already exists' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const linkId = nanoid();
      const now = new Date().toISOString();
      
      db.prepare(`
        INSERT INTO relation_links (id, relation_id, source_entry_id, target_entry_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(linkId, relation_id, source_entry_id, target_entry_id, now);
      
      const newLink = db.prepare('SELECT * FROM relation_links WHERE id = ?').get(linkId);
      
      return new Response(JSON.stringify(newLink), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Si no, es una definición de relación nueva
    const { name, source_category_id, target_category_id, cardinality, bidirectional, reverse_name, config } = body;
    
    if (!name || !source_category_id || !target_category_id || !cardinality) {
      return new Response(JSON.stringify({ 
        error: 'name, source_category_id, target_category_id, and cardinality are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const id = nanoid();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO relations (id, name, source_category_id, target_category_id, cardinality, bidirectional, reverse_name, config, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      source_category_id,
      target_category_id,
      cardinality,
      bidirectional ? 1 : 0,
      reverse_name || null,
      typeof config === 'string' ? config : JSON.stringify(config || {}),
      now
    );
    
    const newRelation = db.prepare('SELECT * FROM relations WHERE id = ?').get(id);
    
    return new Response(JSON.stringify(newRelation), {
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

// DELETE - Eliminar relación o vínculo
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    if (body.link_id) {
      // Eliminar vínculo específico
      db.prepare('DELETE FROM relation_links WHERE id = ?').run(body.link_id);
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (body.relation_id) {
      // Eliminar definición de relación (y todos sus vínculos por CASCADE)
      db.prepare('DELETE FROM relations WHERE id = ?').run(body.relation_id);
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'link_id or relation_id required' }), {
      status: 400,
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