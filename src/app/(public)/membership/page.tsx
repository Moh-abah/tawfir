import type { Metadata } from "next";
import { redirect } from "next/navigation";

/**
 * الجولة 16 — إعادة توجيه جذر العضوية:
 * كان /membership يعرض 404 لمن يكتب الرابط يدوياً (المسار الفعلي
 * هو /membership/subscribe). الآن يعيد التوجيه فوراً من الخادم (307)
 * بلا وميض ولا ومضة واجهة — نفس نمط Next.js redirect في App Router.
 */
export const metadata: Metadata = {
  title: "عضوية توفير | توفير",
};

export default function MembershipIndexPage() {
  redirect("/membership/subscribe");
}
