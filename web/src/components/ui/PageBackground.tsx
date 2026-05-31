/**
 * Shared full-viewport aurora gradient — drifting ember/teal/slate blobs + a faint
 * dot grid. Fixed behind all content (`z-index: -1`). Drop it as the first child of a
 * layout root that has `isolation: isolate`, so it paints above the root's background
 * but below every other element. One definition, used on every page.
 */
export function PageBackground() {
  return (
    <div className="page-bg" aria-hidden>
      <div className="hero-blob hero-blob--ember" />
      <div className="hero-blob hero-blob--teal" />
      <div className="hero-blob hero-blob--slate" />
      <div className="hero-blob hero-blob--ember2" />
      <div className="page-bg__grid" />
    </div>
  );
}
