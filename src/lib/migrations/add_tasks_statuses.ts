import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

export function addTaskStatusFields() {
  console.log('📝 Agregando campos de estado y asignación a tareas...');
  
  const taskCategory = db.prepare('SELECT id FROM categories WHERE slug = ?').get('task') as any;
  
  if (!taskCategory) {
    console.error('⚠️  Categoría Task no encontrada');
    return { success: false, message: 'Task category not found' };
  }
  
  // Verificar si ya existen los campos
  const statusField = db.prepare('SELECT id FROM fields WHERE category_id = ? AND name = ?')
    .get(taskCategory.id, 'status');
  
  const assignedField = db.prepare('SELECT id FROM fields WHERE category_id = ? AND name = ?')
    .get(taskCategory.id, 'assigned_to');
  
  if (statusField && assignedField) {
    console.log('✅ Los campos ya existen, actualizando...');
  }
  
  const insertField = db.prepare(`
    INSERT OR REPLACE INTO fields (id, category_id, name, label, type, required, unique_value, config, field_order, help_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Campo de estado
  if (!statusField) {
    insertField.run(
      nanoid(),
      taskCategory.id,
      'status',
      'Estado',
      'enum',
      1,
      0,
      JSON.stringify({
        options: ['todo', 'in_progress', 'done', 'blocked'],
        default: 'todo'
      }),
      3, // Después de is_completed
      'Estado actual de la tarea'
    );
    console.log('  ✓ Campo "status" creado');
  }
  
  // Campo de persona asignada
  if (!assignedField) {
    insertField.run(
      nanoid(),
      taskCategory.id,
      'assigned_to',
      'Asignado a',
      'text',
      0,
      0,
      JSON.stringify({ placeholder: 'Nombre de la persona' }),
      12, // Al final
      'Persona responsable de esta tarea'
    );
    console.log('  ✓ Campo "assigned_to" creado');
  }
  
  // Actualizar tareas existentes para agregar status=todo si no lo tienen
  const allTasks = db.prepare('SELECT id, data FROM entries WHERE category_id = ?')
    .all(taskCategory.id) as any[];
  
  let updated = 0;
  allTasks.forEach((task: any) => {
    try {
      const data = JSON.parse(task.data);
      let needsUpdate = false;
      
      if (!data.status) {
        data.status = 'todo';
        needsUpdate = true;
      }
      
      if (!data.assigned_to) {
        data.assigned_to = '';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        db.prepare('UPDATE entries SET data = ? WHERE id = ?')
          .run(JSON.stringify(data), task.id);
        updated++;
      }
    } catch (error) {
      console.error(`Error actualizando tarea ${task.id}:`, error);
    }
  });
  
  console.log(`  ✓ ${updated} tareas actualizadas con campos por defecto`);
  console.log('✅ Migración completada');
  
  return {
    success: true,
    message: 'Task status and assigned_to fields added successfully',
    updated_tasks: updated
  };
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  addTaskStatusFields();
}