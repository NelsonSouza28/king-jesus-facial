import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { InstallAppCard } from '../components/InstallAppCard';
import { supabase } from '../lib/supabase';
import { listRecognitionEvents } from '../services/recognitionEvents';
import type { RecognitionEventListItem } from '../types/facial';

export function DashboardPage() {
  const [events, setEvents] = useState<RecognitionEventListItem[]>([]);
  const [profileCount, setProfileCount] = useState(0);

  const loadDashboard = useCallback(async () => {
    if (!supabase) return;
    const [{ count }, recentEvents] = await Promise.all([
      supabase
        .from('face_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('active', true),
      listRecognitionEvents(),
    ]);
    setProfileCount(count ?? 0);
    setEvents(recentEvents);
  }, []);

  useEffect(() => {
    void loadDashboard();
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recognition_events' }, () => {
        void loadDashboard();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'face_profiles' }, () => {
        void loadDashboard();
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [loadDashboard]);

  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((event) => event.recognized_at.slice(0, 10) === today);
  const cards = [
    ['Rostos cadastrados', String(profileCount), 'Perfis ativos'],
    ['Reconhecimentos hoje', String(todayEvents.length), 'Identificações realizadas'],
    ['Presenças confirmadas', String(events.filter((event) => event.integration_status === 'SENT').length), 'Enviadas ao sistema oficial'],
    ['Pendências', String(events.filter((event) => ['FAILED', 'PENDING'].includes(event.integration_status)).length), 'Aguardando revisão'],
  ];

  return (
    <>
      <InstallAppCard />
      <section className="hero">
        <div>
          <p className="eyebrow">CONTROLE DE ACESSO</p>
          <h1>Identificação rápida.<br /><em>Frequência integrada.</em></h1>
          <p>Cadastre alunos, reconheça rostos e acompanhe o envio de presença ao sistema KING JESUS.</p>
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

      <section className="metric-grid" aria-label="Resumo operacional">
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
          <div><p className="eyebrow">ATUALIZAÇÃO AUTOMÁTICA</p><h2>Últimos reconhecimentos</h2></div>
          <NavLink to="/eventos">Ver todos →</NavLink>
        </div>
        {events.length ? (
          <div className="event-list">
            {events.slice(0, 5).map((event) => (
              <article className="event-row" key={event.id}>
                <span className="event-avatar">
                  {(event.face_profile?.external_user_name || 'ID').split(' ').slice(0, 2).map((part) => part[0]).join('')}
                </span>
                <div className="event-person">
                  <b>{event.face_profile?.external_user_name || 'Perfil removido'}</b>
                  <small>{event.face_profile?.class_name || 'Turma não informada'}</small>
                </div>
                <div className="event-time">
                  <span>Registro</span>
                  <b>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.recognized_at))}</b>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-activity">
            <span>◎</span>
            <div><b>Nenhum reconhecimento registrado</b><p>Os eventos mais recentes aparecerão aqui.</p></div>
          </div>
        )}
      </section>
    </>
  );
}
