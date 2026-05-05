import { WaitlistForm } from "@/components/waitlist-form";
import Link from "next/link";

export default function Home() {
  return (
    <main className="bg-grid relative flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-60" />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-ink-secondary)]">
          From the team behind <span className="text-[var(--color-accent)]">@bhurajnaitik</span>
        </span>

        <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--color-ink-primary)] sm:text-6xl md:text-7xl">
          Geopolitics,
          <span className="relative ml-3 inline-block text-[var(--color-accent)]">
            Visualized.
            <span className="absolute -bottom-1 left-0 h-[3px] w-full bg-[var(--color-highlight)]" />
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-ink-secondary)]">
          The official creator studio behind{" "}
          <span className="text-[var(--color-ink-primary)]">@bhurajnaitik</span>. Turn a headline into a
          scroll-stopping geopolitical infographic in under sixty seconds.
        </p>

        <WaitlistForm />

        <Link
          href="/editor"
          className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-ink-secondary)] transition hover:text-[var(--color-accent)]"
        >
          Or try the editor live
          <span aria-hidden>→</span>
        </Link>

        <ul className="mt-10 grid w-full max-w-xl grid-cols-1 gap-3 text-left text-sm text-[var(--color-ink-secondary)] sm:grid-cols-3">
          <li className="rounded-lg border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 px-4 py-3">
            <span className="text-[var(--color-ink-primary)]">Pixel-exact</span> BRO templates
          </li>
          <li className="rounded-lg border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 px-4 py-3">
            <span className="text-[var(--color-ink-primary)]">Smart</span> red highlighting
          </li>
          <li className="rounded-lg border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 px-4 py-3">
            <span className="text-[var(--color-ink-primary)]">One-click</span> Instagram &amp; X export
          </li>
        </ul>

        <p className="mt-12 font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-ink-secondary)]/70">
          Alpha shipping June 2026 · Lifetime deal for first 100 users
        </p>
      </div>
    </main>
  );
}
