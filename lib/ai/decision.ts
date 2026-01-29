import type { ConversationData } from "@/types";

export type DecisionResult =
  | { type: "closer" }
  | { type: "sdr" }
  | { type: "erupcao" }
  | { type: "need_path" };

export type LeadScore = {
  total: number;
  details: Record<string, number>;
};

export function computeLeadScore(data: ConversationData): LeadScore {
  const details: Record<string, number> = {};
  let total = 0;

  if (data.prioridade === "alta") {
    details.prioridade = 25;
    total += 25;
  } else if (data.prioridade === "media") {
    details.prioridade = 15;
    total += 15;
  } else if (data.prioridade === "baixa") {
    details.prioridade = 5;
    total += 5;
  }

  if (data.capacidade_investimento === true) {
    details.investimento = 25;
    total += 25;
  } else if (data.capacidade_investimento === false) {
    details.investimento = 5;
    total += 5;
  }

  if (data.motivacao && data.motivacao.length > 10) {
    details.motivacao = 10;
    total += 10;
  }

  if (data.situacao_atual && data.situacao_atual.length > 10) {
    details.situacao_atual = 10;
    total += 10;
  }

  const objetivoBase = data.objetivo_principal || data.objetivo_forms;
  if (objetivoBase && objetivoBase.length > 5) {
    details.objetivo = 10;
    total += 10;
  }

  if (data.objetivos_extras && data.objetivos_extras.length > 0) {
    details.objetivos_extras = 10;
    total += 10;
  }

  if (total > 100) total = 100;

  return { total, details };
}

export function decideNext(
  data: ConversationData,
  lastInboundText: string
): DecisionResult {
  if (data.capacidade_investimento === true) return { type: "closer" };

  if (data.capacidade_investimento === false) {
    if (/aprender|curso|aula/i.test(lastInboundText)) {
      return { type: "erupcao" };
    }
    if (/acompanhamento|mentoria|consultoria/i.test(lastInboundText)) {
      return { type: "sdr" };
    }
    return { type: "need_path" };
  }

  return { type: "need_path" };
}
