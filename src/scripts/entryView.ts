const entryId = document.body.dataset.entryId!;
let hasChanges = false;
let currentData: any = {};

// ============================================
// 1. CARGAR DATOS INICIALES
// ============================================

async function loadRelationSelects() {
  const relationSelects = document.querySelectorAll('.relation-select');

  for (const select of relationSelects) {
    const fieldName = (select as HTMLElement).dataset.field!;
    const relatedCategoryId = (select as HTMLElement).dataset.category!;
    const allowMultiple = (select as HTMLElement).dataset.multiple === 'true';
    const isSelfRelation = (select as HTMLElement).dataset.selfRelation === 'true';

    try {
      const response = await fetch(`/api/entries?category_id=${relatedCategoryId}`);
      const entries = await response.json();

      const currentValue = currentData[fieldName];
      const selectedIds = Array.isArray(currentValue)
        ? currentValue
        : (currentValue ? [currentValue] : []);

      entries.forEach((entry: any) => {
        if (isSelfRelation && entry.id === entryId) return;
        if (allowMultiple && selectedIds.includes(entry.id)) return;

        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = entry.title;

        if (!allowMultiple && currentValue === entry.id) {
          option.selected = true;
        }

        select.appendChild(option);
      });

    } catch (error) {
      console.error('Error loading relation options:', error);
    }
  }
}

async function loadCurrentData() {
  try {
    const response = await fetch(`/api/entries?id=${entryId}`);
    const entry = await response.json();
    currentData = JSON.parse(entry.data);

    await loadRelationSelects();

  } catch (error) {
    console.error('Error loading data:', error);
  }
}

loadCurrentData();

async function saveChangesQuietly() {
  try {
    const response = await fetch('/api/entries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId, data: currentData })
    });
    
    if (response.ok) {
      // Recargar silenciosamente
      window.location.reload();
    } else {
      const error = await response.json();
      console.error('Error al guardar:', error);
      alert('Error al guardar: ' + error.error);
    }
  } catch (error) {
    console.error('Error de red:', error);
    alert('Error de red al guardar');
  }
}

// ============================================
// 2. DETECTAR CAMBIOS EN CAMPOS EDITABLES
// ============================================

document.querySelectorAll('.editable-field').forEach(field => {
  field.addEventListener('input', () => {
    hasChanges = true;
    document.getElementById('saveBtn')?.classList.remove('hidden');
  });

  field.addEventListener('change', () => {
    hasChanges = true;
    document.getElementById('saveBtn')?.classList.remove('hidden');
  });
});

// ============================================
// 3. MANEJO DE LISTAS DINÁMICAS
// ============================================

document.querySelectorAll('.add-list-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const fieldName = (btn as HTMLElement).dataset.field!;
    const input = document.querySelector(`[data-list-input="${fieldName}"]`) as HTMLInputElement;
    
    if (input && input.value.trim()) {
      if (!currentData[fieldName]) currentData[fieldName] = [];
      currentData[fieldName].push(input.value.trim());
      input.value = '';
      hasChanges = true;
      document.getElementById('saveBtn')?.classList.remove('hidden');
      saveChangesQuietly();
    }
  });
});

document.querySelectorAll('.remove-list-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const fieldName = (btn as HTMLElement).dataset.field!;
    const item = (btn as HTMLElement).dataset.item!;
    
    if (currentData[fieldName]) {
      currentData[fieldName] = currentData[fieldName].filter((i: string) => i !== item);
      hasChanges = true;
      document.getElementById('saveBtn')?.classList.remove('hidden');
      saveChangesQuietly();
    }
  });
});

// ============================================
// 4. GUARDAR CAMBIOS
// ============================================

document.getElementById('saveBtn')?.addEventListener('click', async () => {
  const updatedData: any = { ...currentData };
  
  // Recopilar valores de campos editables
  document.querySelectorAll('.editable-field').forEach(field => {
    const fieldName = (field as HTMLElement).dataset.field;
    const fieldType = (field as HTMLElement).dataset.type;
    
    if (!fieldName) return;
    
    if (fieldType === 'boolean') {
      updatedData[fieldName] = (field as HTMLInputElement).checked;
    } else if (fieldType === 'number') {
      const val = (field as HTMLInputElement).value;
      updatedData[fieldName] = val ? parseFloat(val) : null;
    } else if (fieldType === 'json') {
      try {
        updatedData[fieldName] = JSON.parse((field as HTMLTextAreaElement).value || '{}');
      } catch {
        alert(`Error en JSON del campo ${fieldName}`);
        return;
      }
    } else if (field.tagName === 'INPUT') {
      updatedData[fieldName] = (field as HTMLInputElement).value;
    } else if (field.tagName === 'TEXTAREA') {
      updatedData[fieldName] = (field as HTMLTextAreaElement).value;
    } else if (field.tagName === 'SELECT') {
      updatedData[fieldName] = (field as HTMLSelectElement).value;
    } else if (field.getAttribute('contenteditable')) {
      updatedData[fieldName] = field.textContent?.trim() || '';
    }
  });
  
  try {
    const response = await fetch('/api/entries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId, data: updatedData })
    });
    
    if (response.ok) {
      hasChanges = false;
      document.getElementById('saveBtn')?.classList.add('hidden');
      showToast('✅ Cambios guardados');
      saveChangesQuietly();
    } else {
      alert('Error al guardar');
    }
  } catch (error) {
    alert('Error de red');
  }
});

