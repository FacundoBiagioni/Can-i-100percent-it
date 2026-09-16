export default function GameLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex w-full max-w-xl flex-col items-center gap-4">
        <div className="h-40 w-full max-w-md animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-6 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-32 w-full max-w-xl animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
    </main>
  );
}
