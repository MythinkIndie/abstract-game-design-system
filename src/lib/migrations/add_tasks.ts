// src/lib/migrations/add_tasks.ts
import { db } from '../db';
import { nanoid } from 'nanoid';

export function addTaskSystem() {
  const now = new Date().toISOString();
  
  // Verificar si ya existe la categoría Task
  const existingTask = db.prepare('SELECT id FROM categories WHERE slug = ?').get('task');
  if (existingTask) {
    console.log('⚠️  Sistema de tareas ya existe, actualizando tablas...');
  } else {
    // Crear categoría Task
    const taskCategoryId = nanoid();
    
    db.prepare(`
      INSERT INTO categories (id, name, slug, description, is_system, inherits_from, icon, color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskCategoryId,
      'Task',
      'task',
      'Sistema de gestión de tareas y checklist',
      1,
      null,
      'check-square',
      '#f59e0b',
      now
    );

    // Campos de Task
    const insertField = db.prepare(`
      INSERT INTO fields (id, category_id, name, label, type, required, unique_value, config, field_order, help_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertField.run(nanoid(), taskCategoryId, 'title', 'Título', 'text', 1, 0, JSON.stringify({}), 1, 'Título de la tarea');
    insertField.run(nanoid(), taskCategoryId, 'description', 'Descripción', 'markdown', 0, 0, JSON.stringify({}), 2, 'Descripción detallada');
    insertField.run(nanoid(), taskCategoryId, 'is_completed', 'Completada', 'boolean', 0, 0, JSON.stringify({ default: false }), 3, '¿Tarea completada?');
    insertField.run(nanoid(), taskCategoryId, 'parent_task_id', 'Tarea Padre', 'text', 0, 0, JSON.stringify({}), 4, 'ID de la tarea padre (para subtareas)');
    insertField.run(nanoid(), taskCategoryId, 'related_category_id', 'Categoría Relacionada', 'text', 0, 0, JSON.stringify({}), 5, 'Categoría de entidades relacionadas');
    insertField.run(nanoid(), taskCategoryId, 'applies_to_all', 'Aplica a Todas las Entradas', 'boolean', 0, 0, JSON.stringify({ default: false }), 6, 'Si es true, aplica a todas las entradas de la categoría');
    insertField.run(nanoid(), taskCategoryId, 'specific_entry_ids', 'IDs Específicas', 'list', 0, 0, JSON.stringify({ item_type: 'text' }), 7, 'Lista de IDs de entradas específicas (si no aplica a todas)');
    insertField.run(nanoid(), taskCategoryId, 'priority', 'Prioridad', 'enum', 0, 0, JSON.stringify({ options: ['low', 'medium', 'high', 'critical'], default: 'medium' }), 8, 'Nivel de prioridad');
    insertField.run(nanoid(), taskCategoryId, 'due_date', 'Fecha Límite', 'text', 0, 0, JSON.stringify({}), 9, 'Fecha límite (YYYY-MM-DD)');
    insertField.run(nanoid(), taskCategoryId, 'tags', 'Etiquetas', 'list', 0, 0, JSON.stringify({ item_type: 'text' }), 10, 'Etiquetas de la tarea');
    insertField.run(nanoid(), taskCategoryId, 'order_index', 'Orden', 'number', 0, 0, JSON.stringify({ default: 0 }), 11, 'Orden de visualización');
  }

  // ========================================
  // TABLA: TASK COMPLETION (por entrada)
  // ========================================
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_completion (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      entry_id TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      completed_at TEXT,
      notes TEXT,
      FOREIGN KEY (task_id) REFERENCES entries(id) ON DELETE CASCADE,
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
      UNIQUE(task_id, entry_id)
    )
  `);

  // ========================================
  // TABLA: TAGS (Sistema de etiquetas global)
  // ========================================
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      usage_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS entry_tags (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
      UNIQUE(entry_id, tag_id)
    )
  `);

  // Índices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_task_completion_task ON task_completion(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_completion_entry ON task_completion(entry_id);
    CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id);
    CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
  `);

  console.log('✅ Sistema de tareas V2 inicializado correctamente');
  
  return {
    success: true,
    message: 'Task system V2 initialized successfully'
  };
}