import type { Metadata } from "next";
import { FavoritesContent } from "./FavoritesContent";

export const metadata: Metadata = {
  title: "المفضلة | توفير",
  description:
    "وجباتك المفضلة في مكان واحد — أضف وجباتك المفضلة بضغطة قلب واطلبها متى شئت.",
  robots: { index: false },
};

export default function FavoritesPage() {
  return <FavoritesContent />;
}
