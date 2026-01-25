// src/lib/seed.ts
import { db } from './db';
import { nanoid } from 'nanoid';

export function initializeDatabase() {

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      is_system INTEGER DEFAULT 0,
      inherits_from TEXT,
      icon TEXT,
      color TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inherits_from) REFERENCES categories(id)
    )
  `);

  // Campos (fields)
  db.exec(`
    CREATE TABLE IF NOT EXISTS fields (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      required INTEGER DEFAULT 0,
      unique_value INTEGER DEFAULT 0,
      default_value TEXT,
      config TEXT,
      field_order INTEGER DEFAULT 0,
      help_text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(category_id, name)
    )
  `);

  // Entradas
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      title TEXT NOT NULL,
      data TEXT NOT NULL,
      status_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (status_id) REFERENCES task_statuses(id)
    )
  `);

  // Relaciones
  db.exec(`
    CREATE TABLE IF NOT EXISTS relations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source_category_id TEXT NOT NULL,
      target_category_id TEXT NOT NULL,
      cardinality TEXT NOT NULL,
      bidirectional INTEGER DEFAULT 0,
      reverse_name TEXT,
      config TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (target_category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Tabla pivot para relaciones N:N
  db.exec(`
    CREATE TABLE IF NOT EXISTS relation_links (
      id TEXT PRIMARY KEY,
      relation_id TEXT NOT NULL,
      source_entry_id TEXT NOT NULL,
      target_entry_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (relation_id) REFERENCES relations(id) ON DELETE CASCADE,
      FOREIGN KEY (source_entry_id) REFERENCES entries(id) ON DELETE CASCADE,
      FOREIGN KEY (target_entry_id) REFERENCES entries(id) ON DELETE CASCADE,
      UNIQUE(relation_id, source_entry_id, target_entry_id)
    )
  `);

  // ============================================
  // 2. SISTEMA DE COMPLETITUD DE CAMPOS
  // ============================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS field_completion (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      field_id TEXT NOT NULL,
      is_complete INTEGER DEFAULT 0,
      completion_notes TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
      FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE,
      UNIQUE(entry_id, field_id)
    )
  `);

  // ============================================
  // 3. SISTEMA DE TAREAS
  // ============================================

  // Estados de tareas
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

  // Completitud de tareas por entrada
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

  // ============================================
  // 4. SISTEMA DE ETIQUETAS
  // ============================================

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Tabla de sesiones
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_activity TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Tabla de logs de actividad (opcional pero útil)
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ============================================
  // 5. ÍNDICES PARA OPTIMIZACIÓN
  // ============================================

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_fields_category ON fields(category_id);
    CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category_id);
    CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status_id);
    CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_category_id);
    CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_category_id);
    CREATE INDEX IF NOT EXISTS idx_relation_links_relation ON relation_links(relation_id);
    CREATE INDEX IF NOT EXISTS idx_field_completion_entry ON field_completion(entry_id);
    CREATE INDEX IF NOT EXISTS idx_field_completion_field ON field_completion(field_id);
    CREATE INDEX IF NOT EXISTS idx_task_completion_task ON task_completion(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_completion_entry ON task_completion(entry_id);
    CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id);
    CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_username ON activity_logs(username);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
  `);
  console.log('✅ Base de datos inicializada');
}

export function seedDatabase() {

  // Verificar si ya hay datos
  const existingCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  
  if (existingCategories.count > 0) {
    console.log('⚠️  Base de datos ya tiene datos. Skipping seed.');
    return { success: true, message: 'Database already seeded' };
  }

  const now = new Date().toISOString();

  // ========================================
  // CATEGORÍAS FUNDAMENTALES
  // ========================================
  
  const metaId = nanoid();
  const systemId = nanoid();
  const entityId = nanoid();

  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, slug, description, is_system, inherits_from, icon, color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCategory.run(
    metaId,
    'Meta',
    'meta',
    'Metadatos del proyecto de videojuego',
    1,
    null,
    'database',
    '#6366f1',
    now
  );

  insertCategory.run(
    systemId,
    'System',
    'system',
    'Configuración y reglas del sistema de diseño',
    1,
    null,
    'settings',
    '#8b5cf6',
    now
  );

  insertCategory.run(
    entityId,
    'Entity',
    'entity',
    'Categoría base abstracta - todas las categorías custom heredan de aquí',
    1,
    null,
    'box',
    '#10b981',
    now
  );

  const taskCategoryId = nanoid();
  
  insertCategory.run(
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

  // ========================================
  // CAMPOS DE META
  // ========================================
  
  const insertField = db.prepare(`
    INSERT INTO fields (id, category_id, name, label, type, required, unique_value, config, field_order, help_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Meta fields
  insertField.run(nanoid(), metaId, 'project_name', 'Nombre del Proyecto', 'text', 1, 1, JSON.stringify({ max_length: 100 }), 1, 'Nombre oficial del videojuego');
  insertField.run(nanoid(), metaId, 'version', 'Versión', 'text', 1, 0, JSON.stringify({ placeholder: '0.1.0' }), 2, 'Versión del GDD');
  insertField.run(nanoid(), metaId, 'authors', 'Autores', 'list', 0, 0, JSON.stringify({ item_type: 'text' }), 3, 'Diseñadores del juego');
  insertField.run(nanoid(), metaId, 'meta_description', 'Descripción del Metadato', 'markdown', 0, 0, JSON.stringify({}), 4, 'Descripción general del proyecto');
  insertField.run(nanoid(), metaId, 'tags', 'Etiquetas', 'list', 0, 0, JSON.stringify({ item_type: 'text' }), 5, 'Etiquetas para clasificación');

  // ========================================
  // CAMPOS DE SYSTEM
  // ========================================
  
  insertField.run(nanoid(), systemId, 'rule_name', 'Nombre de la Regla', 'text', 1, 0, JSON.stringify({}), 1, 'Identificador de la regla');
  insertField.run(nanoid(), systemId, 'rule_type', 'Tipo de Regla', 'enum', 1, 0, JSON.stringify({ options: ['workflow', 'validation', 'generation', 'export', 'custom'] }), 2, 'Categoría de la regla');
  insertField.run(nanoid(), systemId, 'enabled', 'Habilitada', 'boolean', 1, 0, JSON.stringify({ default: true }), 3, '¿Está activa esta regla?');
  insertField.run(nanoid(), systemId, 'priority', 'Prioridad', 'number', 0, 0, JSON.stringify({ min: 0, max: 100, default: 50 }), 4, 'Orden de ejecución');
  insertField.run(nanoid(), systemId, 'config', 'Configuración', 'json', 0, 0, JSON.stringify({}), 5, 'Configuración específica en JSON');
  insertField.run(nanoid(), systemId, 'system_description', 'Descripción del Sistema', 'markdown', 0, 0, JSON.stringify({}), 6, 'Documentación de la regla');

  // ========================================
  // CAMPOS DE ENTITY (HEREDADOS)
  // ========================================
  
  insertField.run(nanoid(), entityId, 'title', 'Título', 'text', 1, 0, JSON.stringify({ max_length: 200 }), 1, 'Nombre de la entidad');
  insertField.run(nanoid(), entityId, 'entity_description', 'Descripción', 'markdown', 0, 0, JSON.stringify({}), 2, 'Descripción extensa');
  insertField.run(nanoid(), entityId, 'status', 'Estado', 'enum', 1, 0, JSON.stringify({ options: ['draft', 'review', 'approved', 'deprecated'], default: 'draft' }), 3, 'Estado del diseño');
  insertField.run(nanoid(), entityId, 'entity_tags', 'Etiquetas', 'list', 0, 0, JSON.stringify({ item_type: 'text' }), 4, 'Etiquetas para búsqueda');

  insertField.run(nanoid(), taskCategoryId, 'title', 'Título', 'text', 1, 0, JSON.stringify({}), 1, 'Título de la tarea');
  insertField.run(nanoid(), taskCategoryId, 'task_description', 'Descripción de la tarea', 'markdown', 0, 0, JSON.stringify({}), 2, 'Descripción detallada');
  insertField.run(nanoid(), taskCategoryId, 'is_completed', 'Completada', 'boolean', 0, 0, JSON.stringify({ default: false }), 3, '¿Tarea completada?');
  insertField.run(nanoid(), taskCategoryId, 'parent_task_id', 'Tarea Padre', 'text', 0, 0, JSON.stringify({}), 4, 'ID de la tarea padre (para subtareas)');
  insertField.run(nanoid(), taskCategoryId, 'related_category_id', 'Categoría Relacionada', 'text', 0, 0, JSON.stringify({}), 5, 'Categoría de entidades relacionadas');
  insertField.run(nanoid(), taskCategoryId, 'applies_to_all', 'Aplica a Todas', 'boolean', 0, 0, JSON.stringify({ default: false }), 6, 'Si es true, aplica a todas las entradas de la categoría');
  insertField.run(nanoid(), taskCategoryId, 'specific_entry_ids', 'IDs Específicas', 'list', 0, 0, JSON.stringify({ item_type: 'text' }), 7, 'Lista de IDs de entradas específicas');
  insertField.run(nanoid(), taskCategoryId, 'priority', 'Prioridad', 'enum', 0, 0, JSON.stringify({ options: ['low', 'medium', 'high', 'critical'], default: 'medium' }), 8, 'Nivel de prioridad');
  insertField.run(nanoid(), taskCategoryId, 'due_date', 'Fecha Límite', 'text', 0, 0, JSON.stringify({}), 9, 'Fecha límite (YYYY-MM-DD)');
  insertField.run(nanoid(), taskCategoryId, 'tags', 'Etiquetas', 'list', 0, 0, JSON.stringify({ item_type: 'text' }), 10, 'Etiquetas de la tarea');
  insertField.run(nanoid(), taskCategoryId, 'order_index', 'Orden', 'number', 0, 0, JSON.stringify({ default: 0 }), 11, 'Orden de visualización');
  insertField.run(nanoid(), taskCategoryId, 'assigned_to', 'Asignado a', 'text', 0, 0, JSON.stringify({}), 12, 'Usuario responsable');

  // ============================================
  // 6. ESTADOS DE TAREAS
  // ============================================

  const insertStatus = db.prepare(`
    INSERT INTO task_statuses (id, name, slug, color, icon, order_index, is_default, is_final, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const defaultStatuses = [
    { name: 'Sin empezar', slug: 'not_started', color: '#9ca3af', icon: '⭕', order: 0, isDefault: 1, isFinal: 0 },
    { name: 'En progreso', slug: 'in_progress', color: '#3b82f6', icon: '🔄', order: 1, isDefault: 0, isFinal: 0 },
    { name: 'Bloqueado', slug: 'blocked', color: '#ef4444', icon: '🚫', order: 2, isDefault: 0, isFinal: 0 },
    { name: 'En revisión', slug: 'in_review', color: '#f59e0b', icon: '👀', order: 3, isDefault: 0, isFinal: 0 },
    { name: 'Completado', slug: 'completed', color: '#10b981', icon: '✅', order: 4, isDefault: 0, isFinal: 1 }
  ];

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

  // ========================================
  // ENTRADA META INICIAL
  // ========================================
  
  const insertEntry = db.prepare(`
    INSERT INTO entries (id, category_id, title, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const metaData = {
    project_name: 'Nuevo Proyecto',
    version: '0.1.0',
    authors: [],
    description: '# Descripción del Proyecto\n\nComienza a diseñar tu videojuego aquí.',
    tags: ['sin-clasificar']
  };

  insertEntry.run(
    nanoid(),
    metaId,
    'Proyecto Base',
    JSON.stringify(metaData),
    now,
    now
  );

  // ========================================
  // REGLA DE SISTEMA EJEMPLO
  // ========================================
  
  const systemData = {
    rule_name: 'unique_entry_titles',
    rule_type: 'validation',
    enabled: true,
    priority: 10,
    config: {
      scope: 'per_category',
      case_sensitive: false
    },
    description: '# Validación de Títulos Únicos\n\nAsegura que no haya entradas con títulos duplicados dentro de cada categoría.'
  };

  insertEntry.run(
    nanoid(),
    systemId,
    'Validación de Títulos Únicos',
    JSON.stringify(systemData),
    now,
    now
  );

  // ========================================
  // Autentificación
  // ========================================

  const privateMode = db.prepare('SELECT * FROM app_settings WHERE key = ?').get('private_mode');
  
  if (!privateMode) {
    console.log('  ℹ️  Configurando modo privado por defecto...');
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('private_mode', 'false');
    console.log('  ✓ Modo privado desactivado por defecto');
  }
  
  // Verificar si ya existe contraseña
  const appPassword = db.prepare('SELECT * FROM app_settings WHERE key = ?').get('app_password');
  
  if (!appPassword) {
    console.log('  ℹ️  No hay contraseña configurada');
    console.log('  📌 Para activar el modo privado:');
    console.log('     1. Ve a /api/auth/setup');
    console.log('     2. Configura una contraseña segura');
  }
  
  return {
    success: true,
    message: 'Database seeded successfully',
    categories: {
      meta: metaId,
      system: systemId,
      entity: entityId
    }
  };
}