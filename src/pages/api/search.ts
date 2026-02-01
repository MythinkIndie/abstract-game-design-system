import type { APIRoute } from 'astro';
import { getSupabaseClient } from '@/lib/supabaseClient';

const supabase = getSupabaseClient();

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
      
      results.categories = await supabase.from('categories').select('*').or(`
        name.ilike.${query},
        description.ilike.${query},
        slug.ilike.${query}
      `).order('name', { ascending: true });
    
    }
    
    // BUSCAR ENTRADAS
    if (type === 'all' || type === 'entries') {
      
      const entries = await supabase.from('entries').select('*').or(`
        title.ilike.${query},
        data.ilike.${query}
      `).order('updated_at', { ascending: false });
      
      // Filtrar por etiquetas si se especifican
      results.entries = entries.data.filter((entry: any) => {
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