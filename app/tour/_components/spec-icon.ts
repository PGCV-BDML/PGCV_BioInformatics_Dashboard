import { Cpu, HardDrive, MemoryStick, type LucideIcon } from "lucide-react";

/** Specs carry no id, so the icon is picked from the unit and label wording. */
export function specIcon(spec: { unit: string; label: string }): LucideIcon | null {
  const words = `${spec.unit} ${spec.label}`.toLowerCase();
  if (/\b(cores?|cpus?|processing)\b/.test(words)) return Cpu;
  if (/\b(ram|memory)\b/.test(words)) return MemoryStick;
  if (/\b(storage|disk|tb|pb)\b/.test(words)) return HardDrive;
  return null;
}
