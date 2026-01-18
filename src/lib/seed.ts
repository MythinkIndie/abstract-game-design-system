// src/lib/seed.ts
import db from './db';
import { nanoid } from 'nanoid';

export function initializeDatabase() {

  // Tabla de categorías
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

  // Tabla de campos
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

  // Tabla de entradas
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      title TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Tabla de relaciones
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

  // Índices para optimización
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_fields_category ON fields(category_id);
    CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category_id);
    CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_category_id);
    CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_category_id);
    CREATE INDEX IF NOT EXISTS idx_relation_links_relation ON relation_links(relation_id);
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
  insertField.run(nanoid(), metaId, 'description', 'Descripción', 'markdown', 0, 0, JSON.stringify({}), 4, 'Descripción general del proyecto');
  insertField.run(nanoid(), metaId, 'tags', 'Etiquetas', 'list', 0, 0, JSON.stringify({ item_type: 'text' }), 5, 'Etiquetas para clasificación');

  // ========================================
  // CAMPOS DE SYSTEM
  // ========================================
  
  insertField.run(nanoid(), systemId, 'rule_name', 'Nombre de la Regla', 'text', 1, 0, JSON.stringify({}), 1, 'Identificador de la regla');
  insertField.run(nanoid(), systemId, 'rule_type', 'Tipo de Regla', 'enum', 1, 0, JSON.stringify({ options: ['workflow', 'validation', 'generation', 'export', 'custom'] }), 2, 'Categoría de la regla');
  insertField.run(nanoid(), systemId, 'enabled', 'Habilitada', 'boolean', 1, 0, JSON.stringify({ default: true }), 3, '¿Está activa esta regla?');
  insertField.run(nanoid(), systemId, 'priority', 'Prioridad', 'number', 0, 0, JSON.stringify({ min: 0, max: 100, default: 50 }), 4, 'Orden de ejecución');
  insertField.run(nanoid(), systemId, 'config', 'Configuración', 'json', 0, 0, JSON.stringify({}), 5, 'Configuración específica en JSON');
  insertField.run(nanoid(), systemId, 'description', 'Descripción', 'markdown', 0, 0, JSON.stringify({}), 6, 'Documentación de la regla');

  // ========================================
  // CAMPOS DE ENTITY (HEREDADOS)
  // ========================================
  
  insertField.run(nanoid(), entityId, 'title', 'Título', 'text', 1, 0, JSON.stringify({ max_length: 200 }), 1, 'Nombre de la entidad');
  insertField.run(nanoid(), entityId, 'description', 'Descripción', 'markdown', 0, 0, JSON.stringify({}), 2, 'Descripción extensa');
  insertField.run(nanoid(), entityId, 'status', 'Estado', 'enum', 1, 0, JSON.stringify({ options: ['draft', 'review', 'approved', 'deprecated'], default: 'draft' }), 3, 'Estado del diseño');
  insertField.run(nanoid(), entityId, 'tags', 'Etiquetas', 'list', 0, 0, JSON.stringify({ item_type: 'text' }), 4, 'Etiquetas para búsqueda');

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

  console.log('✅ Base de datos inicializada con datos de semilla');
  
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