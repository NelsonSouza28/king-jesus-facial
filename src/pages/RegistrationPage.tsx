import { useEffect, useMemo, useState } from 'react';
import { CameraCapture } from '../components/CameraCapture';
import { useAuth } from '../contexts/AuthContext';
import { loadHumanModels } from '../lib/human';
import {
  findPossibleDuplicates,
  getActiveProfile,
  removeFaceProfile,
  saveFaceProfile,
} from '../services/faceProfiles';
import { getExternalUsers } from '../services/externalUsers';
import type { ExternalUser } from '../types/external';
import type { FacialCapture, SafeFaceProfile } from '../types/facial';
import { analyzeFacialCapture, captureVideoFrame } from '../utils/image';

type Feedback = { type: 'success' | 'error' | 'warning'; message: string } | null;

function UserCard({
  user,
  selected,
  onSelect,
}: {
  user: ExternalUser;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`student-card ${selected ? 'student-card-selected' : ''}`}
      onClick={onSelect}
    >
      <span className="student-avatar" aria-hidden="true">
        {user.name.split(' ').slice(0, 2).map((part) => part[0]).join('')}
      </span>
      <span className="student-copy">
        <b>{user.name}</b>
        <small>{user.registrationNumber || 'Sem matrícula'} · {user.className || 'Sem turma'}</small>
        <small>ID externo: {user.id}</small>
      </span>
      <span className="student-select" aria-hidden="true">{selected ? '✓' : '›'}</span>
    </button>
  );
}

