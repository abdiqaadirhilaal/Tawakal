import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as adminApi from '../services/adminApi';
import { BACK_OFFICE_ROLES, POS_ROLES, SUPERVISOR_ROLES, hasRole } from '../utils/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    adminApi
      .me()
      .then((d) => alive && setUser(d.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setChecking(false));
    const onExpired = () => setUser(null);
    window.addEventListener('tawakal:auth-expired', onExpired);
    return () => {
      alive = false;
      window.removeEventListener('tawakal:auth-expired', onExpired);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const d = await adminApi.login(credentials);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      checking,
      login,
      logout,
      isAdmin: user?.role === 'admin',
      isSupervisor: hasRole(user, SUPERVISOR_ROLES),
      canPos: hasRole(user, POS_ROLES),
      canBackOffice: hasRole(user, BACK_OFFICE_ROLES),
    }),
    [user, checking, login, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth waa in lagu dhex isticmaalaa AuthProvider');
  return ctx;
}
