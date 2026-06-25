"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({
  content,
  compact = false,
}: {
  content: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`text-slate-800 ${
        compact ? "space-y-3 text-sm leading-6" : "space-y-4 text-[15px] leading-7"
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-2xl font-bold tracking-tight text-slate-950" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xl font-semibold tracking-tight text-slate-950" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-lg font-semibold text-slate-900" {...props} />
          ),
          p: ({ ...props }) => <p className="text-inherit" {...props} />,
          ul: ({ ...props }) => <ul className="list-disc space-y-2 pl-6" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal space-y-2 pl-6" {...props} />,
          li: ({ ...props }) => <li className="marker:text-slate-500" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote
              className="rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-slate-700"
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className);

            if (isBlock) {
              return (
                <code
                  className="block overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <code
                className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-900"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ ...props }) => <pre className="overflow-x-auto" {...props} />,
          table: ({ ...props }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full rounded-2xl border border-slate-200 text-left" {...props} />
            </div>
          ),
          thead: ({ ...props }) => <thead className="bg-slate-100 text-slate-900" {...props} />,
          th: ({ ...props }) => (
            <th className="border-b border-slate-200 px-4 py-3 text-sm font-semibold" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="border-b border-slate-100 px-4 py-3 align-top text-sm" {...props} />
          ),
          hr: ({ ...props }) => <hr className="border-slate-200" {...props} />,
          a: ({ ...props }) => (
            <a
              className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-4"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
