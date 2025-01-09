import { create } from "zustand";
import axios from '../lib/axios';
import { toast } from 'react-hot-toast';
import { updateQuantity } from "../../../backend/controllers/cart.controller";

export const useCartStore = create((set, get) => ({
  cart: [],
  coupon: null,
  total: 0,
  subtotal: 0,
  isCouponApplied: false,

  getMyCoupon: async () => {
    try {
      const response = await axios.get("/coupons");
      set({ coupon: response.data });
    } catch (error) {
      console.error("Error fetching coupon: ", error);
    }
  },

  applyCoupon: async (code) => {
    try {
      const response = await axios.post("/coupons/validate", { code });
      set({ coupon: response.data, isCouponApplied: true });
      get().calculateTotals();
      toast.success("Coupon applied successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to apply coupon");
    }
  },

  removeCoupon: () => {
    set({ coupon: null, isCouponApplied: false });
    get().calculateTotals();
    toast.success("Coupon removed");
  },

  getCartItems: async () => {
    try {
      const res = await axios.get("/cart");
      set({ cart: res.data });
      get().calculateTotals();
    } catch (error) {
      set({ cart: [] });
      toast.error(error.response.data.message || "Failed to fetch cart items");
    }
  },

  addToCart: async (product) => {
    try {
      const res = await axios.post("/cart", { productId: product._id });
      
      set((prevState) => {
				const existingItem = prevState.cart.find((item) => item._id === product._id);
				const newCart = existingItem
					? prevState.cart.map((item) =>
							item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
					  )
					: [...prevState.cart, { ...product, quantity: 1 }];
				return { cart: newCart };
			});
      get().calculateTotals();
      toast.success("Product added to cart");
    } catch (error) {
      toast.error(error.response.data.message || "Failed to add product to cart");
    }
  },

  removeFromCart: async (productId) => {
    try {
      await axios.delete(`/cart`, { data: { productId } });
      set(prevState => ({ cart: prevState.cart.filter(item => item._id !== productId) }));
      get().calculateTotals();
    } catch (error) {
      toast.error(error.response.data.message || "Failed to remove product from cart");
    }
  },

  updateQuantity: async (productId, quantity) => {
    try {
      
      if (quantity < 1) {
        get().removeFromCart(productId);
        return;
      }

      await axios.put(`/cart/${productId}`, { quantity });

      set(prevState => ({
        cart: prevState.cart.map((item) => (item._id === productId ? { ...item, quantity } : item)),
      }));

      get().calculateTotals();
    } catch (error) {
      toast.error(error.response.data.message || "Failed to update quantity");
    }
  },

  clearCart: async () => {

		try {
      await axios.delete("/cart");
      set({ cart: [], coupon: null, total: 0, subtotal: 0 });
      console.log("cart cleared");
    } catch (error) {
      toast.error(error.response.data.message || "Failed to clear cart");
    }
	},
  
  // utility function to calculate totals
  calculateTotals: () => {
    const { cart, coupon } = get();
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let total = subtotal;
    if (coupon) {
      const discount = subtotal * (coupon.discountPercentage / 100);
      total = subtotal - discount;
    }
    set({ subtotal, total });
  },

}));