# abstract-game-design-system
Local system to make your GDD or plan your own projects
# 🎮 Abstract Game Design System

> Sistema local de diseño de videojuegos basado en entidades para crear y gestionar tu GDD (Game Design Document) de forma estructurada.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Astro](https://img.shields.io/badge/Astro-4.0-FF5D01?logo=astro)
![SQLite](https://img.shields.io/badge/SQLite-Local-003B57?logo=sqlite)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Requisitos](#-requisitos)
- [Instalación](#-instalación)
- [Inicializar el proyecto](#-inicializar-el-proyecto)
- [Uso básico](#-uso-básico)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Casos de uso](#-casos-de-uso)
- [API](#-api)
- [Personalización](#-personalización)
- [Troubleshooting](#-troubleshooting)
- [Contribuir](#-contribuir)

---

## ✨ Características

### **Sistema de Entidades Flexible**
- ✅ Crea categorías personalizadas (Personajes, Habilidades, Ítems, Quests, etc.)
- ✅ Define campos custom por categoría (texto, números, markdown, enums, listas, JSON, relaciones)
- ✅ Herencia de campos base desde la categoría Entity
- ✅ Relaciones entre categorías (1:1 y 1:N)

### **Gestión de Tareas y Progreso**
- ✅ Sistema de tareas Kanban integrado
- ✅ Subtareas jerárquicas ilimitadas
- ✅ Asignación de tareas a entradas específicas o categorías completas
- ✅ Indicadores de progreso visual
- ✅ Prioridades (baja, media, alta, crítica)

### **Colaboración y Seguimiento**
- ✅ Comentarios en entradas y tareas
- ✅ Asignación de responsables
- ✅ Sistema de etiquetas global
- ✅ Búsqueda avanzada con filtros

### **Características Técnicas**
- 🗄️ Base de datos SQLite local (sin servidor)
- 🚀 Rendimiento ultra-rápido (Astro + SSR)
- 📦 Todo en un solo archivo `.db`
- 🔒 Tus datos nunca salen de tu máquina
- 📸 Upload de imágenes local

---

## 📦 Requisitos

- **Node.js** 18.0 o superior
- **npm** o **pnpm** (recomendado)

---

## 🚀 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/abstract-game-design-system.git
cd abstract-game-design-system

# Instalar dependencias
npm install
# o con pnpm
pnpm install
```

---

## 🎯 Inicializar el proyecto

### **1. Inicializar la base de datos**

La primera vez que ejecutes el proyecto, necesitas crear la base de datos:

```bash
npm run dev
```

Luego, visita en tu navegador:

```
http://localhost:4321/api/seed
```

Esto creará:
- ✅ Base de datos SQLite en `/data/game-design.db`
- ✅ Categorías base (Meta, System, Entity)
- ✅ Campos heredables básicos
- ✅ Entrada inicial con metadata del proyecto

### **2. (Opcional) Activar sistema de tareas**

Visita:

```
http://localhost:4321/api/tasks/migrate
```

Esto añadirá:
- ✅ Categoría Task
- ✅ Tablas: `task_completion`, `tags`, `entry_tags`
- ✅ Índices optimizados

### **3. ¡Listo!**

Ahora puedes acceder a:

```
http://localhost:4321
```

---

## 📖 Uso Básico

### **Crear tu primera categoría**

1. Ve a **"Nueva Categoría"**
2. Rellena:
   - **Nombre**: `Personaje`
   - **Descripción**: `Personajes del juego`
   - **Color**: Selecciona uno
3. Click en **"Crear Categoría"**

### **Añadir campos personalizados**

1. Entra a la categoría recién creada
2. Click en **"+ Añadir Campo"**
3. Ejemplo:
   - **Etiqueta**: `Puntos de Vida`
   - **Tipo**: `Número`
   - **Requerido**: ✅
   - **Texto de ayuda**: `HP inicial del personaje`

### **Crear una entrada**

1. Desde la categoría, click en **"+ Nueva Entrada"**
2. Rellena los campos
3. Sube una imagen (opcional)
4. Click en **"Crear Entrada"**

### **Crear relaciones**

Para relacionar categorías (ej: Personaje → Elemento):

1. En la categoría **Personaje**, añade un campo:
   - **Tipo**: `Relación (FK a otra categoría)`
   - **Categoría relacionada**: `Elemento`
   - **Permitir múltiples**: ❌ (para 1:1) o ✅ (para 1:N)

---

## 📁 Estructura del Proyecto

```
abstract-game-design-system/
├── data/
│   └── game-design.db          # Base de datos SQLite
├── public/
│   └── uploads/
│       └── entries/            # Imágenes subidas
├── src/
│   ├── components/
│   │   ├── EntryTasksWidget.astro
│   │   ├── FieldRenderer.astro
│   │   └── GlobalSearch.astro
│   ├── lib/
│   │   ├── db.ts               # Conexión SQLite
│   │   ├── seed.ts             # Seed inicial
│   │   └── migrations/
│   │       └── add_tasks.ts    # Migración de tareas
│   ├── pages/
│   │   ├── index.astro         # Dashboard
│   │   ├── api/                # Endpoints REST
│   │   ├── categories/         # CRUD categorías
│   │   ├── entries/            # CRUD entradas
│   │   └── tasks/              # Gestión de tareas
│   └── styles/
│       └── global.css
├── astro.config.mjs
├── package.json
└── README.md
```

---

## 🎮 Casos de Uso

### **RPG de fantasía**

```
Categorías:
- Personaje (campos: clase, nivel, stats)
  ↳ Relación con: Raza, Facción
- Habilidad (campos: daño, coste_mana, cooldown)
  ↳ Relación con: Elemento, Personaje
- Ítem (campos: rareza, precio, efecto)
- Quest (campos: nivel_requerido, recompensas)
  ↳ Relación con: Personaje, Ítem
```

### **Roguelike**

```
Categorías:
- Enemigo (campos: hp, velocidad, patrón_ataque)
- Powerup (campos: duración, efecto)
- Nivel (campos: dificultad, semilla)
  ↳ Relación con: Enemigo (múltiples)
```

### **Gestión de proyecto**

```
Categorías:
- Feature (campos: prioridad, sprint, puntos)
  ↳ Relación con: Épica
- Bug (campos: severidad, reproducible)
- Asset (campos: tipo, resolución, formato)
```

---

## 🔌 API

### **Categorías**

```typescript
// Listar categorías
GET /api/categories

// Crear categoría
POST /api/categories
Body: { name, slug, description, color }

// Eliminar categoría
DELETE /api/categories
Body: { id }
```

### **Entradas**

```typescript
// Listar entradas de una categoría
GET /api/entries?category_id={id}

// Obtener entrada específica
GET /api/entries?id={id}

// Crear entrada
POST /api/entries
Body: { category_id, title, data }

// Actualizar entrada
PUT /api/entries
Body: { id, data }

// Eliminar entrada
DELETE /api/entries
Body: { id }
```

### **Búsqueda**

```typescript
// Búsqueda global
GET /api/search?q={query}&type={all|entries|categories}&category_id={id}&tags={tag1,tag2}
```

### **Upload de imágenes**

```typescript
// Subir imagen
POST /api/upload-image
Body: FormData { image: File }

Response: { url: '/uploads/entries/xxx.jpg' }
```

---

## 🎨 Personalización

### **Cambiar colores**

Edita `tailwind.config.cjs`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#6366f1', // Indigo
        secondary: '#10b981', // Green
      }
    }
  }
}
```

### **Añadir tipos de campo personalizados**

Edita `FieldRenderer.astro`:

```astro
{field.type === 'mi_tipo_custom' && (
  <div>
    <!-- Tu renderizado personalizado -->
  </div>
)}
```

---

## 🐛 Troubleshooting

### **Error: Cannot find module 'better-sqlite3'**

```bash
npm install better-sqlite3
npm rebuild better-sqlite3
```

### **La base de datos no se crea**

1. Verifica que existe la carpeta `/data`
2. Ejecuta manualmente:
   ```bash
   mkdir -p data
   ```
3. Visita `/api/seed` de nuevo

### **Las imágenes no se suben**

1. Verifica permisos de escritura en `/public/uploads/`
2. Crea la carpeta manualmente:
   ```bash
   mkdir -p public/uploads/entries
   ```

### **Resetear todo**

Ver sección [Limpiar datos](#-limpiar-datos-para-empezar-de-cero) más abajo.

---

## 🧹 Limpiar datos para empezar de cero

**ADVERTENCIA:** Esto eliminará TODOS los datos.

```bash
# Opción 1: Eliminar solo la base de datos
rm data/game-design.db

# Opción 2: Limpiar todo (base de datos + imágenes)
rm -rf data/game-design.db
rm -rf public/uploads/entries/*

# Luego reinicializa
npm run dev
# Visita http://localhost:4321/api/seed
```

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT © MythinkIndie

---

## 🙏 Agradecimientos

- [Astro](https://astro.build) - Framework web
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite bindings
- [Tailwind CSS](https://tailwindcss.com) - Estilos
- [Lucide Icons](https://lucide.dev) - Iconos

---

## 📞 Soporte

- 🐛 [Reportar un bug](https://github.com/tu-usuario/abstract-game-design-system/issues)
- 💡 [Solicitar una feature](https://github.com/tu-usuario/abstract-game-design-system/issues)
- 📧 Email: tu-email@example.com

---

**⭐ Si este proyecto te ayuda, considera darle una estrella en GitHub**