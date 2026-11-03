import type { ReactNode } from "react";

type TrackerFrameProps = { children: ReactNode };

/** Minimal startup frame only; project navigation/main layouts belong to task 03. */
export function TrackerFrame({ children }: TrackerFrameProps) {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-workspace bg-cover bg-fixed bg-center"
      />
      <div className="relative mx-auto max-w-[1440px] px-4 py-5 sm:px-7 lg:px-10 lg:py-7">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center"
            >
              <img src="/alminus-logo.png" />
            </span>
            <span className="text-sm font-semibold tracking-[.17em]">
              ALMINUS
            </span>
            <span className="ml-3 hidden border-l border-white/15 pl-4 text-xs text-muted sm:inline">
              A space for focused work.
            </span>
          </div>
          <span className="flex items-center gap-2 font-mono text-[10px] tracking-wide text-muted">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-done"
            />
            BROWSER LOCAL
          </span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
