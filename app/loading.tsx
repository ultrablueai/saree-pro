export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-16">
      <div className="glass-panel w-full max-w-lg rounded-[2rem] p-8 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-accent)]" />
        <h1 className="mt-6 text-2xl font-semibold text-[var(--color-ink)]">
          Loading Saree Pro
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          We are preparing your next screen and keeping the shell responsive while the route
          streams in.
        </p>
      </div>
    </main>
  );
}
