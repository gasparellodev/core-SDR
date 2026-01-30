export type ConversationStatus =
  | "active"
  | "completed"
  | "qualified_closer"
  | "qualified_sdr"
  | "qualified_erupcao";

export type ConversationStep =
  | "abertura"
  | "motivacao"
  | "confirmacao_perfil"
  | "objetivo_principal"
  | "situacao_atual"
  | "prioridade_real"
  | "capacidade_investimento"
  | "caminho_pos_capacidade"
  | "decisao";

export type LeadPayload = {
  name: string;
  whatsapp: string;
  email: string;
  instagram: string;
  renda: string;
  objetivo?: string;
};

export type ConversationData = {
  motivacao?: string;
  objetivo_forms?: string;
  objetivo_principal?: string;
  objetivos_extras?: string[];
  situacao_atual?: string;
  prioridade?: "alta" | "media" | "baixa";
  capacidade_investimento?: boolean;
  caminho_pos_capacidade?: "aprender" | "acompanhamento";
};

export type ConversationState = {
  id: string;
  lead_id?: string | null;
  lead_whatsapp: string;
  lead_name: string;
  lead_email: string;
  lead_instagram: string;
  lead_renda: string;
  current_step: ConversationStep;
  status: ConversationStatus;
  conversation_data: ConversationData;
  sprinthub_lead_id?: string | null;
};

export type InboundMessage = {
  text: string;
  from: string;
  pushName?: string | null;
  messageId?: string | null;
};
