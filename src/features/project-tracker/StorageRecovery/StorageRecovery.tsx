import type { MouseEvent } from "react";
import type { LoadResult } from "../projectTracker.types";
import { trackerStyles } from "../trackerStyles";

type StorageRecoveryProps = {
  result: Exclude<LoadResult, { kind: "valid" | "missing" }>;
  error: string | null;
  onRetry: () => void;
  onReset: () => void;
};

export function StorageRecovery({
  result,
  error,
  onRetry,
  onReset,
}: StorageRecoveryProps) {
  const canReset = result.kind === "malformed" || result.kind === "unsupported";
  function confirmReset(event: MouseEvent<HTMLButtonElement>) {
    const confirmed = window.confirm(
      "Reset this browser’s workspace? This permanently deletes its saved projects and tasks and cannot be undone.",
    );
    // Mouse activation does not focus buttons consistently across browsers.
    // Restore the trigger before reset; successful recovery then focuses its heading.
    event.currentTarget.focus();
    if (confirmed) onReset();
  }

  return (
    <section
      aria-labelledby="recovery-heading"
      className={`${trackerStyles.panel} p-7 sm:p-10`}
    >
      <p className="mb-3 font-mono text-[10px] tracking-wider text-progress">
        DATA LEFT UNCHANGED
      </p>
      <h1
        id="recovery-heading"
        className="text-2xl font-semibold tracking-tight"
      >
        Let’s get your workspace back.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
        {result.message}
      </p>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-error-edge bg-error-surface px-4 py-3 text-sm text-error-text"
        >
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className={trackerStyles.primary}
          onClick={onRetry}
        >
          Retry loading
        </button>
        {canReset && (
          <button
            type="button"
            className={trackerStyles.danger}
            onClick={confirmReset}
          >
            Reset workspace
          </button>
        )}
      </div>
    </section>
  );
}
