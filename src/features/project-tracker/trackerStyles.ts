const panelBase =
  "relative isolate overflow-hidden rounded-panel border border-glass-border shadow-glass backdrop-blur-panel supports-not-[backdrop-filter:blur(1px)]:bg-surface";

/** Shared feature control treatments; complete strings remain visible to Tailwind. */
export const trackerStyles = {
  panel: `${panelBase} bg-glass`,
  summaryPanel: panelBase,
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-action-edge bg-action px-4 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-45",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-medium text-ink hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-45",
  danger:
    "inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-medium text-danger hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-45",
  input:
    "min-h-11 w-full rounded-lg border border-white/20 bg-input px-3 text-sm text-ink placeholder:text-muted focus:border-cobalt focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-45",
};
