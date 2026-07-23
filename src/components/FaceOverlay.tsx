export function FaceOverlay({ analyzing = false }: { analyzing?: boolean }) {
  return (
    <div className={`face-overlay ${analyzing ? 'face-overlay-analyzing' : ''}`} aria-hidden="true">
      <span className="face-corner face-corner-tl" />
      <span className="face-corner face-corner-tr" />
      <span className="face-corner face-corner-bl" />
      <span className="face-corner face-corner-br" />
      {analyzing && <span className="face-scan-line" />}
    </div>
  );
}
