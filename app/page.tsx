import SearchBox from "@/components/search/SearchBox";
import GameCollageBackground from "@/components/home/GameCollageBackground";
import ExampleVerdicts from "@/components/home/ExampleVerdicts";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24">
      <GameCollageBackground />
      <div
        className="relative z-10 flex flex-col items-center gap-8 text-center"
        style={{ animation: "fade-in-up 0.7s ease-out" }}
      >
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400/80">
            Steam achievement checker
          </p>
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden
              className="pointer-events-none absolute h-32 w-[32rem] max-w-[90vw] rounded-full bg-indigo-500/25 blur-3xl"
            />
            <h1 className="relative bg-gradient-to-r from-white via-white to-indigo-300 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent drop-shadow-lg sm:text-6xl md:text-7xl">
              Can i 100% it?
            </h1>
          </div>
          <p className="max-w-sm text-sm text-zinc-300 sm:text-base">
            Search a Steam game to see if getting 100% of the achievements is realistically possible today.
          </p>
        </div>
        <SearchBox size="lg" />
        <ExampleVerdicts />
      </div>
    </main>
  );
}
