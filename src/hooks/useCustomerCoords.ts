"use client";

import { useEffect, useState } from "react";
import {
  fetchSilentCoords,
  readCachedCoords,
  type GeoPoint,
} from "@/lib/geo-sort";

/**
 * إحداثيات العميل للفرز البطبقي «حولي ← منطقتي ← مدينتي» (الجولة 46).
 *
 * - يقرأ كاش الجلسة أولاً (فوري عملياً، بلا وميض).
 * - إن لم يوجد: جلب صامت — لا يطلب إذناً أبداً، يعمل فقط إذا كان إذن
 *   الموقع ممنوحاً مسبقاً (نمط refineGuestMarketByGeo). بلا إذن → null
 *   والفرز يعمل بطبقة المنطقة.
 * - آمن على SSR: يعمل بعد التركيب حصراً فلا فرق ترطيب، وكل setState
 *   داخل استمرار لامتزامن (التزاماً بقاعدة setState-in-effect).
 */
export function useCustomerCoords(): GeoPoint | null {
  const [coords, setCoords] = useState<GeoPoint | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const cached = readCachedCoords();
      const pt = cached ?? (await fetchSilentCoords());
      if (alive && pt) setCoords(pt);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return coords;
}
