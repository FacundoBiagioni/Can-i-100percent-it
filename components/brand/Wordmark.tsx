import PercentGlyph from "./PercentGlyph";

/**
 * "can i 100% it?" with the logo's pixel-art "%" in place of the typed one.
 * Readers get the plain name. `spin` turns the glyph a quarter when an
 * ancestor with the `group` class is hovered (the navbar link).
 */
export default function Wordmark({ spin = false, className = "" }: { spin?: boolean; className?: string }) {
  return (
    <span className={`whitespace-nowrap ${className}`}>
      <span className="sr-only">can i 100% it?</span>
      <span aria-hidden>
        can i 100
        <PercentGlyph
          className={`ml-[0.1em] mr-[0.04em] ${spin ? "transition-transform duration-500 ease-out group-hover:rotate-90 motion-reduce:transition-none" : ""}`}
        />{" "}
        it?
      </span>
    </span>
  );
}
