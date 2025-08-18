import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from "react";
import { fetchCurrentUser } from "../api/authService";
import { toast } from "sonner";

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: any;
  isLoading: boolean;
  login: (token: string, userData: any, remember?: boolean) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async (storedToken: string) => {
    try {
      const userData = await fetchCurrentUser(storedToken);
      setToken(storedToken);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error("Token validation failed:", error);
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      toast.error(error.message || "Session expired. Please log in again.");
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (storedToken) {
      loadUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, [loadUser]);

  const login = (newToken: string, userData: any, remember: boolean = true) => {
    if (remember) {
      localStorage.setItem("token", newToken);
    } else {
      sessionStorage.setItem("token", newToken);
    }
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    toast.success("Login successful!");
  };

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    toast.info("Logged out successfully.");
  };

  const refreshUser = async () => {
    if (!token) return;
    setIsLoading(true);
    await loadUser(token);
  };

  const hasRole = (roles: string | string[]) => {
    if (!user?.role) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
