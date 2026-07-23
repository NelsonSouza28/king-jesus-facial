import { useState } from 'react';
import { useInstallApp } from '../hooks/useInstallApp';

export function InstallAppCard() {
  const { state, install } = useInstallApp();
  const [showInstructions, setShowInstructions] = useState(false);

  const handleAction = async () => {
    if (state === 'available') {
      await install();
      return;
    }
    if (state !== 'installed') {
      setShowInstructions(true);
    }
  };

  return (
    <>
      <section className="install-card" aria-label="Instalar aplicativo">
        <div className="install-app-icon" aria-hidden="true">KJ</div>
        <div className="install-copy">
          <p className="eyebrow">ACESSO RÁPIDO NO CELULAR</p>
          <h2>{state === 'installed' ? 'KJ Facial instalado' : 'Instale o KJ Facial'}</h2>
          <p>
            {state === 'installed'
              ? 'O aplicativo já pode ser aberto pela tela inicial do aparelho.'
              : 'Use em tela cheia, direto pela tela inicial e sempre na versão mais recente.'}
          </p>
        </div>
        <button
          type="button"
          className={`button ${state === 'installed' ? 'button-installed' : 'button-install'}`}
          onClick={() => void handleAction()}
          disabled={state === 'installed'}
        >
          <span aria-hidden="true">{state === 'installed' ? '✓' : '↓'}</span>
          {state === 'available'
            ? 'Instalar agora'
            : state === 'installed'
              ? 'Instalado'
              : 'Como instalar'}
        </button>
      </section>

      {showInstructions && (
        <div className="install-modal-backdrop" role="presentation" onMouseDown={() => setShowInstructions(false)}>
          <section
            className="install-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="install-modal-close"
              type="button"
              aria-label="Fechar instruções"
              onClick={() => setShowInstructions(false)}
            >
              ×
            </button>
            <div className="install-app-icon" aria-hidden="true">KJ</div>
            <p className="eyebrow">INSTALAÇÃO RÁPIDA</p>
            <h2 id="install-title">
              {state === 'ios' ? 'Adicionar no iPhone ou iPad' : 'Adicionar à tela inicial'}
            </h2>
            {state === 'ios' ? (
              <ol>
                <li>Abra este site pelo <b>Safari</b>.</li>
                <li>Toque no botão <b>Compartilhar</b>.</li>
                <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
                <li>Confirme tocando em <b>Adicionar</b>.</li>
              </ol>
            ) : (
              <ol>
                <li>Abra o menu do navegador.</li>
                <li>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li>
                <li>Confirme a instalação.</li>
              </ol>
            )}
            <button className="button button-primary" type="button" onClick={() => setShowInstructions(false)}>
              Entendi
            </button>
          </section>
        </div>
      )}
    </>
  );
}
