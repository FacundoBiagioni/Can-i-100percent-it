export default function GameLoading() {
  return (
    <main className="relative flex-1 bg-black">
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-zinc-900 via-black to-black" />

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-end gap-4 px-6 pb-10 text-center">
        <div className="h-10 w-64 animate-pulse rounded-2xl bg-zinc-800 sm:h-12 sm:w-80" />
        <div className="h-4 w-40 animate-pulse rounded-full bg-zinc-800" />
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-56 animate-pulse rounded-2xl bg-zinc-800" />
          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-12 animate-pulse rounded-2xl bg-zinc-800" />
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-6 z-30 h-[5.5rem] w-[min(24rem,calc(100vw-3rem))] animate-pulse rounded-t-3xl bg-zinc-900/80" />
    </main>
  );
}
