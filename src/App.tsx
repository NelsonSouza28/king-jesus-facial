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
              <StagePage
                page="reconhecimento"
                eyebrow="IDENTIFICAÇÃO"
                description="Use a câmera para localizar o perfil facial e gerar um evento."
              />
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
              <StagePage
                page="eventos"
                eyebrow="INTEGRAÇÃO"
                description="Acompanhe reconhecimentos e o envio ao sistema principal."
              />
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
