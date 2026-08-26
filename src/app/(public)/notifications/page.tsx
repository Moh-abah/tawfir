import type { Metadata } from "next";
import { NotificationsContent } from "./NotificationsContent";

export const metadata: Metadata = {
  title: "الإشعارات | توفير",
};

export default function NotificationsPage() {
  return <NotificationsContent />;
}
