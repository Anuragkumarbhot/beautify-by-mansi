"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string;
  sizingNotes?: string;
  quantity: number;
};

type AddCartItem = Omit<CartItem, "key" | "quantity">;

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: AddCartItem) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "beautify-by-mansi-v2-cart";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const safeItems = parsed.filter((item): item is CartItem =>
            Boolean(
              item &&
                typeof item.key === "string" &&
                typeof item.productId === "string" &&
                typeof item.slug === "string" &&
                typeof item.name === "string" &&
                typeof item.price === "number" &&
                typeof item.image === "string" &&
                typeof item.size === "string" &&
                typeof item.quantity === "number" &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0
            )
          );
          setItems(safeItems);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // The cart remains usable for this session if storage is unavailable.
    }
  }, [hydrated, items]);

  const addItem = useCallback((item: AddCartItem) => {
    const key = [item.productId, item.size, item.sizingNotes?.trim() ?? ""].join("::");
    setItems((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (existing) {
        return current.map((entry) =>
          entry.key === key ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      }
      return [...current, { ...item, key, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, quantity } : item))
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, addItem, updateQuantity, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}
