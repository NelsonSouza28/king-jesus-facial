import { useEffect, useMemo, useState } from 'react';
import {
  listActiveFaceProfiles,
  removeFaceProfile,
} from '../services/faceProfiles';
import type { SafeFaceProfile } from '../types/facial';

export function ProfilesPage() {
  const [profiles, setProfiles] = useState<SafeFaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState('');

  useEffect(() => {
    void listActiveFaceProfiles()
      .then(setProfiles)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Falha ao carregar perfis.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return profiles;
    return profiles.filter((profile) =>
      profile.external_user_name.toLocaleLowerCase('pt-BR').includes(term)
      || profile.class_name?.toLocaleLowerCase('pt-BR').includes(term),
    );
  }, [profiles, search]);

  const remove = async (profile: SafeFaceProfile) => {
    if (!window.confirm(`Remover o cadastro facial de ${profile.external_user_name}?`)) return;
    setRemovingId(profile.id);
    setError('');
    try {
      await removeFaceProfile(profile);
      setProfiles((current) => current.filter((item) => item.id !== profile.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível remover o perfil.');
    } finally {
      setRemovingId('');
    }
  };

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">BASE FACIAL</p>
          <h1>Perfis cadastrados</h1>
          <p>Consulte os vínculos ativos e remova cadastros que precisam ser refeitos.</p>
        </div>
        <span className="status-pill"><i /> {profiles.length} perfil(is)</span>
      </section>

      <label className="search-field profiles-search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Buscar por aluno ou turma"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {error && <div className="registration-feedback registration-feedback-error" role="alert"><span>!</span><p>{error}</p></div>}

      <section className="profiles-grid">
        {loading ? (
          Array.from({ length: 6 }, (_, index) => <div className="profile-card profile-skeleton" key={index} />)
        ) : filtered.length ? (
          filtered.map((profile) => (
            <article className="profile-card" key={profile.id}>
              <span className="profile-avatar">
                {profile.external_user_name.split(' ').slice(0, 2).map((part) => part[0]).join('')}
              </span>
              <div className="profile-copy">
                <h2>{profile.external_user_name}</h2>
                <p>{profile.class_name || 'Turma não informada'}</p>
                <small>Cadastrado em {new Intl.DateTimeFormat('pt-BR').format(new Date(profile.created_at))}</small>
              </div>
              <button
                className="profile-remove"
                type="button"
                disabled={removingId === profile.id}
                onClick={() => void remove(profile)}
              >
                {removingId === profile.id ? 'Removendo…' : 'Remover'}
              </button>
            </article>
          ))
        ) : (
          <div className="events-empty profiles-empty"><span>◇</span><h2>Nenhum perfil encontrado</h2><p>Cadastre um rosto para começar.</p></div>
        )}
      </section>
    </>
  );
}
