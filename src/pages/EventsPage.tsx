import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { listRecognitionEvents } from '../services/recognitionEvents';
import type { RecognitionEventListItem } from '../types/facial';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

export function EventsPage() {
  const [events, setEvents] = useState<RecognitionEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [date, setDate] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setEvents(await listRecognitionEvents());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os eventos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return events.filter((event) => {
      const matchesSearch =
        !term
        || event.face_profile?.external_user_name.toLocaleLowerCase('pt-BR').includes(term)
        || event.face_profile?.registration_number?.toLocaleLowerCase('pt-BR').includes(term)
        || event.external_user_id?.toLocaleLowerCase('pt-BR').includes(term);
      const matchesStatus = status === 'ALL' || event.integration_status === status;
      const matchesDate = !date || event.recognized_at.slice(0, 10) === date;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [date, events, search, status]);

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">INTEGRAÇÃO</p>
          <h1>Eventos</h1>
          <p>Acompanhe os reconhecimentos registrados. O envio ao sistema oficial será ativado na próxima etapa.</p>
        </div>
        <button className="button button-secondary compact-button" type="button" onClick={() => void load()}>
          Atualizar
        </button>
      </section>

      <section className="event-filters">
        <label>
          <span>Nome, matrícula ou ID</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar evento" />
        </label>
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendente</option>
            <option value="SENDING">Enviando</option>
            <option value="SENT">Enviado</option>
            <option value="FAILED">Falha</option>
          </select>
        </label>
        <label>
          <span>Data</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </section>

      {error && <div className="registration-feedback registration-feedback-error" role="alert"><span>!</span><p>{error}</p></div>}

      <section className="events-card">
        {loading ? (
          <div className="events-loading">
            {Array.from({ length: 5 }, (_, index) => <div className="event-skeleton" key={index} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="events-empty"><span>◎</span><h2>Nenhum evento encontrado</h2><p>Os reconhecimentos registrados aparecerão aqui.</p></div>
        ) : (
          <div className="event-list">
            {filtered.map((event) => (
              <article className="event-row" key={event.id}>
                <span className="event-avatar">
                  {(event.face_profile?.external_user_name || 'ID')
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')}
                </span>
                <div className="event-person">
                  <b>{event.face_profile?.external_user_name || 'Perfil removido'}</b>
                  <small>{event.face_profile?.registration_number || 'Sem matrícula'} · ID {event.external_user_id}</small>
                </div>
                <div className="event-comparison">
                  <span>Indicador</span>
                  <b>{event.confidence == null ? '—' : `${Math.round(event.confidence * 100)}%`}</b>
                </div>
                <div className="event-time">
                  <span>Horário</span>
                  <b>{formatDate(event.recognized_at)}</b>
                </div>
                <div className="event-integration">
                  <StatusBadge status={event.integration_status} />
                  <small>{event.retry_count} tentativa(s)</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
