import Link from "next/link";

export function SiteNav() {
  return (
    <header className="relative z-20 border-b border-[var(--color-map-border)]/60 bg-[var(--color-bg-base)]/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-[var(--color-accent)] font-mono text-xs font-bold tracking-widest text-white">
            BR
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--color-ink-primary)]">
              BHU-RAJNAITIK
            </span>
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--color-ink-secondary)] group-hover:text-[var(--color-accent)]">
              Observer
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--color-ink-secondary)] transition hover:text-[var(--color-ink-primary)]"
          >
            Home
          </Link>
          <Link
            href="/editor"
            className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-[var(--color-highlight)]"
          >
            Open Editor
          </Link>
        </nav>
      </div>
    </header>
  );
}
