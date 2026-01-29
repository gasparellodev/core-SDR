export type EvolutionWebhookEvent = {
  event: string;
  instance?: string;
  timestamp?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
    };
    pushName?: string;
    messageTimestamp?: number;
  };
};

export type EvolutionSendMessageResponse = {
  id?: string;
  status?: string;
};
