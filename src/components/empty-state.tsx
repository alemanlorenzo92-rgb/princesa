export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-6 text-sm text-slate-500 shadow-soft">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-2">{description}</p>
    </div>
  );
}
