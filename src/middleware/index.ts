import type { MiddlewareHandler } from 'astro';
import { db, initDb } from '@/lib/db';

export const onRequest: MiddlewareHandler = async (context, next) => {

  await initDb();

  const { url, cookies, redirect } = context;
  
  // Verificar si la aplicación está en modo privado
  const appSettings = db!.prepare('SELECT * FROM app_settings WHERE key = ?').get('private_mode') as any;
  
  // Si no está en modo privado, permitir acceso
  if (!appSettings || appSettings.value !== 'true') {
    return next();
  }
  
  // Rutas públicas (login y API de login)
  const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout'];
  if (publicPaths.some(path => url.pathname.startsWith(path))) {
    return next();
  }
  
  // Verificar cookie de autenticación
  const authToken = cookies.get('auth_token')?.value;
  const username = cookies.get('username')?.value;
  
  if (!authToken || !username) {
    return redirect('/login');
  }
  
  // Verificar que el token sea válido
  const session = db!.prepare('SELECT * FROM sessions WHERE token = ? AND username = ?').get(authToken, username) as any;
  
  if (!session) {
    cookies.delete('auth_token');
    cookies.delete('username');
    return redirect('/login');
  }
  
  // Verificar que la sesión no haya expirado (7 días)
  const sessionDate = new Date(session.created_at);
  const now = new Date();
  const diffDays = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (diffDays > 7) {
    db!.prepare('DELETE FROM sessions WHERE token = ?').run(authToken);
    cookies.delete('auth_token');
    cookies.delete('username');
    return redirect('/login');
  }
  
  // Actualizar última actividad
  db!.prepare('UPDATE sessions SET last_activity = ? WHERE token = ?').run(new Date().toISOString(), authToken);
  
  // Continuar con la solicitud
  return next();
};