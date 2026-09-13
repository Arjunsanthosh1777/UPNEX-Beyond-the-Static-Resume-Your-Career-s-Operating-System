import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(localStorage.getItem("upnex_guest") === "true" ? { id: "guest", name: "Guest learner", email: "", role: "GUEST", guest: true } : null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.removeItem("upnex_guest");
    setUser(res.data.user);
  }

  async function register(name, email, password) {
    const res = await api.post("/auth/register", { name, email, password });
    localStorage.removeItem("upnex_guest");
    setUser(res.data.user);
  }

  function continueAsGuest() {
    localStorage.setItem("upnex_guest", "true");
    setUser({ id: "guest", name: "Guest learner", email: "", role: "GUEST", guest: true });
  }

  async function logout() {
    if (!user?.guest) await api.post("/auth/logout");
    localStorage.removeItem("upnex_guest");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, continueAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);