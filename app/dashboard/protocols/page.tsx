import { redirect } from "next/navigation";
import { DEFAULT_PROTOCOL_SLUG } from "@/lib/protocols";
import { routes } from "@/lib/routes";

export default function ProtocolsPage() {
  redirect(routes.protocols.detail(DEFAULT_PROTOCOL_SLUG));
}
