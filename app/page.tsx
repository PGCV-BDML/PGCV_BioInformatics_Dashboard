// app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  // This instantly bounces the user straight to /login when they visit the site
  redirect("/login");
}
