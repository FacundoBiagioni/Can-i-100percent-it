import SearchBox from "@/components/search/SearchBox";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 dark:bg-black">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Can i 100% it?
        </h1>
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          Search a Steam game to see if getting 100% of the achievements is realistically possible today.
        </p>
      </div>
      <SearchBox />
    </main>
  );
}
