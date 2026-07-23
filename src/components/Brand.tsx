import { Link } from 'react-router-dom';

export function Brand({ linked = true }: { linked?: boolean }) {
  const content = (
    <>
      <span className="brand-mark">KJ</span>
      <span>
        <b>KING JESUS</b>
        <small>FACIAL</small>
      </span>
    </>
  );

  return linked ? (
    <Link className="brand" to="/" aria-label="KING JESUS Facial — início">
      {content}
    </Link>
  ) : (
    <div className="brand" aria-label="KING JESUS Facial">
      {content}
    </div>
  );
}
