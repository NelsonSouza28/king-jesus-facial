import { NavLink } from 'react-router-dom';
import { InstallAppCard } from '../components/InstallAppCard';

export function DashboardPage() {
  const cards = [
    ['Rostos cadastrados', '—', 'Perfis ativos'],
    ['Reconhecimentos hoje', '—', 'Eventos processados'],
    ['Eventos enviados', '—', 'Integração confirmada'],
    ['Eventos com falha', '—', 'Aguardando reenvio'],
  ];

  return (
    <>
      <InstallAppCard />
      <section className="hero">
        <div>
          <p className="eyebrow">CENTRAL DE IDENTIFICAÇÃO</p>
          <h1>Reconhecimento simples.<br /><em>Conexão direta.</em></h1>
          <p>Vincule rostos aos alunos existentes e envie identificações ao sistema principal com segurança.</p>
        </div>
        <div className="hero-actions">
          <NavLink className="button button-primary" to="/reconhecimento">
            <span>◎</span> Iniciar reconhecimento
          </NavLink>
          <NavLink className="button button-secondary" to="/cadastro">
            <span>＋</span> Cadastrar rosto
          </NavLink>
        </div>
      </section>
      {import.meta.env.VITE_USE_DEMO_EXTERNAL_USERS === 'true' && (
        <div className="demo-note">
          <span>i</span>
          <p><b>Modo demonstração ativo</b> Alunos externos e envios serão simulados nas etapas funcionais.</p>
        </div>
      )}
      <section className="metric-grid" aria-label="Resumo">
        {cards.map(([label, value, hint]) => (
          <article className="metric-card" key={label}>
            <div className="metric-icon" aria-hidden="true">◇</div>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </section>
      <section className="activity-card">
        <div className="section-title">
          <div><p className="eyebrow">ATIVIDADE</p><h2>Últimos reconhecimentos</h2></div>
          <NavLink to="/eventos">Ver todos →</NavLink>
        </div>
        <div className="empty-activity">
          <span>◎</span>
          <div><b>Nenhum reconhecimento registrado</b><p>Os eventos mais recentes aparecerão aqui.</p></div>
        </div>
      </section>
    </>
  );
}
