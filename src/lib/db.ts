// src/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initializeDatabase, seedDatabase } from '@/lib/seed';

// Crear instancia de base de datos
export let db: Database.Database | null = null;
let initPromise: Promise<void> | null = null;

export async function initDb() {

  if (db) return db; // ya inicializada

  const dataDir = path.join(process.cwd(), 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!initPromise) {
    initPromise = (async () => {
      const dbPath = path.resolve(process.cwd(), 'data/game-design.db');
      db = new Database(dbPath);
      db.pragma('foreign_keys = ON');
    })();
  }

  await initPromise;

  return db;
}

export async function addTables() {
  if (!db) throw new Error('DB not initialized');

  try {
    const init = await initializeDatabase();
    if (!init.success) throw new Error('DB initialization failed');

    // Sembrar datos
    const seed = await seedDatabase();
    if (!seed.success) throw new Error('DB seeding failed');
  } catch (error) {
    console.error('Error adding tables:', error);
  }

  return db;
}

// Función para cerrar la base de datos
export function closeDatabase() {
  db?.close();
}

export function databaseHasTables(db: Database.Database): boolean {
  const row = db
    .prepare(`
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      LIMIT 1
    `)
    .get();

  return !!row;
}

// Exportar la instancia de la base de datos
export default db;