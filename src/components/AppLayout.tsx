import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { MobileNavigation } from './MobileNavigation';

export function AppLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="page">
        <Outlet />
      </main>
      <MobileNavigation />
    </div>
  );
}
