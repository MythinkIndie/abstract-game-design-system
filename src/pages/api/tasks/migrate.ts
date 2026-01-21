// src/pages/api/tasks/migrate.ts
import type { APIRoute } from 'astro';
import { addTaskSystem } from '@/lib/migrations/add_tasks';
import { addTaskStatusSystem } from '@/lib/migrations/add_tasks_statuses';

export const GET: APIRoute = async () => {
  try {
    const result = addTaskSystem();
    const result2 = addTaskStatusSystem();
    
    return new Response(JSON.stringify(result) + JSON.stringify(result2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};