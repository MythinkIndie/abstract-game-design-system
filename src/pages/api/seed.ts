// src/pages/api/seed.ts
import type { APIRoute } from 'astro';
import { initializeDatabase, seedDatabase } from '@/lib/seed';

export const GET: APIRoute = async () => {

  try {

    await initializeDatabase();
    
    const result = await seedDatabase();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Database initialized and seeded',
      dbPath: 'data/game-design.db',
      categories: result.categories
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};