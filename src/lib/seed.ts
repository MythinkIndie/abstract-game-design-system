// CREATE TABLE IF NOT EXISTS categories (
//       id UUID PRIMARY KEY,
//       name TEXT NOT NULL UNIQUE,
//       slug TEXT NOT NULL UNIQUE,
//       description TEXT,
//       is_system INTEGER DEFAULT 0,
//       inherits_from UUID,
//       icon TEXT,
//       color TEXT,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (inherits_from) REFERENCES categories(id)
//     );

//     CREATE TABLE IF NOT EXISTS fields (
//       id UUID PRIMARY KEY,
//       category_id UUID NOT NULL,
//       name TEXT NOT NULL,
//       label TEXT NOT NULL,
//       type TEXT NOT NULL,
//       required INTEGER DEFAULT 0,
//       unique_value INTEGER DEFAULT 0,
//       default_value TEXT,
//       config TEXT,
//       field_order INTEGER DEFAULT 0,
//       help_text TEXT,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
//       UNIQUE(category_id, name)
//     );

//     CREATE TABLE IF NOT EXISTS task_statuses (
//       id UUID PRIMARY KEY,
//       name TEXT NOT NULL UNIQUE,
//       slug TEXT NOT NULL UNIQUE,
//       color TEXT NOT NULL,
//       icon TEXT,
//       order_index INTEGER DEFAULT 0,
//       is_default INTEGER DEFAULT 0,
//       is_final INTEGER DEFAULT 0,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP
//     );

//     CREATE TABLE IF NOT EXISTS entries (
//       id UUID PRIMARY KEY,
//       category_id UUID NOT NULL,
//       title TEXT NOT NULL,
//       data TEXT NOT NULL,
//       status_id UUID,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
//       FOREIGN KEY (status_id) REFERENCES task_statuses(id)
//     );

//     CREATE TABLE IF NOT EXISTS relations (
//       id UUID PRIMARY KEY,
//       name TEXT NOT NULL,
//       source_category_id UUID NOT NULL,
//       target_category_id UUID NOT NULL,
//       cardinality TEXT NOT NULL,
//       bidirectional INTEGER DEFAULT 0,
//       reverse_name TEXT,
//       config TEXT,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (source_category_id) REFERENCES categories(id) ON DELETE CASCADE,
//       FOREIGN KEY (target_category_id) REFERENCES categories(id) ON DELETE CASCADE
//     );

//     CREATE TABLE IF NOT EXISTS relation_links (
//       id UUID PRIMARY KEY,
//       relation_id UUID NOT NULL,
//       source_entry_id UUID NOT NULL,
//       target_entry_id UUID NOT NULL,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (relation_id) REFERENCES relations(id) ON DELETE CASCADE,
//       FOREIGN KEY (source_entry_id) REFERENCES entries(id) ON DELETE CASCADE,
//       FOREIGN KEY (target_entry_id) REFERENCES entries(id) ON DELETE CASCADE,
//       UNIQUE(relation_id, source_entry_id, target_entry_id)
//     );

//     CREATE TABLE IF NOT EXISTS field_completion (
//       id UUID PRIMARY KEY,
//       entry_id UUID NOT NULL,
//       field_id UUID NOT NULL,
//       is_complete INTEGER DEFAULT 0,
//       completion_notes TEXT,
//       updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
//       FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE,
//       UNIQUE(entry_id, field_id)
//     );

//     CREATE TABLE IF NOT EXISTS task_completion (
//       id UUID PRIMARY KEY,
//       task_id UUID NOT NULL,
//       entry_id UUID NOT NULL,
//       is_completed INTEGER DEFAULT 0,
//       completed_at TEXT,
//       notes TEXT,
//       FOREIGN KEY (task_id) REFERENCES entries(id) ON DELETE CASCADE,
//       FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
//       UNIQUE(task_id, entry_id)
//     );

//     CREATE TABLE IF NOT EXISTS tags (
//       id UUID PRIMARY KEY,
//       name TEXT NOT NULL UNIQUE,
//       color TEXT,
//       usage_count INTEGER DEFAULT 0,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP
//     );

//     CREATE TABLE IF NOT EXISTS entry_tags (
//       id UUID PRIMARY KEY,
//       entry_id UUID NOT NULL,
//       tag_id UUID NOT NULL,
//       FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
//       FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
//       UNIQUE(entry_id, tag_id)
//     );

//     CREATE TABLE IF NOT EXISTS app_settings (
//       key TEXT PRIMARY KEY,
//       value TEXT NOT NULL,
//       updated_at TEXT DEFAULT CURRENT_TIMESTAMP
//     );

//     CREATE TABLE IF NOT EXISTS sessions (
//       id UUID PRIMARY KEY,
//       token TEXT NOT NULL UNIQUE,
//       username TEXT NOT NULL,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       last_activity TEXT DEFAULT CURRENT_TIMESTAMP
//     );

