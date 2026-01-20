import type { APIRoute } from 'astro';
import { db } from '../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  try {
    const query = url.searchParams.get('q')?.toLowerCase() || '';
    const type = url.searchParams.get('type') || 'all'; // 'all', 'entries', 'categories'
    const categoryId = url.searchParams.get('category_id');
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];
    
    const results: any = {
      entries: [],
      categories: []
    };
    
    // BUSCAR CATEGORÍAS
    if (type === 'all' || type === 'categories') {
      let categoryQuery = `
        SELECT * FROM categories 
        WHERE (name LIKE ? OR description LIKE ? OR slug LIKE ?)
      `;
      const categoryParams = [`%${query}%`, `%${query}%`, `%${query}%`];
      
      results.categories = db.prepare(categoryQuery).all(...categoryParams);
    }
    
    // BUSCAR ENTRADAS
    if (type === 'all' || type === 'entries') {
      let entryQuery = `
        SELECT e.*, c.name as category_name, c.slug as category_slug, c.color as category_color
        FROM entries e
        JOIN categories c ON e.category_id = c.id
        WHERE (e.title LIKE ? OR e.data LIKE ?)
      `;
      const entryParams: any[] = [`%${query}%`, `%${query}%`];
      
      // Filtrar por categoría específica
      if (categoryId) {
        entryQuery += ' AND e.category_id = ?';
        entryParams.push(categoryId);
      }
      
      entryQuery += ' ORDER BY e.updated_at DESC LIMIT 50';
      
      const entries = db.prepare(entryQuery).all(...entryParams) as any[];
      
      // Filtrar por etiquetas si se especifican
      results.entries = entries.filter((entry: any) => {
        if (tags.length === 0) return true;
        
        try {
          const data = JSON.parse(entry.data);
          const entryTags = data.tags || [];
          return tags.some(tag => entryTags.includes(tag));
        } catch {
          return false;
        }
      }).map((entry: any) => ({
        ...entry,
        data: JSON.parse(entry.data)
      }));
    }
    
    return new Response(JSON.stringify(results), {
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