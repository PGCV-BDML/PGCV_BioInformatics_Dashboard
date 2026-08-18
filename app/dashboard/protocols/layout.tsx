import ProtocolLibrary from "@/app/components/protocol-library";

export default function ProtocolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtocolLibrary>{children}</ProtocolLibrary>;
}
