"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ownerService } from "@/services/owner.service";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import { useToast } from "@/hooks/use-toast";
import { isCanonicalPlaceUrl } from "@/lib/external-maps";
import type { Facility } from "@/types/api.generated";

/* ════════════════════════════════════════════════════════════════ */
/*  الجولة 49 — إتمام الدائرة المقطوعة                               */
/* ════════════════════════════════════════════════════════════════ */
/**
 * شكوى المالك الجولات 48-49: التاجر يحدد موقع متجره برابط قوقل ماب في
 * التسجيل، فتُحفظ الإحداثيات محلياً «لترفع عند أول تسجيل دخول» — لكن
 * **لا شيء كان يقرأ المفتاح أصلاً**: لا قارئ في المشروع كله، فتبقى
 * الإحداثيات حبيسة المتصفح، ويتكوّن متجر بلا موقع (بلا زر «فتح في
 * الخرائط» في صفحة العميل — وهي مشروطة بوجود lat/lng خادمياً).
 *
 * هذا الهوك هو القارئ المفقود: يُركَّب مرة واحدة في OwnerPortalShell
 * (يحيط بكل صفحات المالك خلف الحرس) — عند أول ظهور بتوكن صالح:
 *   1. يقرأ `tawfir_owner_pending_location` من localStorage
 *      (الجولة 49: رُقّي من sessionStorage الذي كان يموت بإغلاق التبويب)
 *   2. يجد متجر المالك بلا إحداثيات ويرفع {latitude, longitude} معاً
 *      (عقد PUT /owner/facility/{id} يشترط مجيئهما معاً)
 *   3. عند النجاح: يمسح المعلّق ويحدّث كاش react-query ويُخبر المالك
 *   4. عند الفشل: يُبقي المعلّق لمحاولة الدخول التالي (بلا إزعاج صامت)
 *
 * أمان: لا يكتب أبداً فوق متجر لديه إحداثيات أصلاً (المعلّق حينها
 * قديم — يُمسح فقط)، ولا يعمل إلا بتوكن حي.
 */

/** مفتاح المعلّق — مصدر الحقيقة بين شاشة التسجيل والهوك */
export const PENDING_LOCATION_KEY = "tawfir_owner_pending_location";

/**
 * (الجولة 50) مفتاح بذور «صفحة المتجر ذاتها» — خريطة {facilityId: رابط
 * قوقل القانوني ?cid=…} يكتبها شاشة التسجيل عند النجاح، ويرفعها هذا
 * الهوك للخادم عند كل دخول (تحقق ملكية خادمياً) فيجدد سجل زر
 * «افتح في الخرائط» — رفع البذرة لا يفشل الدخول أبداً (تحسين صامت).
 */
export const PLACE_SEEDS_KEY = "tawfir_owner_place_seeds";

function readPlaceSeeds(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PLACE_SEEDS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * (الجولة 50-تحقق) حفظ بذرة «صفحة المتجر ذاتها» محلياً — العقد الموحد
 * الذي تستخدمه شاشتا التسجيل وتعديل المتجر، والهوك يرفعه للخادم عند كل
 * دخول مالك (تحقق ملكية خادمياً) فيتجدد زر «افتح في الخرائط» حتى بعد
 * إعادة تشغيل خادم الواجهة — ذاكرة السجل الخادمية متطايرة، والبذرة
 * المحلية عند التاجر هي ما يجعل النظام مشفياً ذاتياً (تصحيح البذور
 * المبذورة من شاشة التعديل قبل هذا العقد الموحد).
 */
export function persistPlaceSeed(
  facilityId: number,
  placeUrl: string | null | undefined,
): void {
  if (typeof window === "undefined") return;
  if (
    !placeUrl ||
    !isCanonicalPlaceUrl(placeUrl) ||
    !Number.isInteger(facilityId) ||
    facilityId <= 0
  )
    return;
  try {
    const raw = window.localStorage.getItem(PLACE_SEEDS_KEY);
    const seeds = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    seeds[String(facilityId)] = placeUrl;
    window.localStorage.setItem(PLACE_SEEDS_KEY, JSON.stringify(seeds));
  } catch {
    /* تخزين معطّل — الزر يسقط للبحث الذكي */
  }
}

/** رفع بذور الصفحات القانونية — الأدق أولاً: رابط المتجر نفسه لا بحث */
function seedPlaceUrls(
  accessToken: string,
  ownedIds: Set<number>,
): void {
  const seeds = readPlaceSeeds();
  for (const [idStr, url] of Object.entries(seeds)) {
    const id = Number(idStr);
    if (!Number.isInteger(id) || !ownedIds.has(id)) continue;
    if (!/^https:\/\/[^\s|]*google\.com\/maps/.test(url)) continue;
    void fetch("/api/utils/place-page", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ facility_id: id, place_url: url }),
    }).catch(() => {
      /* تحسين صامت — الزر يسقط للبحث الذكي حتى الدخول التالي */
    });
  }
}

