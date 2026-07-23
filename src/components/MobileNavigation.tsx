import { NavLink } from 'react-router-dom';
import { navigationItems } from './navigation';

export function MobileNavigation() {
  return (
    <nav className="mobile-nav" aria-label="Navegação principal">
      {navigationItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'}>
          <span aria-hidden="true">{item.icon}</span>
          <small>{item.label}</small>
        </NavLink>
      ))}
    </nav>
  );
}
