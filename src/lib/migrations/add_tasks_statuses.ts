import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

export function addTaskStatusSystem() {
  const now = new Date().toISOString();
  
  // Tabla de estados personalizados
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_statuses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      icon TEXT,
      order_index INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      is_final INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Verificar si ya existen estados
  const existingStatuses = db.prepare('SELECT COUNT(*) as count FROM task_statuses').get() as any;
  
  if (existingStatuses.count === 0) {
    // Insertar estados por defecto
    const defaultStatuses = [
      { name: 'Sin empezar', slug: 'not_started', color: '#9ca3af', icon: '⭕', order: 0, isDefault: 1, isFinal: 0 },
      { name: 'En progreso', slug: 'in_progress', color: '#3b82f6', icon: '🔄', order: 1, isDefault: 0, isFinal: 0 },
      { name: 'Bloqueado', slug: 'blocked', color: '#ef4444', icon: '🚫', order: 2, isDefault: 0, isFinal: 0 },
      { name: 'En revisión', slug: 'in_review', color: '#f59e0b', icon: '👀', order: 3, isDefault: 0, isFinal: 0 },
      { name: 'Completado', slug: 'completed', color: '#10b981', icon: '✅', order: 4, isDefault: 0, isFinal: 1 }
    ];
    
    const insertStatus = db.prepare(`
      INSERT INTO task_statuses (id, name, slug, color, icon, order_index, is_default, is_final, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    defaultStatuses.forEach(status => {
      insertStatus.run(
        nanoid(),
        status.name,
        status.slug,
        status.color,
        status.icon,
        status.order,
        status.isDefault,
        status.isFinal,
        now
      );
    });
  }
  
  // Añadir columna status_id a entries (si no existe)
  try {
    db.exec(`ALTER TABLE entries ADD COLUMN status_id TEXT`);
  } catch (e) {
    // La columna ya existe
  }
  
  // Índice
  db.exec(`CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status_id)`);
  
  console.log('✅ Sistema de estados de tareas inicializado');
  
  return { success: true };
}