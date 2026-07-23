const routeLabels = {
  cadastro: 'Cadastro facial',
  reconhecimento: 'Reconhecimento',
  perfis: 'Perfis faciais',
  eventos: 'Eventos',
} as const;

type PageKey = keyof typeof routeLabels;

export function StagePage({
  page,
  eyebrow,
  description,
}: {
  page: PageKey;
  eyebrow: string;
  description: string;
}) {
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{routeLabels[page]}</h1>
          <p>{description}</p>
        </div>
        {import.meta.env.VITE_USE_DEMO_EXTERNAL_USERS === 'true' && (
          <span className="status-pill"><i /> Ambiente de demonstração</span>
        )}
      </section>
      <section className="empty-panel">
        <span className="empty-symbol" aria-hidden="true">✦</span>
        <h2>Área autenticada</h2>
        <p>Esta rota está protegida pelo Supabase Auth e pronta para receber seu fluxo funcional.</p>
      </section>
    </>
  );
}
