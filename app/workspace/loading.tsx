export default function Loading() {
  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-7xl px-4 pb-28 pt-5 sm:px-8 sm:pt-8">
      <div className="glass-panel rounded-[2rem] p-4 md:p-6">
        <div className="animate-pulse">
          <div className="rounded-[1.8rem] bg-white/70 px-6 py-8">
            <div className="h-5 w-32 rounded-full bg-[var(--color-surface-strong)]" />
            <div className="mt-5 h-10 w-72 rounded-2xl bg-[var(--color-surface-strong)]" />
            <div className="mt-4 h-4 w-full max-w-3xl rounded-full bg-[var(--color-surface-strong)]" />
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 rounded-[1.3rem] border border-[var(--color-border)] bg-white/75"
                />
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-40 rounded-[1.5rem] border border-[var(--color-border)] bg-white/75"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
