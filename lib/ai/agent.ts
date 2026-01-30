import type { ConversationState, InboundMessage } from "@/types";
import { flow } from "@/lib/conversation/flow";
import { applyAnswer, setStatus } from "@/lib/conversation/state";
import { decisionCopy, validationCopy } from "@/lib/ai/prompts";
import { decideNext } from "@/lib/ai/decision";
import { generateSdrReply } from "@/lib/ai/llm";
import { isNo } from "@/lib/utils/validation";

export type AgentResult = {
  reply: string;
  nextState: ConversationState;
  completed: boolean;
  decision?: "closer" | "sdr" | "erupcao";
};

export async function processInboundMessage(
  state: ConversationState,
  inbound: InboundMessage
): Promise<AgentResult> {
  if (state.current_step === "abertura" && isNo(inbound.text)) {
    return {
      reply:
        "Sem problemas. Se fizer sentido em outro momento, posso te ajudar por aqui.",
      nextState: setStatus(state, "completed"),
      completed: true
    };
  }
  if (state.current_step === "decisao") {
    const decision = decideNext(state.conversation_data, inbound.text);
    if (decision.type === "need_path") {
      return {
        reply: decisionCopy.noInvestmentAskPath,
        nextState: state,
        completed: false
      };
    }
    if (decision.type === "closer") {
      return {
        reply: decisionCopy.closerIntro,
        nextState: setStatus(state, "qualified_closer"),
        completed: true,
        decision: "closer"
      };
    }
    if (decision.type === "sdr") {
      return {
        reply: decisionCopy.sdrFollowup,
        nextState: setStatus(state, "qualified_sdr"),
        completed: true,
        decision: "sdr"
      };
    }
    return {
      reply: decisionCopy.sdrFollowup,
      nextState: setStatus(state, "qualified_erupcao"),
      completed: true,
      decision: "erupcao"
    };
  }

  const currentStepDef = flow[state.current_step];
  const currentQuestion = currentStepDef.question({
    name: state.lead_name,
    instagram: state.lead_instagram,
    objetivoForms: state.conversation_data.objetivo_forms
  });

  const { nextState, isValid } = applyAnswer(state, inbound.text);
  if (!isValid) {
    return {
      reply: validationCopy.askClarify,
      nextState: state,
      completed: false
    };
  }

  if (state.current_step === "capacidade_investimento") {
    if (nextState.conversation_data.capacidade_investimento === true) {
      return {
        reply: decisionCopy.closerIntro,
        nextState: setStatus(
          { ...nextState, current_step: "decisao" },
          "qualified_closer"
        ),
        completed: true,
        decision: "closer"
      };
    }
    if (nextState.conversation_data.capacidade_investimento === false) {
      return {
        reply: decisionCopy.noInvestmentAskPath,
        nextState,
        completed: false
      };
    }
  }

  if (state.current_step === "caminho_pos_capacidade") {
    if (nextState.conversation_data.caminho_pos_capacidade === "aprender") {
      return {
        reply: decisionCopy.erupcaoFollowup,
        nextState: setStatus(
          { ...nextState, current_step: "decisao" },
          "qualified_erupcao"
        ),
        completed: true,
        decision: "erupcao"
      };
    }
    if (nextState.conversation_data.caminho_pos_capacidade === "acompanhamento") {
      return {
        reply: decisionCopy.sdrFollowup,
        nextState: setStatus(
          { ...nextState, current_step: "decisao" },
          "qualified_sdr"
        ),
        completed: true,
        decision: "sdr"
      };
    }
  }

  const nextStep = flow[nextState.current_step];
  const nextQuestion = nextStep.question({
    name: nextState.lead_name,
    instagram: nextState.lead_instagram,
    objetivoForms: nextState.conversation_data.objetivo_forms
  });

  const llmReply = await generateSdrReply({
    state,
    step: state.current_step,
    inboundText: inbound.text,
    currentQuestion,
    nextQuestion
  });

  if (llmReply) {
    if (!llmReply.valid) {
      return {
        reply: llmReply.reply,
        nextState: state,
        completed: false
      };
    }
    const mergedState: ConversationState = {
      ...nextState,
      conversation_data: {
        ...nextState.conversation_data,
        ...(llmReply.extracted ?? {})
      }
    };
    return {
      reply: llmReply.reply,
      nextState: mergedState,
      completed: false
    };
  }

  let reply = nextQuestion;
  if (state.current_step === "motivacao") {
    reply =
      `Legal, ${nextState.lead_name}.\n` +
      "Essa conversa e importante justamente pra mapear pontos estrategicos que podem ajudar seu perfil a destravar crescimento.\n" +
      nextQuestion;
  }

  return {
    reply,
    nextState,
    completed: false
  };
}