interface PendingLocation {
  lat: number;
  lng: number;
  source?: string;
  label?: string | null;
  savedAt?: number;
  /** (الجولة 49) توقيع المتجر المسجّل — يمنع تطبيق إحداثيات متجر ثانٍ
   *  سُجّل من المتصفح نفسه على المتجر الأول (مفتاح المعلّق واحد) */
  facilityName?: string | null;
  ownerEmail?: string | null;
}

export function readPendingLocation(): PendingLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingLocation;
    if (
      typeof parsed?.lat === "number" &&
      Number.isFinite(parsed.lat) &&
      typeof parsed?.lng === "number" &&
      Number.isFinite(parsed.lng)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPendingLocation(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_LOCATION_KEY);
  } catch {
    /* تخزين معطّل — لا شيء */
  }
}

export type PendingLocationState =
  | "idle" // بلا معلّق أو لم يُحاول بعد
  | "applying" // رفع جارٍ
  | "done" // رُفع ووُفّق
  | "failed"; // فشل الرفع — سيُعاد في الدخول التالي

export function useApplyPendingLocation(): PendingLocationState {
  const { accessToken, hydrated } = useOwnerAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [state, setState] = useState<PendingLocationState>("idle");

  /* بيانات متاجر المالك — تعمل فقط بتوكن حي (enabled) */
  const { data: facilities, isSuccess: facilitiesLoaded } = useQuery<
    Facility[]
  >({
    queryKey: ["my-facilities"],
    queryFn: () => ownerService.getMyFacilities(),
    enabled: hydrated && !!accessToken,
    staleTime: 30_000,
  });

  /* حارس إعادة التشغيل الصارم — محاولة واحدة لكل جلسة تركيب */
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !accessToken || !facilitiesLoaded) return;
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    /* ═══ (الجولة 50) تجديد بذور «صفحة المتجر ذاتها» عند كل دخول ═══
       يرفع روابط ?cid=… المحلية لسجل الخادم (تحقق ملكية خادمياً) —
       فيبقى زر «افتح في الخرائط» يفتح صفحة المتجر نفسها لا نتائج بحث */
    seedPlaceUrls(
      accessToken,
      new Set((facilities ?? []).map((f) => f.id)),
    );

    const pending = readPendingLocation();
    if (!pending) return; // لا معلّق — الحالة الطبيعية لمعظم الدخولات

    /* (الجولة 49) المرشح: متجر بلا إحداثيات — ومع تعدد المرشحين يُطابق
       توقيع المعلّق (اسم المتجر) قبل أي كتابة، وإلا اعتُبر غامضاً
       ويُبقى المعلّق بلا تطبيق خاطئ (التراجع عن كتابة خاطئة أصعب).
       وقاعدة الحذف نفسها موقّعة: معلّق باسم متجر ليس في هذا الحساب
       (المستخدم سجّل متجراً ثانياً وهو داخل جلسة متجر آخر) لا يُمس —
       فهو ملك الحساب الآخر وسيُستهلك عند دخوله الفعلي. */
    const all = facilities ?? [];
    const withoutCoords = all.filter(
      (f) => f.latitude == null || f.longitude == null,
    );
    const name = (pending.facilityName ?? "").trim().toLowerCase();
    const belongsHere = !name || all.some(
      (f) => (f.name ?? "").trim().toLowerCase() === name,
    );
    if (!withoutCoords.length) {
      if (belongsHere) clearPendingLocation(); // محدد أصلاً أو بلا توقيع
      return;
    }
    let facility = withoutCoords[0];
    if (withoutCoords.length > 1) {
      const matched = name
        ? withoutCoords.find(
            (f) => (f.name ?? "").trim().toLowerCase() === name,
          )
        : undefined;
      if (!matched) return; // غامض — لا كتابة تخمينية فوق متاجر حقيقية
      facility = matched;
    } else if (!belongsHere) {
      return; // المعلّق لمتجر آخر — لا تطبيق ولا مسح في هذه الجلسة
    }

    void Promise.resolve()
      .then(() =>
        ownerService.updateMyFacility(facility.id, {
          latitude: pending.lat,
          longitude: pending.lng,
        }),
      )
      .then(() => {
        clearPendingLocation();
        queryClient.invalidateQueries({ queryKey: ["my-facilities"] });
        queryClient.invalidateQueries({
          queryKey: ["my-facility", facility.id],
        });
        setState("done");
        toast({
          title: "تم حفظ موقع متجرك",
          description:
            "الإحداثيات التي حددتها عند التسجيل رُفعت لمتجرك — زر «فتح في الخرائط» ظاهر الآن للعملاء على موقع متجرك نفسه.",
        });
      })
      .catch(() => {
        /* نُبقي المعلّق — محاولة الدخول التالي تُكملها */
        setState("failed");
      });
  }, [hydrated, accessToken, facilitiesLoaded, facilities, queryClient, toast]);

  return state;
}
