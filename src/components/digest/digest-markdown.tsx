"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function getSafeHref(href?: string) {
  if (!href) return null;
  return /^https?:\/\//.test(href) ? href : null;
}

function SafeLink({
  href,
  children,
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) {
  const safeHref = getSafeHref(href);

  if (!safeHref) {
    return <span>{children}</span>;
  }

  return (
    <a
      href={safeHref}
      rel="noreferrer noopener"
      target="_blank"
      className="text-foreground underline underline-offset-2"
    >
      {children}
    </a>
  );
}

export function DigestMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="font-sans text-[17px] leading-[28.9px] text-[var(--text-body)]">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        a: ({ children, href }) => (
          <SafeLink href={href}>{children}</SafeLink>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[var(--border-solid)] pl-4 text-[var(--text-muted)]">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-[var(--border-list)] px-3 py-2 text-left font-semibold text-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-[var(--border-list)] px-3 py-2 text-[var(--text-body)]">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
