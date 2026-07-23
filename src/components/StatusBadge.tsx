export function StatusBadge({
  status,
}: {
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';
}) {
  const labels = {
    PENDING: 'Pendente',
    SENDING: 'Enviando',
    SENT: 'Enviado',
    FAILED: 'Falha',
  };
  return <span className={`event-status event-status-${status.toLowerCase()}`}>{labels[status]}</span>;
}
