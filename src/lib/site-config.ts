export const SITE_NAME = 'توفير' as const;

export const PUBLIC_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tawfir.giize.com';

export const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.tawfir.giize.com';

export const OWNER_URL =
  process.env.NEXT_PUBLIC_OWNER_URL ?? 'https://facility.tawfir.giize.com';

export const DISCOUNT_RATE = 30 as const;

/** رسوم التوصيل الثابتة بالريال اليمني. */
export const DELIVERY_FEE = 300 as const;

/** مبلغ اشتراك العضوية السنوي بالريال اليمني. */
export const MEMBERSHIP_AMOUNT = 3000 as const;
