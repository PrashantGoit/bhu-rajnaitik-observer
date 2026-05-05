"use client";

import { useState } from "react";
import { joinWaitlist } from "@/lib/api-client";
import { isStaticBuild } from "@/lib/byok-store";

type Status = "idle" | "submitting" | "success" | "error";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    try {
      await joinWaitlist(email);
      setStatus("success");
      setMessage(
        isStaticBuild()
          ? "Saved locally — this is the demo build. Visit the full site to join the official waitlist."
          : "You're on the list. We'll be in touch.",
      );
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Network error. Try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row"
      noValidate
    >
      <label htmlFor="email" className="sr-only">
        Email address
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@analyst.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === "submitting" || status === "success"}
        className="flex-1 rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/60 px-4 py-3 text-base text-[var(--color-ink-primary)] placeholder:text-[var(--color-ink-secondary)]/60 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={status === "submitting" || status === "success"}
        className="rounded-md bg-[var(--color-accent)] px-6 py-3 font-display text-base font-bold tracking-tight text-white transition-colors hover:bg-[var(--color-highlight)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Joining…" : status === "success" ? "Joined ✓" : "Join waitlist"}
      </button>

      {message ? (
        <p
          role="status"
          className={`mt-2 text-sm sm:absolute sm:translate-y-14 ${
            status === "error" ? "text-[var(--color-highlight)]" : "text-[var(--color-ink-secondary)]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
