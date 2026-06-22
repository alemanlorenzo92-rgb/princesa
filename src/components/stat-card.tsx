import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  helper,
  accent = "from-coral-400 to-amber-300",
}: {
  label: string;
  value: string | number;
  helper: string;
  accent?: string;
}) {
  return (
    <article className="rounded-3xl border border-white/50 bg-white/85 p-5 shadow-soft backdrop-blur">
      <div className={cn("h-2 w-20 rounded-full bg-gradient-to-r", accent)} />
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </article>
  );
}
