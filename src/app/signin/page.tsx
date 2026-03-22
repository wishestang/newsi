import Image from "next/image";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { isAuthConfigured, isLocalPreviewMode } from "@/lib/env";

function DigestPreviewCard() {
  const dateStr = "SAT, MAR 22, 2026";

  return (
    <div className="hidden md:block flex-shrink-0 w-[340px]">
      <div className="rounded-[10px] bg-white px-8 py-9 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)]">
        {/* Date header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[2.2px] text-text-muted">
            {dateStr}
          </span>
          <div className="h-px flex-1 bg-border-solid" />
        </div>

        {/* Title */}
        <h2 className="mb-3 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.6px] text-foreground">
          AI Agents Reshape Developer Workflows
        </h2>

        {/* Intro */}
        <p className="mb-6 font-sans text-[13px] leading-[1.75] text-text-body">
          The latest wave of AI coding tools moves beyond autocomplete into
          autonomous task execution, changing how developers plan, write, and
          review code.
        </p>

        {/* Section heading */}
        <h3 className="mb-3.5 font-heading text-[15px] font-bold tracking-[-0.2px] text-foreground">
          Key Points
        </h3>

        {/* Key points */}
        <div className="mb-6 flex flex-col gap-2.5">
          {[
            {
              keyword: "Claude Code",
              text: "ships multi-file editing with context-aware refactoring",
            },
            {
              keyword: "Cursor",
              text: "raises Series C at $2.5B valuation, plans enterprise push",
            },
            {
              keyword: "GitHub",
              text: "reports 40% of new code now AI-assisted across its platform",
            },
          ].map((item) => (
            <div key={item.keyword} className="flex items-start gap-2.5">
              <div className="mt-[6px] h-1.5 w-1.5 flex-shrink-0 bg-accent" />
              <p className="font-sans text-[13px] leading-[1.65] text-text-body">
                <span className="font-semibold text-foreground">
                  {item.keyword}
                </span>{" "}
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 border-t border-border-solid pt-4">
          <Image
            src="/icon-sparkle.svg"
            alt=""
            width={12}
            height={12}
            className="[--fill-0:var(--accent)]"
            aria-hidden="true"
          />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[2.2px] text-text-muted">
            End of Digest
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const authConfigured = isAuthConfigured() && !isLocalPreviewMode();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-7 py-12 md:px-12">
      <div className="flex w-full max-w-[960px] flex-col items-start gap-16 md:flex-row md:items-center">
        {/* Left column */}
        <div className="flex-1">
          {/* Brand mark */}
          <div className="mb-12 flex items-center gap-2.5">
            <Image
              src="/icon-sparkle.svg"
              alt=""
              width={22}
              height={22}
              aria-hidden="true"
            />
            <span className="font-heading text-xl font-bold tracking-[-0.5px] text-foreground">
              Newsi
            </span>
          </div>

          {/* Headline */}
          <h1 className="mb-4 font-heading text-[32px] font-bold leading-[1.08] tracking-[-1.2px] text-foreground md:text-[38px]">
            Reclaim your
            <br className="hidden md:inline" /> Attention
          </h1>

          {/* Subline */}
          <p className="mb-10 font-sans text-[15px] leading-[1.65] text-text-muted md:text-base">
            One brief, one digest, every day.
            <br />
            Cut through the noise, focus on what matters.
          </p>

          {/* Auth actions */}
          {authConfigured ? <GoogleSignInButton /> : null}
          {!authConfigured ? (
            <div className="md:text-left text-center">
              <p className="text-sm text-text-muted">
                Auth is not configured in this environment.
              </p>
              <Link
                href="/today"
                className="mt-4 inline-block font-mono text-xs tracking-[0.5px] text-text-muted hover:underline"
              >
                or explore a preview →
              </Link>
            </div>
          ) : null}
        </div>

        {/* Right column — digest preview card */}
        <DigestPreviewCard />
      </div>
    </main>
  );
}
