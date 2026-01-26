// src/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initializeDatabase, seedDatabase } from '@/lib/seed';

// Crear instancia de base de datos
export let db: Database.Database | null = null;

export async function initDb() {
  if (db) return db; // ya inicializada

  const dataDir = path.join(process.cwd(), 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Ruta a la base de datos (en /data en la raíz del proyecto)
  const dbPath = path.resolve(process.cwd(), 'data/game-design.db');

  db = new Database(dbPath);

  db.pragma('foreign_keys = ON');

  // Inicializar tablas
  const init = await initializeDatabase();
  if (!init.success) throw new Error('DB initialization failed');

  // Sembrar datos
  const seed = await seedDatabase();
  if (!seed.success) throw new Error('DB seeding failed');

  console.log('✅ Base de datos lista');
  return db;
}

// Función para cerrar la base de datos
export function closeDatabase() {
  db?.close();
}

// Exportar la instancia de la base de datos
export default db;