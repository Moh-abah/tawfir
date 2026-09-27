import type { Metadata } from "next";
import OwnerWalletsContent from "./OwnerWalletsContent";

export const metadata: Metadata = {
  title: "محافظ التحويل | توفير",
};

export default function OwnerWalletsPage() {
  return <OwnerWalletsContent />;
}
