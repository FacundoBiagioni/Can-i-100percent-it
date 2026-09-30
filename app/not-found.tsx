import Link from "next/link";
import SearchBox from "@/components/search/SearchBox";
import GameCollageBackground from "@/components/home/GameCollageBackground";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24">
      <GameCollageBackground />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <p className="text-7xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-8xl">404</p>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-bold text-white drop-shadow-lg sm:text-2xl">Game not found</h1>
          <p className="max-w-sm text-sm text-zinc-300">
            That AppID doesn&apos;t exist on Steam, or the page you were looking for isn&apos;t here.
          </p>
        </div>
        <SearchBox size="lg" />
        <Link href="/" className="text-sm text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline">
          Back to home
        </Link>
      </div>
    </main>
  );
}
