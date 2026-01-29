export type SprintHubLead = {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  instagram?: string;
  renda?: string;
};

export type SprintHubStageUpdate = {
  leadId: string;
  stage: string;
  note?: string;
};
