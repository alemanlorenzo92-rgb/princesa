import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-700" htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function inputClassName(className?: string) {
  return cn(
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-coral-400 focus:ring-4 focus:ring-coral-100",
    className,
  );
}

export function textareaClassName(className?: string) {
  return inputClassName(cn("min-h-28 resize-y", className));
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
