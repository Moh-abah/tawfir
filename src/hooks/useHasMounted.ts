"use client";

import * as React from "react";

const emptySubscribe = () => () => {};

/**
 * علم "تم التركيب" الآمن للترطيب (SSR):
 * يعيد false على الخادم وأول رسم العميل، ثم true بعد التركيب —
 * عبر useSyncExternalStore بلا setState داخل effect.
 */
export function useHasMounted(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
