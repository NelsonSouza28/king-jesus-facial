export interface ExternalUser {
  id: string;
  name: string;
  registrationNumber: string | null;
  className: string | null;
  active: boolean;
}

export interface ExternalUserApiRecord {
  id: string | number;
  nome?: string;
  name?: string;
  matricula?: string | number | null;
  registrationNumber?: string | number | null;
  turma?: string | null;
  className?: string | null;
  ativo?: boolean;
  active?: boolean;
}
