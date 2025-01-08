import { create } from 'zustand';
import toast from 'react-hot-toast';
import axios from '../lib/axios';

export const useProductStore = create((set) => ({
  products: [],
  loading: false,
  setProducts: (products) => set({ products }),

  createProduct: async (productData) => {
    set({ loading: true });

    try {
      const res = await axios.post('/products', productData);
      set((state) => ({
        products: [...state.products, res.data],
        loading: false,
      }));
      toast.success('Product created successfully');
    } catch (error) {
      toast.error(error.response.data.message);
      set({ loading: false });
    }
  },
  
  fetchAllProducts: async () => {
    try {
      set({ loading: true });
      const res = await axios.get('/products');
      set({ products: res.data.products, loading: false });
    } catch (error) {
      set({ error: "Failed to fetch products", loading: false });
      toast.error(error.response.data.message || "Failed to fetch products");
    }
  },

  toggleFeaturedProduct: async (productId) => {
    try {
      set({ loading: true });
      const res = await axios.patch(`/products/${productId}`);
      set((prevProducts) => ({
        products: prevProducts.products.map((product) => 
          product._id === productId ? { ...product, isFeatured: res.data.isFeatured } : product),
        loeading: false,
      }));
    } catch (error) {
      set({ error: "Failed to toggle featured product", loading: false });
      toast.error(error.response.data.message || "Failed to toggle featured product");
    }
  },

  deleteProduct: async (productId) => {
    try {
      set({ loading: true });
      await axios.delete(`/products/${productId}`);
      set((prevProducts) => ({
        products: prevProducts.products.filter((product) => product._id !== productId),
        loading: false,
      }));
      toast.success("Product deleted successfully");
    } catch (error) {
      set({ error: "Failed to delete product", loading: false });
      toast.error(error.response.data.message || "Failed to delete product");
    }
  },
}));