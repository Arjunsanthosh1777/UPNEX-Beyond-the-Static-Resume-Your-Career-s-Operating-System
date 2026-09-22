// Port of the @loading-ui "square-accordion" spinner (loading-ui.com),
// converted from Tailwind to plain CSS. The grid draws a mono-space square
// frame while stacked block glyphs (█ ▓ ▒) slide around it like an accordion.
const SQUARE_ACCORDION_BLOCKS = ["█", "▓", "▒"];

export function SquareAccordion({
  className = "",
  blocks = SQUARE_ACCORDION_BLOCKS,
  size = 5,
  track = "░",
  style,
  ...props
}) {
  const cells = Math.max(2, Math.floor(size));
  const glyphs = SQUARE_ACCORDION_BLOCKS.map((_, index) => blocks[index] ?? SQUARE_ACCORDION_BLOCKS[index]);
  const gridCells = Array.from({ length: cells * cells }, (_, index) => {
    const row = Math.floor(index / cells);
    const col = index % cells;
    return row === 0 || row === cells - 1 || col === 0 || col === cells - 1 ? track : " ";
  });

  return (
    <>
      <style>{`
        @keyframes loading-ui-square-accordion {
          0% { transform: translate(0, 0); }
          15%, 25% { transform: translate(var(--loader-x), 0); }
          40%, 50% { transform: translate(var(--loader-x), var(--loader-y)); }
          65%, 75% { transform: translate(0, var(--loader-y)); }
          90%, 100% { transform: translate(0, 0); }
        }
      `}</style>
      <span
        role="status"
        className={`lui-square-accordion ${className}`}
        style={{
          "--loader-size": `${cells}ch`,
          "--loader-x": `${cells - 1}ch`,
          "--loader-y": `${cells - 1}ch`,
          ...style
        }}
        {...props}
      >
        <span aria-hidden="true" className="lui-grid" style={{ gridTemplateColumns: `repeat(${cells}, 1ch)`, gridTemplateRows: `repeat(${cells}, 1ch)` }}>
          {gridCells.map((glyph, index) => (
            <span className="lui-cell" key={index}>{glyph}</span>
          ))}
        </span>
        {glyphs.map((glyph, index) => (
          <span
            key={`${glyph}-${index}`}
            aria-hidden="true"
            className="lui-cell lui-active"
            style={{
              animation: "loading-ui-square-accordion var(--duration, 3.5s) linear infinite",
              animationDelay: `calc(var(--delay, 0.08s) * ${index})`,
              backgroundColor: "var(--mask-color, #000)",
              zIndex: [30, 20, 10][index]
            }}
          >
            {glyph}
          </span>
        ))}
        <span className="lui-sr-only">Loading</span>
      </span>
    </>
  );
}