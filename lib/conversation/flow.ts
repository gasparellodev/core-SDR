import type { ConversationStep, ConversationData } from "@/types";
import {
  isNo,
  isYes,
  isLearnPath,
  isAccompanimentPath
} from "@/lib/utils/validation";

export type FlowStep = {
  step: ConversationStep;
  question: (args: {
    name: string;
    instagram: string;
    objetivoForms?: string;
  }) => string;
  validate: (text: string) => boolean;
  extract?: (text: string, data: ConversationData) => ConversationData;
  next: ConversationStep;
};

export const flow: Record<ConversationStep, FlowStep> = {
  abertura: {
    step: "abertura",
    question: ({ name }) =>
      `Boa tarde, ${name}! Tudo bem?\n` +
      `Eu me chamo IA e faco parte da equipe do Elias Maman.\n` +
      `Vi que voce preencheu nosso formulario com interesse em participar de uma call de diagnostico do seu Instagram.\n` +
      `Pra dar sequencia certinho, preciso te fazer algumas perguntas rapidas pra entender se esse diagnostico faz sentido pra voce agora. Pode ser?`,
    validate: (text) => text.trim().length > 0,
    next: "motivacao"
  },
  motivacao: {
    step: "motivacao",
    question: () =>
      "Perfeito.\nOlhando seu formulario aqui, o que mais te chamou a atencao pra se inscrever com a gente?",
    validate: (text) => text.trim().length > 0,
    extract: (text, data) => ({ ...data, motivacao: text.trim() }),
    next: "confirmacao_perfil"
  },
  confirmacao_perfil: {
    step: "confirmacao_perfil",
    question: ({ instagram }) =>
      `So confirmando: esse e o seu perfil do Instagram mesmo? ${instagram}`,
    validate: (text) => isYes(text) || isNo(text) || text.trim().length > 0,
    next: "objetivo_principal"
  },
  objetivo_principal: {
    step: "objetivo_principal",
    question: ({ objetivoForms }) =>
      `Vi aqui que seu principal objetivo hoje e ${objetivoForms ?? "crescer no Instagram"}.\n` +
      "Alem disso, tem mais alguma coisa que hoje seria importante pra voce?\n" +
      "Exemplo: autoridade, audiencia, seguidores qualificados, engajamento.",
    validate: (text) => text.trim().length > 0,
    extract: (text, data) => ({
      ...data,
      objetivos_extras: [text.trim()]
    }),
    next: "situacao_atual"
  },
  situacao_atual: {
    step: "situacao_atual",
    question: () =>
      "Hoje tem alguem cuidando do seu Instagram ou alguma estrategia ja em andamento?",
    validate: (text) => text.trim().length > 0,
    extract: (text, data) => ({ ...data, situacao_atual: text.trim() }),
    next: "prioridade_real"
  },
  prioridade_real: {
    step: "prioridade_real",
    question: ({ name }) =>
      `${name}, antes de avancarmos, preciso ser bem direto.\n` +
      "O quanto faz sentido pra voce comecar de verdade um projeto serio no Instagram?\n" +
      "Isso e uma prioridade pra voce agora?",
    validate: (text) => {
      const lower = text.toLowerCase();
      return isYes(lower) || isNo(lower) || lower.includes("muito");
    },
    extract: (text, data) => {
      const lower = text.toLowerCase();
      const prioridade =
        isYes(lower) || lower.includes("muito")
          ? "alta"
          : isNo(lower)
            ? "baixa"
            : "media";
      return { ...data, prioridade };
    },
    next: "capacidade_investimento"
  },
  capacidade_investimento: {
    step: "capacidade_investimento",
    question: () =>
      "Entendendo que isso e uma prioridade pra voce, preciso te fazer uma pergunta importante.\n" +
      "Hoje, voce estaria disposto(a) a investir financeiramente pra destravar esse projeto?\n" +
      "Trabalhamos com programas de acompanhamento e, em media, o investimento gira em torno de R$3.000 por mes.\n" +
      "Isso e algo que hoje estaria dentro da sua realidade?",
    validate: (text) => isYes(text) || isNo(text),
    extract: (text, data) => ({
      ...data,
      capacidade_investimento: isYes(text)
        ? true
        : isNo(text)
          ? false
          : undefined
    }),
    next: "caminho_pos_capacidade"
  },
  caminho_pos_capacidade: {
    step: "caminho_pos_capacidade",
    question: () =>
      "Perfeito, obrigado pela sinceridade.\n" +
      "Hoje temos caminhos diferentes por aqui:\n" +
      "alguns sao pra quem quer aprender e aplicar sozinho, e outros pra quem quer acompanhamento mais proximo.\n" +
      "Nesse momento, voce se ve mais no caminho de aprender ou de ter acompanhamento?",
    validate: (text) => isLearnPath(text) || isAccompanimentPath(text),
    extract: (text, data) => ({
      ...data,
      caminho_pos_capacidade: isLearnPath(text)
        ? "aprender"
        : isAccompanimentPath(text)
          ? "acompanhamento"
          : undefined
    }),
    next: "decisao"
  },
  decisao: {
    step: "decisao",
    question: () => "",
    validate: () => true,
    next: "decisao"
  }
};
