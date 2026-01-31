import { getServiceClient } from '@/lib/supabaseClient';

export const onRequest = async (context, next) => {

  const { url, cookies, redirect } = context;

  try {
    const supabase = getServiceClient();

    const appSettings = await supabase.from('app_settings').select('*').eq('key', 'private_mode').single();

    const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout'];
    if (publicPaths.some(path => url.pathname.startsWith(path))) {
      return next();
    }

    // Verificar cookie de autenticación
    const authToken = cookies.get('auth_token')?.value;
    const username = cookies.get('username')?.value;
  
    // Si no está en modo privado, permitir acceso
    if (appSettings.data && appSettings.data.value === 'true' && !authToken && !username) {
      return redirect('/login');
    }

    const allUsers = await supabase.from('users').select('*');
    const relationUserRoles = await supabase.from('user_roles').select('*');

    if (url.pathname.startsWith('/admin') && relationUserRoles.data.find((ur) => ur.user_id == allUsers.data.find((u) => u.username == username)?.id)?.role_id !== 1) {

      return redirect('/');

    }

    const session = await supabase.from('sessions').select('*').eq('token', authToken).eq('username', username).single();
  
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
      await supabase.from('sessions').delete().eq('token', authToken);
      cookies.delete('auth_token');
      cookies.delete('username');
      return redirect('/login');
    }
    
    // Actualizar última actividad
    await supabase.from('sessions').update({ last_activity: new Date().toISOString() }).eq('token', authToken);

    // Continuar con la solicitud
    return next();

  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  }

  return next();
  
};