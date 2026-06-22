export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-coral-600">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  );
}
