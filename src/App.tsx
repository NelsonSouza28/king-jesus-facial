import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { LoadingState } from './components/LoadingState';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { StagePage } from './pages/StagePage';

const RegistrationPage = lazy(() =>
  import('./pages/RegistrationPage').then((module) => ({ default: module.RegistrationPage })),
);
const RecognitionPage = lazy(() =>
  import('./pages/RecognitionPage').then((module) => ({ default: module.RecognitionPage })),
);
const EventsPage = lazy(() =>
  import('./pages/EventsPage').then((module) => ({ default: module.EventsPage })),
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="cadastro"
            element={
              <Suspense fallback={<LoadingState label="Carregando cadastro facial…" />}>
                <RegistrationPage />
              </Suspense>
            }
          />
          <Route
            path="reconhecimento"
            element={
              <Suspense fallback={<LoadingState label="Carregando reconhecimento…" />}>
                <RecognitionPage />
              </Suspense>
            }
          />
          <Route
            path="perfis"
            element={
              <StagePage
                page="perfis"
                eyebrow="BASE FACIAL"
                description="Consulte e administre vínculos faciais sem expor descritores."
              />
            }
          />
          <Route
            path="eventos"
            element={
              <Suspense fallback={<LoadingState label="Carregando eventos…" />}>
                <EventsPage />
              </Suspense>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
