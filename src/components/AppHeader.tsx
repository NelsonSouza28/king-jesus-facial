import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Brand } from './Brand';
import { navigationItems } from './navigation';

function initials(email: string | undefined): string {
  if (!email) return 'OP';
  return email.slice(0, 2).toUpperCase();
}

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <Brand />
      <nav className="desktop-nav" aria-label="Navegação principal">
        {navigationItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <details className="operator-menu">
        <summary className="operator" aria-label="Abrir menu do operador">
          <span className="operator-avatar">{initials(user?.email)}</span>
          <span className="operator-copy">
            <b>Operador</b>
            <small>{user?.email ?? 'Sessão autenticada'}</small>
          </span>
          <span className="operator-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="operator-dropdown">
          <p><b>Operador autenticado</b><span>{user?.email}</span></p>
          <button type="button" onClick={() => void handleSignOut()}>
            Encerrar sessão
          </button>
        </div>
      </details>
    </header>
  );
}
