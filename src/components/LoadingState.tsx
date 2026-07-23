export function LoadingState({ label = 'Carregando sessão…' }: { label?: string }) {
  return (
    <main className="auth-loading" aria-live="polite" aria-busy="true">
      <div className="auth-loading-mark">KJ</div>
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </main>
  );
}
