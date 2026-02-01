import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ 
        error: 'Tipo de archivo no permitido. Use JPG, PNG, GIF o WebP' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ 
        error: 'Archivo demasiado grande. Máximo 5MB' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generar nombre único
    const ext = path.extname(file.name);
    const filename = `${crypto.randomUUID()}${ext}`;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'entries');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Guardar archivo
    const filepath = path.join(uploadsDir, filename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(filepath, buffer);
    
    // Devolver URL pública
    const publicUrl = `/uploads/entries/${filename}`;
    
    return new Response(JSON.stringify({ 
      success: true,
      url: publicUrl 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};