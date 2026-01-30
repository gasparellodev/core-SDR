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
      audioMessage?: { url?: string; mimetype?: string };
      imageMessage?: { url?: string; mimetype?: string; caption?: string };
      videoMessage?: { url?: string; mimetype?: string; caption?: string };
      documentMessage?: {
        url?: string;
        mimetype?: string;
        fileName?: string;
        caption?: string;
      };
      stickerMessage?: { url?: string; mimetype?: string };
    };
    pushName?: string;
    messageTimestamp?: number;
  };
};

export type EvolutionSendMessageResponse = {
  id?: string;
  status?: string;
};
