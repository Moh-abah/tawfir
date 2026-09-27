import type { Metadata } from "next";
import AdminWalletsContent from "./AdminWalletsContent";

export const metadata: Metadata = {
  title: "المحافظ والتحويلات | توفير",
};

export default function AdminWalletsPage() {
  return <AdminWalletsContent />;
}