//     CREATE TABLE IF NOT EXISTS activity_logs (
//       id UUID PRIMARY KEY,
//       username TEXT NOT NULL,
//       action TEXT NOT NULL,
//       resource_type TEXT,
//       resource_id TEXT,
//       details TEXT,
//       ip_address TEXT,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP
//     );

//     CREATE TABLE IF NOT EXISTS users (
//       id INTEGER PRIMARY KEY,
//       username TEXT UNIQUE NOT NULL,
//       password_hash TEXT NOT NULL,
//       is_active INTEGER DEFAULT 1,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       updated_at TEXT DEFAULT CURRENT_TIMESTAMP
//     );

//     CREATE TABLE IF NOT EXISTS roles (
//       id INTEGER PRIMARY KEY,
//       name TEXT UNIQUE NOT NULL
//     );

//     CREATE TABLE IF NOT EXISTS user_roles (
//       user_id INTEGER,
//       role_id INTEGER,
//       PRIMARY KEY (user_id, role_id),
//       FOREIGN KEY (user_id) REFERENCES users(id),
//       FOREIGN KEY (role_id) REFERENCES roles(id)
//     );

//     CREATE INDEX IF NOT EXISTS idx_fields_category ON fields(category_id);
//     CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category_id);
//     CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status_id);
//     CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_category_id);
//     CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_category_id);
//     CREATE INDEX IF NOT EXISTS idx_relation_links_relation ON relation_links(relation_id);
//     CREATE INDEX IF NOT EXISTS idx_field_completion_entry ON field_completion(entry_id);
//     CREATE INDEX IF NOT EXISTS idx_field_completion_field ON field_completion(field_id);
//     CREATE INDEX IF NOT EXISTS idx_task_completion_task ON task_completion(task_id);
//     CREATE INDEX IF NOT EXISTS idx_task_completion_entry ON task_completion(entry_id);
//     CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id);
//     CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);
//     CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
//     CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
//     CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
//     CREATE INDEX IF NOT EXISTS idx_activity_logs_username ON activity_logs(username);
//     CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
//     CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
//     CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
//     CREATE INDEX IF NOT EXISTS idx_roles_id ON roles(id);
//     CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

// INSERT INTO categories (name, slug, description, is_system, inherits_from, icon, color, created_at)
// VALUES (
//   'Meta',
//   'meta',
//   'Metadatos del proyecto de videojuego',
//   1,
//   NULL,
//   'database',
//   '#6366f1',
// );

// -- SYSTEM
// INSERT INTO categories (name, slug, description, is_system, inherits_from, icon, color, created_at)
// VALUES (
//   'System',
//   'system',
//   'Configuración y reglas del sistema de diseño',
//   1,
//   NULL,
//   'settings',
//   '#8b5cf6',
// );

// -- ENTITY
// INSERT INTO categories (name, slug, description, is_system, inherits_from, icon, color, created_at)
// VALUES (
//   'Entity',
//   'entity',
//   'Categoría base abstracta - todas las categorías custom heredan de aquí',
//   1,
//   NULL,
//   'box',
//   '#10b981',
// );

// -- TASK
// INSERT INTO categories (name, slug, description, is_system, inherits_from, icon, color, created_at)
// VALUES (
//   'Task',
//   'task',
//   'Sistema de gestión de tareas y checklist',
//   1,
//   NULL,
//   'check-square',
//   '#f59e0b',
// );