// ============================================
// 5. UPLOAD DE IMAGEN
// ============================================

document.getElementById('imageUpload')?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    alert('Por favor selecciona una imagen válida');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    alert('La imagen es demasiado grande. Máximo 5MB');
    return;
  }
  
  const placeholder = document.getElementById('imagePlaceholder')!;
  placeholder.innerHTML = `
    <div class="text-center">
      <svg class="animate-spin w-8 h-8 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-xs text-gray-500 mt-2">Subiendo...</p>
    </div>
  `;
  placeholder.style.display = 'flex';
  
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const uploadResponse = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) throw new Error('Error al subir');
    
    const { url } = await uploadResponse.json();
    currentData._image = url;
    
    await fetch('/api/entries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId, data: currentData })
    });
    
    saveChangesQuietly();
  } catch (error) {
    alert('Error al subir imagen');
    placeholder.style.display = 'flex';
  }
});

// Eliminar imagen
document.getElementById('removeImageBtn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (!confirm('¿Eliminar la imagen?')) return;
  
  currentData._image = null;
  
  await fetch('/api/entries', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: entryId, data: currentData })
  });
  
  saveChangesQuietly();
});

// ============================================
// 6. CHECKBOXES DE COMPLETITUD
// ============================================

document.querySelectorAll('.field-completion-checkbox').forEach(checkbox => {
  checkbox.addEventListener('change', async (e) => {
    const target = e.target as HTMLInputElement;
    const fieldId = target.dataset.fieldId;
    const isComplete = target.checked;
    
    try {
      await fetch('/api/field-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_id: entryId,
          field_id: fieldId,
          is_complete: isComplete
        })
      });
      
      saveChangesQuietly();
    } catch (error) {
      target.checked = !isComplete;
    }
  });
});

// ============================================
// 7. COMENTARIOS
// ============================================

document.getElementById('addCommentBtn')?.addEventListener('click', async () => {
  const textarea = document.getElementById('newCommentText') as HTMLTextAreaElement;
  const text = textarea.value.trim();
  
  if (!text) return;
  
  const newComment = {
    user: currentData._assigned_to || 'Usuario Anónimo',
    text: text,
    timestamp: new Date().toISOString()
  };
  
  if (!currentData._comments) currentData._comments = [];
  currentData._comments.push(newComment);
  
  try {
    await fetch('/api/entries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId, data: currentData })
    });
    
    saveChangesQuietly();
  } catch (error) {
    alert('Error al añadir comentario');
  }
});

document.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('.delete-comment')) {
    const btn = target.closest('.delete-comment') as HTMLElement;
    const timestamp = btn.dataset.timestamp;
    
    if (!confirm('¿Eliminar este comentario?')) return;
    
    currentData._comments = currentData._comments.filter((c: any) => c.timestamp !== timestamp);
    
    await fetch('/api/entries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId, data: currentData })
    });
    
    saveChangesQuietly();
  }
});

// ============================================
// 8. ASIGNACIÓN
// ============================================

document.getElementById('assignBtn')?.addEventListener('click', async () => {
  const input = document.getElementById('assignToInput') as HTMLInputElement;
  const userName = input.value.trim();
  
  if (!userName) return;
  
  currentData._assigned_to = userName;
  
  await fetch('/api/entries', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: entryId, data: currentData })
  });
  
  saveChangesQuietly();
});

document.getElementById('removeAssignment')?.addEventListener('click', async () => {
  if (!confirm('¿Quitar la asignación?')) return;
  
  currentData._assigned_to = null;
  
  await fetch('/api/entries', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: entryId, data: currentData })
  });
  
  saveChangesQuietly();
});

// ============================================
// 9. ELIMINAR ENTRADA
// ============================================

document.getElementById('deleteBtn')?.addEventListener('click', async () => {
  if (!confirm('¿Eliminar esta entrada?')) return;
  
  await fetch('/api/entries', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: entryId })
  });
  
  window.location.href = `/entries/${window.location.pathname.split('/')[2]}`;
});

// ============================================
// 10. ADVERTENCIA AL SALIR SIN GUARDAR
// ============================================

window.addEventListener('beforeunload', (e) => {
  if (hasChanges) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ============================================
// HELPERS
// ============================================

function showToast(message: string) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}