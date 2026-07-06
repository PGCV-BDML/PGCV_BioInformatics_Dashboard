import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirect root traffic to the dashboard. The dashboard layout handles auth checking.
  redirect("/dashboard");
}
