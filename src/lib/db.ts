// src/lib/db.ts
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ruta a la base de datos (en /data en la raíz del proyecto)
const dbPath = join(__dirname, '../../data/game-design.db');

// Asegurarse de que el directorio existe
const dataDir = join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Crear instancia de base de datos
export const db = new Database(dbPath);

// Habilitar claves foráneas
db.pragma('foreign_keys = ON');

// Funciones helper para queries comunes
export const queries = {
  // Categorías
  getAllCategories: db.prepare('SELECT * FROM categories ORDER BY created_at'),
  getCategoryById: db.prepare('SELECT * FROM categories WHERE id = ?'),
  getCategoryBySlug: db.prepare('SELECT * FROM categories WHERE slug = ?'),
  
  // Campos
  getFieldsByCategory: db.prepare('SELECT * FROM fields WHERE category_id = ? ORDER BY field_order, created_at'),
  
  // Entradas
  getEntriesByCategory: db.prepare('SELECT * FROM entries WHERE category_id = ? ORDER BY created_at DESC'),
  getEntryById: db.prepare('SELECT * FROM entries WHERE id = ?'),
  
  // Relaciones
  getRelationsBySourceCategory: db.prepare('SELECT * FROM relations WHERE source_category_id = ?'),
  getRelationsByTargetCategory: db.prepare('SELECT * FROM relations WHERE target_category_id = ?'),
};

// Función para cerrar la base de datos
export function closeDatabase() {
  db.close();
}

// Exportar la instancia de la base de datos
export default db;