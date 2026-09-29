export default function GameLoading() {
  return (
    <main className="flex flex-1 flex-col bg-black">
      <div className="h-[42vh] min-h-[260px] w-full animate-pulse bg-zinc-900" />
      <div className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
        <div className="h-14 w-56 animate-pulse rounded-2xl bg-zinc-800" />
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-12 animate-pulse rounded-2xl bg-zinc-800" />
          ))}
        </div>
        <div className="h-32 w-full max-w-xl animate-pulse rounded-2xl bg-zinc-900" />
      </div>
    </main>
  );
}
