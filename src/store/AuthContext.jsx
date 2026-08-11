import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const saved = localStorage.getItem("user");
    if (token && saved) {
      setUser(JSON.parse(saved));
      // Optionally refresh profile
      api
        .get("/auth/me")
        .then((res) => {
          setUser(res.data.data);
          localStorage.setItem("user", JSON.stringify(res.data.data));
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const langMsg = (en, km) => {
    const lang = localStorage.getItem("language") || "en";
    return lang === "km" ? km : en;
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.data.token);
    localStorage.setItem("user", JSON.stringify(data.data));
    setUser(data.data);
    toast.success(
      data.message || langMsg("Login successful!", "ចូលដោយជោគជ័យ!"),
    );
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", {
      name,
      email,
      password,
    });
    localStorage.setItem("token", data.data.token);
    localStorage.setItem("user", JSON.stringify(data.data));
    setUser(data.data);
    toast.success(
      data.message || langMsg("Registration successful!", "ចុះឈ្មោះដោយជោគជ័យ!"),
    );
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success(langMsg("Logged out successfully", "ចាកចេញដោយជោគជ័យ"));
  };

  const updateUser = (updated) => {
    setUser(updated);
    localStorage.setItem("user", JSON.stringify(updated));
  };

  const updateProfile = async (payload) => {
    const { data } = await api.put("/auth/profile", payload);
    const next = data.data || { ...user, ...payload };
    setUser(next);
    localStorage.setItem("user", JSON.stringify(next));
    toast.success(
      data.message || langMsg("Profile updated", "បានធ្វើបច្ចុប្បន្នភាព"),
    );
    return next;
  };

  // Called after Google OAuth redirect
  const handleOAuthToken = async (token) => {
    localStorage.setItem("token", token);
    try {
      const { data } = await api.get("/auth/me");
      localStorage.setItem("user", JSON.stringify(data.data));
      setUser(data.data);
      toast.success(langMsg("Google login successful!", "ចូល Google ជោគជ័យ!"));
      return data.data;
    } catch (err) {
      toast.error("OAuth failed. Please try again.");
      localStorage.removeItem("token");
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        updateProfile,
        handleOAuthToken,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