// INSERT INTO fields (category_id, name, label, type, required, unique_value, config, field_order, help_text) VALUES
// ('288401a0-dc61-4388-b69e-f400dd722ca5', 'project_name', 'Nombre del Proyecto', 'text', 1, 1, '{"max_length":100}', 1, 'Nombre oficial del videojuego'),
// ('288401a0-dc61-4388-b69e-f400dd722ca5', 'version', 'Versión', 'text', 1, 0, '{"placeholder":"0.1.0"}', 2, 'Versión del GDD'),
// ('288401a0-dc61-4388-b69e-f400dd722ca5', 'authors', 'Autores', 'list', 0, 0, '{"item_type":"text"}', 3, 'Diseñadores del juego'),
// ('288401a0-dc61-4388-b69e-f400dd722ca5', 'meta_description', 'Descripción del Metadato', 'markdown', 0, 0, '{}', 4, 'Descripción general del proyecto'),
// ('288401a0-dc61-4388-b69e-f400dd722ca5', 'tags', 'Etiquetas', 'list', 0, 0, '{"item_type":"text"}', 5, 'Etiquetas para clasificación'),
// ('23d16493-cdff-4889-b789-4182f3943522', 'rule_name', 'Nombre de la Regla', 'text', 1, 0, '{}', 1, 'Identificador de la regla'),
// ('23d16493-cdff-4889-b789-4182f3943522', 'rule_type', 'Tipo de Regla', 'enum', 1, 0, '{"options":["workflow","validation","generation","export","custom"]}', 2, 'Categoría de la regla'),
// ('23d16493-cdff-4889-b789-4182f3943522', 'enabled', 'Habilitada', 'boolean', 1, 0, '{"default":true}', 3, '¿Está activa esta regla?'),
// ('23d16493-cdff-4889-b789-4182f3943522', 'priority', 'Prioridad', 'number', 0, 0, '{"min":0,"max":100,"default":50}', 4, 'Orden de ejecución'),
// ('23d16493-cdff-4889-b789-4182f3943522', 'config', 'Configuración', 'json', 0, 0, '{}', 5, 'Configuración específica en JSON'),
// ('23d16493-cdff-4889-b789-4182f3943522', 'system_description', 'Descripción del Sistema', 'markdown', 0, 0, '{}', 6, 'Documentación de la regla'),
// ('18a5d3ad-2b5e-430b-878d-fe2c802c782d', 'title', 'Título', 'text', 1, 0, '{"max_length":200}', 1, 'Nombre de la entidad'),
// ('18a5d3ad-2b5e-430b-878d-fe2c802c782d', 'entity_description', 'Descripción', 'markdown', 0, 0, '{}', 2, 'Descripción extensa'),
// ('18a5d3ad-2b5e-430b-878d-fe2c802c782d', 'status', 'Estado', 'enum', 1, 0, '{"options":["draft","review","approved","deprecated"],"default":"draft"}', 3, 'Estado del diseño'),
// ('18a5d3ad-2b5e-430b-878d-fe2c802c782d', 'entity_tags', 'Etiquetas', 'list', 0, 0, '{"item_type":"text"}', 4, 'Etiquetas para búsqueda'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'title', 'Título', 'text', 1, 0, '{}', 1, 'Título de la tarea'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'task_description', 'Descripción de la tarea', 'markdown', 0, 0, '{}', 2, 'Descripción detallada'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'is_completed', 'Completada', 'boolean', 0, 0, '{"default":false}', 3, '¿Tarea completada?'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'parent_task_id', 'Tarea Padre', 'text', 0, 0, '{}', 4, 'ID de la tarea padre'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'related_category_id', 'Categoría Relacionada', 'text', 0, 0, '{}', 5, 'Categoría relacionada'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'applies_to_all', 'Aplica a Todas', 'boolean', 0, 0, '{"default":false}', 6, 'Aplica a todas'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'specific_entry_ids', 'IDs Específicas', 'list', 0, 0, '{"item_type":"text"}', 7, 'IDs específicas'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'priority', 'Prioridad', 'enum', 0, 0, '{"options":["low","medium","high","critical"],"default":"medium"}', 8, 'Nivel de prioridad'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'due_date', 'Fecha Límite', 'text', 0, 0, '{}', 9, 'Fecha límite'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'tags', 'Etiquetas', 'list', 0, 0, '{"item_type":"text"}', 10, 'Etiquetas'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'order_index', 'Orden', 'number', 0, 0, '{"default":0}', 11, 'Orden'),
// ('6a83149c-43e9-4357-92d3-2e84262f4c15', 'assigned_to', 'Asignado a', 'text', 0, 0, '{}', 12, 'Usuario responsable');

// INSERT INTO task_statuses (name, slug, color, icon, order_index, is_default, is_final) VALUES
// ('Sin empezar', 'not_started', '#9ca3af', '⭕', 0, 1, 0),
// ('En progreso', 'in_progress', '#3b82f6', '🔄', 1, 0, 0),
// ('Bloqueado', 'blocked', '#ef4444', '🚫', 2, 0, 0),
// ('En revisión', 'in_review', '#f59e0b', '👀', 3, 0, 0),
// ('Completado', 'completed', '#10b981', '✅', 4, 0, 1);

// INSERT INTO entries (category_id, title, data)
// VALUES (
//   '288401a0-dc61-4388-b69e-f400dd722ca5',
//   'Proyecto Base',
//   '{
//     "project_name":"Nuevo Proyecto",
//     "version":"0.1.0",
//     "authors":[],
//     "description":"# Descripción del Proyecto\n\nComienza a diseñar tu videojuego aquí.",
//     "tags":["sin-clasificar"]
//   }'
// );

// INSERT INTO entries (category_id, title, data)
// VALUES (
//   '23d16493-cdff-4889-b789-4182f3943522',
//   'Validación de Títulos Únicos',
//   '{
//     "rule_name":"unique_entry_titles",
//     "rule_type":"validation",
//     "enabled":true,
//     "priority":10,
//     "config":{"scope":"per_category","case_sensitive":false},
//     "description":"# Validación de Títulos Únicos\n\nAsegura que no haya entradas duplicadas."
//   }'
// );

// INSERT INTO roles (id, name) VALUES (1, 'admin');
// INSERT INTO roles (id, name) VALUES (2, 'user');
// INSERT INTO roles (id, name) VALUES (3, 'moderator');