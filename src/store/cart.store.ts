"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** عنصر سلة — صورة مختصرة من Product للعرض + إعادة الطلب. */
export interface CartItem {
  product_id: number;
  facility_id: number;
  facility_name: string;
  name: string;
  price: string; // نص للحفاظ على دقة formatCurrency
  image_url: string | null;
  quantity: number;
  available_quantity: number | null;
}

interface CartState {
  items: CartItem[];
  /** معرّف المتجر الموحّد للسلة (single-facility constraint من الخادم). */
  facilityId: number | null;
  facilityName: string | null;
  /** إضافة منتج للسلة — يرجع true عند النجاح، false عند تعارض المتجر. */
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => boolean;
  /** تحديث كمية منتج موجود (إن 0 → يُحذف). */
  updateQuantity: (productId: number, quantity: number) => void;
  /** إزالة منتج من السلة. */
  removeItem: (productId: number) => void;
  /** تفريغ السلة كاملة (بعد تأكيد الطلب مثلاً). */
  clearCart: () => void;
  /** عدد الأصناف الكلي (مجموع الكميات). */
  totalCount: () => number;
}

/**
 * مخزن السلة — الجولة 11 (ميزة جديدة: سلة متعددة الأصناف).
 *
 * قاعدة الخادم: كل أصناف الطلب يجب أن تنتمي لنفس facility_id.
 * لذلك السلة عنصر واحد للمتجر — عند محاولة إضافة صنف من متجر مختلف،
 * يُرجع addItem false ويُعرض الواجهة خيار «استبدال السلة».
 *
 * محلي بالكامل (localStorage) مثل المفضلة والبحث الأخير — يعمل أوفلاين،
 * لا يحتاج تسجيل دخول. skipHydration + ترطيب في (public) layout.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      facilityId: null,
      facilityName: null,
      addItem: (item, quantity = 1) => {
        const state = get();
        // تعارض المتجر — لا نُضيف بل نُرجع false ليُعالجه الواجهة
        if (
          state.facilityId !== null &&
          state.facilityId !== item.facility_id
        ) {
          return false;
        }
        const existing = state.items.find(
          (i) => i.product_id === item.product_id
        );
        if (existing) {
          const maxQty =
            item.available_quantity == null
              ? Infinity
              : item.available_quantity;
          const nextQty = Math.min(existing.quantity + quantity, maxQty);
          set({
            items: state.items.map((i) =>
              i.product_id === item.product_id ? { ...i, quantity: nextQty } : i
            ),
          });
        } else {
          set({
            facilityId: item.facility_id,
            facilityName: item.facility_name,
            items: [
              ...state.items,
              {
                ...item,
                quantity: Math.min(
                  quantity,
                  item.available_quantity == null
                    ? quantity
                    : item.available_quantity
                ),
              },
            ],
          });
        }
        return true;
      },
      updateQuantity: (productId, quantity) => {
        const state = get();
        if (quantity <= 0) {
          // حذف + إعادة ضبط المتجر إن بقيت السلة فارغة
          const items = state.items.filter((i) => i.product_id !== productId);
          set({
            items,
            facilityId: items.length ? state.facilityId : null,
            facilityName: items.length ? state.facilityName : null,
          });
          return;
        }
        set({
          items: state.items.map((i) => {
            if (i.product_id !== productId) return i;
            const maxQty = i.available_quantity == null ? Infinity : i.available_quantity;
            return { ...i, quantity: Math.min(quantity, maxQty) };
          }),
        });
      },
      removeItem: (productId) => {
        const state = get();
        const items = state.items.filter((i) => i.product_id !== productId);
        set({
          items,
          facilityId: items.length ? state.facilityId : null,
          facilityName: items.length ? state.facilityName : null,
        });
      },
      clearCart: () =>
        set({ items: [], facilityId: null, facilityName: null }),
      totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "tawfir-cart",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