export function RegistrationPage() {
  const { user: operator } = useAuth();
  const [users, setUsers] = useState<ExternalUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<ExternalUser | null>(null);
  const [existingProfile, setExistingProfile] = useState<SafeFaceProfile | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [consent, setConsent] = useState(false);
  const [modelsStatus, setModelsStatus] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [capture, setCapture] = useState<FacialCapture | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    void getExternalUsers()
      .then(setUsers)
      .catch((error: unknown) => {
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : 'Não foi possível carregar os alunos.',
        });
      })
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => () => {
    if (capture?.previewUrl) URL.revokeObjectURL(capture.previewUrl);
  }, [capture]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return users;
    return users.filter((student) =>
      student.name.toLocaleLowerCase('pt-BR').includes(term)
      || student.registrationNumber?.toLocaleLowerCase('pt-BR').includes(term),
    );
  }, [search, users]);

  const selectUser = async (student: ExternalUser) => {
    setSelectedUser(student);
    setExistingProfile(null);
    setConsent(false);
    setCapture(null);
    setFeedback(null);
    setCheckingProfile(true);
    try {
      setExistingProfile(await getActiveProfile(student.id));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível verificar o cadastro facial.',
      });
    } finally {
      setCheckingProfile(false);
    }
  };

  const openCamera = async () => {
    setFeedback(null);
    if (!selectedUser) {
      setFeedback({ type: 'warning', message: 'Selecione um aluno antes de abrir a câmera.' });
      return;
    }
    if (!consent) {
      setFeedback({ type: 'warning', message: 'Confirme o consentimento antes da captura.' });
      return;
    }
    try {
      await loadHumanModels(setModelsStatus);
      setCameraOpen(true);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Modelos faciais não carregados.',
      });
    } finally {
      setModelsStatus('');
    }
  };

  const analyzeVideo = async (video: HTMLVideoElement) => {
    setAnalyzing(true);
    setFeedback(null);
    try {
      const nextCapture = await analyzeFacialCapture(captureVideoFrame(video));
      setCapture(nextCapture);
      setCameraOpen(false);
      setFeedback({ type: 'success', message: nextCapture.quality.message });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível validar a captura.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmRegistration = async () => {
    if (!operator || !selectedUser || !capture || !consent) return;
    setSaving(true);
    setFeedback(null);
    try {
      const matches = await findPossibleDuplicates(capture.embedding);
      const duplicate = matches.find((match) => match.external_user_id !== selectedUser.id);
      if (duplicate) {
        setFeedback({
          type: 'error',
          message: `Possível biometria duplicada com ${duplicate.external_user_name}. Faça outra captura e revise antes de continuar.`,
        });
        return;
      }

      await saveFaceProfile({
        userId: operator.id,
        externalUser: selectedUser,
        embedding: capture.embedding,
        image: capture.blob,
        existingProfile,
      });

      setFeedback({
        type: 'success',
        message: existingProfile
          ? 'Cadastro facial substituído com sucesso.'
          : 'Rosto vinculado ao aluno com sucesso.',
      });
      setExistingProfile(await getActiveProfile(selectedUser.id));
      setCapture(null);
      setConsent(false);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível salvar o cadastro facial.',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeRegistration = async () => {
    if (!existingProfile) return;
    const confirmed = window.confirm(
      'Remover definitivamente a imagem e o vínculo facial deste aluno?',
    );
    if (!confirmed) return;
    setSaving(true);
    setFeedback(null);
    try {
      await removeFaceProfile(existingProfile);
      setExistingProfile(null);
      setCapture(null);
      setConsent(false);
      setFeedback({ type: 'success', message: 'Cadastro facial removido com sucesso.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível remover o cadastro.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="page-heading registration-heading">
        <div>
          <p className="eyebrow">NOVO VÍNCULO</p>
          <h1>Cadastro facial</h1>
          <p>Escolha um aluno já existente, confirme o consentimento e capture uma imagem de qualidade.</p>
        </div>
        {import.meta.env.VITE_USE_DEMO_EXTERNAL_USERS === 'true' && (
          <span className="status-pill"><i /> Alunos de demonstração</span>
        )}
      </section>

      {feedback && (
        <div className={`registration-feedback registration-feedback-${feedback.type}`} role="alert">
          <span aria-hidden="true">{feedback.type === 'success' ? '✓' : feedback.type === 'error' ? '!' : 'i'}</span>
          <p>{feedback.message}</p>
        </div>
      )}

      <div className="registration-grid">
        <section className="registration-panel">
          <div className="step-heading">
            <span>1</span>
            <div><p className="eyebrow">ALUNO EXISTENTE</p><h2>Selecione o aluno</h2></div>
          </div>
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar por nome ou matrícula"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="student-list">
            {loadingUsers ? (
              Array.from({ length: 4 }, (_, index) => <div className="student-skeleton" key={index} />)
            ) : filteredUsers.length ? (
              filteredUsers.map((student) => (
                <UserCard
                  key={student.id}
                  user={student}
                  selected={selectedUser?.id === student.id}
                  onSelect={() => void selectUser(student)}
                />
              ))
            ) : (
              <div className="list-empty">Nenhum aluno encontrado.</div>
            )}
          </div>
        </section>

        <section className="registration-panel registration-workspace">
          <div className="step-heading">
            <span>2</span>
            <div><p className="eyebrow">CAPTURA SEGURA</p><h2>Vincule o rosto</h2></div>
          </div>

          {!selectedUser ? (
            <div className="registration-empty">
              <span aria-hidden="true">◎</span>
              <h3>Escolha um aluno</h3>
              <p>Os dados selecionados e os controles da câmera aparecerão aqui.</p>
            </div>
          ) : (
            <>
              <article className="selected-student">
                <span className="student-avatar">
                  {selectedUser.name.split(' ').slice(0, 2).map((part) => part[0]).join('')}
                </span>
                <div>
                  <small>ALUNO SELECIONADO</small>
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.registrationNumber || 'Sem matrícula'} · {selectedUser.className || 'Sem turma'}</p>
                  <p>ID externo: <b>{selectedUser.id}</b></p>
                </div>
              </article>

              {checkingProfile && <div className="inline-loading"><span className="spinner" /> Verificando cadastro…</div>}

              {existingProfile && !checkingProfile && (
                <div className="existing-profile-note">
                  <span>!</span>
                  <p><b>Este aluno já possui rosto cadastrado.</b> Uma nova confirmação substituirá a imagem e o descritor atuais.</p>
                  <button type="button" onClick={() => void removeRegistration()} disabled={saving}>
                    Remover cadastro
                  </button>
                </div>
              )}

              <label className="consent-card">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  <b>Consentimento para identificação facial</b>
                  <small>Confirmo que a imagem e o descritor facial serão usados somente para identificar este aluno e gerar um evento para o sistema principal.</small>
                </span>
              </label>

              {modelsStatus && (
                <div className="model-loading" aria-live="polite">
                  <span className="spinner" />
                  <div><b>Preparando inteligência facial</b><p>{modelsStatus}</p></div>
                </div>
              )}

              {cameraOpen ? (
                <CameraCapture
                  analyzing={analyzing}
                  onCapture={(video) => void analyzeVideo(video)}
                  onClose={() => setCameraOpen(false)}
                />
              ) : capture ? (
                <div className="capture-review">
                  <div className="capture-preview">
                    <img src={capture.previewUrl} alt={`Captura facial de ${selectedUser.name}`} />
                    <span>CAPTURA APROVADA</span>
                  </div>
                  <div className="quality-grid">
                    <span><b>{Math.round(capture.quality.faceConfidence * 100)}%</b> detecção</span>
                    <span><b>{Math.round(capture.quality.faceAreaRatio * 100)}%</b> enquadramento</span>
                    <span><b>{Math.round(capture.quality.brightness)}</b> luminosidade</span>
                    <span><b>{Math.round(capture.quality.sharpness)}</b> nitidez</span>
                  </div>
                  <p className="liveness-note">Verificação simples: confirme visualmente que a pessoa olhou para a câmera. Isto não constitui prova de vida robusta.</p>
                  <div className="review-actions">
                    <button className="button button-secondary" type="button" onClick={() => void openCamera()} disabled={saving}>
                      Capturar novamente
                    </button>
                    <button className="button button-primary" type="button" onClick={() => void confirmRegistration()} disabled={saving}>
                      {saving
                        ? <><span className="button-spinner" /> Salvando…</>
                        : existingProfile ? 'Substituir cadastro existente' : 'Confirmar cadastro'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="capture-start">
                  <div className="capture-guide" aria-hidden="true"><span>◎</span></div>
                  <div>
                    <h3>Pronto para capturar</h3>
                    <p>Use a câmera frontal, mantenha apenas um rosto visível e procure iluminação uniforme.</p>
                  </div>
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={() => void openCamera()}
                    disabled={!consent || checkingProfile || Boolean(modelsStatus)}
                  >
                    Abrir câmera
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
