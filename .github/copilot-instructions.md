# AI Coding Guidelines for Abstract Game Design System

## Architecture Overview
This is an Astro-based web application for managing game design entities through a flexible category-field-entry system. Core components:
- **Categories**: Define entity types (e.g., "Character", "Item") with custom fields
- **Fields**: Configurable attributes (text, number, boolean, markdown, enum, list types)
- **Entries**: Instances of categories with data stored as JSON
- **Relations**: Links between categories and entries
- **Task System**: Built-in task management as a special category

## Database Patterns
- Uses SQLite with `better-sqlite3` and prepared statements
- Entry data stored as JSON in `data` column
- Query JSON fields using `json_extract(data, '$.field_name')`
- Foreign keys enabled with `PRAGMA foreign_keys = ON`
- Example: `db.prepare('SELECT * FROM entries WHERE json_extract(data, \'$.status\') = ?').all('done')`

## Key Conventions
### Data Storage
- Entry data: Always JSON string in `data` column
- Field configs: JSON string with type-specific options
- IDs: Use `nanoid()` for new records
- Timestamps: ISO strings with `new Date().toISOString()`

### API Routes
- Follow Astro APIRoute pattern with GET/POST handlers
- Return JSON responses with consistent error format
- Use prepared statements for all queries
- Example location: `src/pages/api/entries.ts`

### Dynamic Forms
- Forms generated from category fields in database
- Field types: text, number, boolean, markdown, enum, list
- Config parsing: `JSON.parse(field.config)` for options
- Validation: Use `required` attribute from field definition

### Task System
- Tasks are entries in 'task' category with special fields
- Status tracking: 'todo', 'in_progress', 'done'
- Hierarchical: `parent_task_id` for subtasks
- Filtering: Use `json_extract` for status/priority queries

### URL Structure
- Categories: `/categories/[slug]`
- Entries: `/entries/[categorySlug]/[entryId]`
- Creation: `/entries/[categorySlug]/create`

## Development Workflow
- **Database**: Initialize with `initializeDatabase()` from `src/lib/seed.ts`
- **Migrations**: Add schema changes in `src/lib/migrations/`
- **Build**: `npm run build` (SSR output)
- **Dev**: `npm run dev` (port 4321, host true)
- **Styling**: Tailwind CSS with custom components

## Common Patterns
### Creating Entries
```typescript
const insert = db.prepare('INSERT INTO entries (id, category_id, title, data) VALUES (?, ?, ?, ?)');
insert.run(nanoid(), categoryId, title, JSON.stringify(dataObject));
```

### Querying with JSON
```typescript
const tasks = db.prepare(`
  SELECT * FROM entries 
  WHERE category_id = ? AND json_extract(data, '$.status') = ?
`).all(taskCategoryId, 'todo');
```

### Field Validation
```typescript
const config = field.config ? JSON.parse(field.config) : {};
// Use config.min, config.max, config.options, etc.
```

### Relations
- Use `relation_links` table for N:N entry relationships
- Cardinality defined in `relations` table
- Bidirectional support with `reverse_name`

Reference files: `src/lib/db.ts`, `src/lib/seed.ts`, `src/pages/api/entries.ts`, `src/pages/entries/[categorySlug]/create.astro`