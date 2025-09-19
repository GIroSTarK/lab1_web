import { useEffect, useMemo, useState } from 'react';
import { AuthContext, type AuthContextValue } from './context';
import type { User } from '../types';
import {
  login as apiLogin,
  me as apiMe,
  register as apiRegister,
  setToken as apiSetToken,
} from '../api';
import { connectSocket, disconnectSocket } from '../socket';

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await apiMe();
        if (!mounted) return;
        setUser(me);
        connectSocket(token);
      } catch {
        apiSetToken(null);
        setToken(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      async login(username: string, password: string) {
        const { token: t, user: u } = await apiLogin(username, password);
        apiSetToken(t);
        setToken(t);
        setUser(u);
        connectSocket(t);
      },
      async register(username: string, password: string) {
        const { token: t, user: u } = await apiRegister(username, password);
        apiSetToken(t);
        setToken(t);
        setUser(u);
        connectSocket(t);
      },
      logout() {
        apiSetToken(null);
        setToken(null);
        setUser(null);
        disconnectSocket();
      },
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
