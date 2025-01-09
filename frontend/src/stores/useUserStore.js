import { create } from 'zustand';
import axios from '../lib/axios';
import { toast } from 'react-hot-toast';

export const useUserStore = create((set, get) => ({
  user: undefined,
  loading: false,
  checkingAuth: false,
  
  signup: async ({ name, email, password, confirmPassword }) => {
    set({ loading: true });

    if (password !== confirmPassword) {
      set({ loading: false });
      return toast.error("Passwords do not match");
    }

    try {
      const res = await axios.post("/auth/signup", { name, email, password });
      set({ user: res.data, loading: false });
      toast.success("Account created successfully");
    } catch (error) {
      set({ loading: false });
      toast.error(error.response.data.message || "An error occurred.");
    }
  },

  login: async ( email, password ) => {
    set({ loading: true });

    try {
      const res = await axios.post("/auth/login", { email, password });
      console.log("user is here", res.data);
      
      set({ user: res.data, loading: false });
      toast.success("Logged in successfully");
    } catch (error) {
      set({ loading: false });
      toast.error(error.response.data.message || "An error occurred.");
    }
  },

  checkAuth: async () => {
    set({ checkingAuth: true });
    try {
      const res = await axios.get("/auth/profile");
      set({ user: res.data, checkingAuth: false });
    } catch (error) {
      console.log(error.message);
      set({ checkingAuth: false, user: null });
    }
  },
  
  logout: async () => {
    try {
      await axios.post("/auth/logout");
      set({ user: null });
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred during logout.");
    }
  },

  refreshToken: async () => {
    if (get().checkingAuth) return;

    set({ checkingAuth: true });
    try {
      const res = await axios.post("/auth/refresh-token");
      return res.data;
    } catch (error) {
      set({ user: null });
      throw error;
    } finally {
      set({ checkingAuth: false });
    }
  },

  
}));

// TODO: Implement the axios intercepters for refreshing the access token

// Axios interceptors
let refreshPromise = null;

axios.interceptors.response.use(
  (resopnse) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // if a refresh token is already in progress, wait for it to complete
        if (refreshPromise) {
          await refreshPromise;
          return axios(originalRequest);
        }

        // start a new refresh process
        refreshPromise = useUserStore.getState().refreshToken();
        await refreshPromise;
        refreshPromise = null;

        return axios(originalRequest);
      } catch (refreshError) {
        useUserStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
)