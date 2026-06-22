import { cn } from "@/lib/utils";

export function CardSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "animate-soft-scale-in rounded-[28px] border border-white/50 bg-white/82 p-5 shadow-soft backdrop-blur motion-reduce:animate-none",
        className,
      )}
    >
      {children}
    </section>
  );
}
