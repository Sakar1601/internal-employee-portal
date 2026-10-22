import { useCallback, useEffect, useMemo, useState } from "react";
import { api, tokenStore, SESSION_EXPIRED_EVENT } from "../api";
import { AuthContext } from "./auth";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(tokenStore.get());

  useEffect(() => {
    const expire = () => setToken(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    tokenStore.set(data.access_token);
    setToken(data.access_token);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
  }, []);

  const value = useMemo(() => ({ token, login, logout }), [token, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
