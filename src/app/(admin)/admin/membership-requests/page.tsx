import type { Metadata } from "next";
import MembershipRequestsContent from "./MembershipRequestsContent";

export const metadata: Metadata = {
  title: "طلبات العضوية | توفير",
  description: "مراجعة طلبات اشتراك العضوية وموافقتها أو رفضها.",
};

export default function AdminMembershipRequestsPage() {
  return <MembershipRequestsContent />;
}
