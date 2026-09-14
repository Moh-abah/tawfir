"use client";

import { useState } from "react";
import {
  TriangleAlert,
  ShieldAlert,
  Trash2,
  Loader2,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";

/* ─── عناصر نصية مشتركة بين المرحلتين ────────────────────────────── */

/** عناصر «ماذا سيحدث لحسابك» — تُعرض في مرحلة التأكيد الأولى. */
const DELETION_CONSEQUENCES: string[] = [
  "حذف بياناتك الشخصية (الاسم ورقم الجوال) نهائيًا من توفير.",
  "إلغاء عضويتك وبطاقتك إن كانت فعّالة، ومحو مفضلتك وسلة التسوق.",
  "لن تستطيع استعادة هذا الحساب — ستحتاج إنشاء حساب جديد للتسجيل مجددًا.",
];

/**
 * DeleteAccountCard — «منطقة الخطر» بصفحة حساب العميل.
 *
 * متطلب Apple 5.1.1(v): يجب أن يوفر التطبيق وسيلة حذف الحساب من
 * داخل التطبيق نفسه قبل رفعه لمتجر التطبيقات.
 *
 * التدفق: زر destructive يفتح AlertDialog بتأكيد مزدوج —
 *   المرحلة 1: شرح كامل لعواقب الحذف (زر «متابعة» هادئ).
 *   المرحلة 2: تحذير أخير قاطع (زر «حذف حسابي نهائيًا» أحمر صريح).
 * عند التأكيد النهائي: نداء DELETE /customer/account مع تعطيل
 * الأزرار وسبينر حتى الاستقرار — النجاح يُدير الخروج الكامل
 * والتوجيه للرئيسية (في useDeleteAccount)، والفشل يُبقي المستخدم
 * مع توست خطأ عربي.
 */
export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  /* مرحلة التأكيد: 1 = شرح العواقب، 2 = التحذير الأخير قبل التنفيذ. */
  const [stage, setStage] = useState<1 | 2>(1);
  const deleteAccount = useDeleteAccount();

  const handleOpenChange = (next: boolean) => {
    /* أثناء تنفيذ الطلب لا يُغلق الحوار — يُمنع الهروب من حالة التحميل. */
    if (deleteAccount.isPending) return;
    setOpen(next);
    if (!next) setStage(1);
  };

  const handleFinalConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    /* نمنع الإغلاق التلقائي لـ AlertDialogAction — نتحكم يدويًا عند
       الاستقرار حتى تبقى حالة التحميل (زر معطّل + سبينر) ظاهرة. */
    e.preventDefault();
    deleteAccount.mutate(undefined, {
      onSettled: () => {
        setOpen(false);
        setStage(1);
      },
    });
  };

  return (
    <Card
      className="rounded-2xl border-destructive/40 shadow-soft"
      aria-label="منطقة الخطر — حذف الحساب"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-destructive">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10"
            aria-hidden="true"
          >
            <TriangleAlert className="h-5 w-5" />
          </span>
          منطقة الخطر
        </CardTitle>
        <CardDescription className="leading-relaxed">
          حذف حسابك نهائيًا إجراء لا يمكن التراجع عنه. إن كنت متأكدًا من
          رغبتك في مغادرة توفير نهائيًا يمكنك بدء الإجراء من هنا.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="min-h-[44px] w-full gap-2 rounded-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              حذف الحساب نهائيًا
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent dir="rtl">
            {stage === 1 ? (
              /* ── المرحلة 1: شرح العواقب كاملة ─────────────────── */
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <UserX
                      className="h-5 w-5 shrink-0 text-destructive"
                      aria-hidden="true"
                    />
                    حذف الحساب نهائيًا؟
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    رحيلك يحزّننا! قبل اتخاذ القرار، إليك ما سيحدث لحسابك —
                    هذا الإجراء لا يمكن التراجع عنه إطلاقًا.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <ul className="space-y-2 rounded-xl bg-destructive/5 p-4 text-sm leading-relaxed text-foreground/90" role="list">
                  {DELETION_CONSEQUENCES.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <TriangleAlert
                        className="mt-0.5 h-4 w-4 shrink-0 text-destructive/80"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <TriangleAlert
                      className="mt-0.5 h-4 w-4 shrink-0 text-destructive/80"
                      aria-hidden="true"
                    />
                    <span>
                      طلباتك السابقة: ستُزال هويتك الشخصية منها حفظًا على
                      السجلات التجارية للمتاجر — لن تُنسب إليك بعد الآن.
                    </span>
                  </li>
                </ul>

                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogAction
                    className="min-h-[44px] flex-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20"
                    onClick={(e) => {
                      /* تقدّم للمرحلة الثانية دون إغلاق الحوار. */
                      e.preventDefault();
                      setStage(2);
                    }}
                  >
                    متابعة
                  </AlertDialogAction>
                  <AlertDialogCancel className="min-h-[44px] flex-1 rounded-full">
                    إلغاء
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </>
            ) : (
              /* ── المرحلة 2: التحذير الأخير القاطع ──────────────── */
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
                    تأكيد أخير — لا يمكن التراجع
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    عند الضغط على الزر أدناه سيُحذف حسابك فورًا وتُمسح
                    بياناتك الشخصية نهائيًا، ولن يكون بإمكانك — أو أي أحد —
                    استعادته بأي طريقة. هل أنت متأكد تمامًا؟
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogAction
                    className="min-h-[44px] flex-1 rounded-full bg-destructive text-white hover:bg-destructive/90"
                    disabled={deleteAccount.isPending}
                    onClick={handleFinalConfirm}
                  >
                    {deleteAccount.isPending ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        جارٍ حذف الحساب...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        حذف حسابي نهائيًا
                      </>
                    )}
                  </AlertDialogAction>
                  <AlertDialogCancel
                    className="min-h-[44px] flex-1 rounded-full"
                    disabled={deleteAccount.isPending}
                  >
                    تراجع
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
