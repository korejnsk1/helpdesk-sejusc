import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {}) // sem cookie válido — permanece deslogado
      .finally(() => setLoading(false));
  }, []);

  async function login(cpf, password) {
    const { data } = await api.post("/auth/login", { cpf, password });
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
  }

  function refreshUser() {
    return api.get("/auth/me").then((r) => setUser(r.data));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
