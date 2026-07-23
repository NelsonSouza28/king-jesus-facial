import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../contexts/AuthContext';

interface LoginLocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { user, loading, configured, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const destination =
    (location.state as LoginLocationState | null)?.from?.pathname || '/';

  useEffect(() => {
    if (!loading && user) {
      navigate(destination, { replace: true });
    }
  }, [destination, loading, navigate, user]);

  if (loading) {
    return <LoadingState />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Informe o e-mail e a senha.');
      return;
    }

    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate(destination, { replace: true });
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <Brand linked={false} />
        <div className="login-heading">
          <p className="eyebrow">ACESSO DO OPERADOR</p>
          <h1>Bem-vindo</h1>
          <p>Entre com suas credenciais para acessar a central facial.</p>
        </div>
        {!configured && (
          <div className="form-message form-message-warning" role="alert">
            A conexão com o Supabase ainda não foi configurada no arquivo .env.
          </div>
        )}
        {error && (
          <div className="form-message form-message-error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="operador@kingjesus.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            required
          />
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            required
          />
          <button
            className="button button-primary"
            type="submit"
            disabled={submitting || !configured}
          >
            {submitting ? <><span className="button-spinner" /> Entrando…</> : <>Entrar <span>→</span></>}
          </button>
        </form>
        <p className="login-footnote">
          Acesso exclusivo para operadores autorizados. Não há cadastro público.
        </p>
      </section>
      <aside className="login-art" aria-hidden="true">
        <div className="scan-frame"><span>KJ</span></div>
        <p>IDENTIDADE · PRECISÃO · CONFIANÇA</p>
      </aside>
    </main>
  );
}
