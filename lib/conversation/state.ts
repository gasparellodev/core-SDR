import type { ConversationState, ConversationData, ConversationStep } from "@/types";
import { flow } from "@/lib/conversation/flow";

export function applyAnswer(
  state: ConversationState,
  inboundText: string
): { nextState: ConversationState; isValid: boolean } {
  const step = flow[state.current_step];
  const isValid = step.validate(inboundText);
  if (!isValid) {
    return { nextState: state, isValid: false };
  }

  const updatedData: ConversationData = step.extract
    ? step.extract(inboundText, state.conversation_data || {})
    : state.conversation_data || {};

  const nextStep: ConversationStep = step.next;

  return {
    nextState: {
      ...state,
      current_step: nextStep,
      conversation_data: updatedData
    },
    isValid: true
  };
}

export function setStatus(
  state: ConversationState,
  status: ConversationState["status"]
): ConversationState {
  return { ...state, status };
}
