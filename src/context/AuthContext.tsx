import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type Perfil = {
  id: string;
  nombre_completo: string | null;
  correo: string | null;
  rol: 'admin' | 'lider' | 'agente' | 'vista';
};

type AuthContextType = {
  session: Session | null;
  perfil: Perfil | null;
  cargando: boolean;
  cerrarSesion: () => Promise<void>;
  refrescarPerfil: () => Promise<void>;
  esAdmin: boolean;
  esLider: boolean;
  esVista: boolean;
  puedeGestionar: boolean; // admin o lider
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarPerfil(session.user.id);
      else setCargando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) cargarPerfil(session.user.id);
      else {
        setPerfil(null);
        setCargando(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function cargarPerfil(userId: string) {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombre_completo, correo, rol')
      .eq('id', userId)
      .single();

    if (!error) setPerfil(data as Perfil);
    setCargando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
  }

  async function refrescarPerfil() {
    if (session?.user.id) await cargarPerfil(session.user.id);
  }

  const esAdmin = perfil?.rol === 'admin';
  const esLider = perfil?.rol === 'lider';
  const esVista = perfil?.rol === 'vista';
  const puedeGestionar = esAdmin || esLider;

  return (
    <AuthContext.Provider value={{ session, perfil, cargando, cerrarSesion, refrescarPerfil, esAdmin, esLider, esVista, puedeGestionar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
}