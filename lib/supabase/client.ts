import { createClient } from "@supabase/supabase-js";
import type { ConversationState, ConversationData } from "@/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getClient() {
  if (!url || !serviceKey) {
    throw new Error("Supabase config missing");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  });
}

export async function createConversation(
  payload: Omit<ConversationState, "id" | "status"> & {
    status?: ConversationState["status"];
  }
): Promise<ConversationState> {
  const client = getClient();
  const { data, error } = await client
    .from("sdr_conversations")
    .insert({
      ...payload,
      status: payload.status ?? "active"
    })
    .select()
    .single();
  if (error) throw error;
  return data as ConversationState;
}

export async function upsertLeadRecord(params: {
  name: string;
  whatsapp: string;
  email: string;
  instagram: string;
  renda: string;
  objetivo?: string;
}): Promise<{ id: string }> {
  const client = getClient();
  const payload = {
    name: params.name,
    whatsapp: params.whatsapp,
    email: params.email,
    instagram: params.instagram,
    renda: params.renda,
    objetivo: params.objetivo ?? null,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await client
    .from("sdr_leads")
    .upsert(payload, { onConflict: "whatsapp" })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function getLeadByWhatsapp(
  whatsapp: string
): Promise<{ id: string } | null> {
  const client = getClient();
  const { data, error } = await client
    .from("sdr_leads")
    .select("id")
    .eq("whatsapp", whatsapp)
    .single();
  if (error) return null;
  return data as { id: string };
}

export async function getConversationByWhatsapp(
  whatsapp: string
): Promise<ConversationState | null> {
  const client = getClient();
  const { data, error } = await client
    .from("sdr_conversations")
    .select("*")
    .eq("lead_whatsapp", whatsapp)
    .single();
  if (error) return null;
  return data as ConversationState;
}

export async function updateConversation(
  id: string,
  updates: Partial<ConversationState>
): Promise<ConversationState> {
  const client = getClient();
  const { data, error } = await client
    .from("sdr_conversations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ConversationState;
}

export async function insertMessage(params: {
  conversation_id: string;
  direction: "inbound" | "outbound";
  content: string;
  step: string;
}): Promise<void> {
  const client = getClient();
  const { error } = await client.from("sdr_messages").insert(params);
  if (error) throw error;
}

export async function insertConversationStep(params: {
  conversation_id: string;
  step: string;
  direction: "inbound" | "outbound";
  content?: string | null;
}): Promise<void> {
  const client = getClient();
  const { error } = await client.from("sdr_conversation_steps").insert({
    conversation_id: params.conversation_id,
    step: params.step,
    direction: params.direction,
    content: params.content ?? null
  });
  if (error) throw error;
}

export async function enqueueOutboundMessage(params: {
  conversation_id: string;
  content: string;
  step: string;
}): Promise<void> {
  const client = getClient();
  const { error } = await client.from("sdr_message_queue").insert({
    conversation_id: params.conversation_id,
    direction: "outbound",
    content: params.content,
    step: params.step,
    status: "pending"
  });
  if (error) throw error;
}

export async function getPendingOutboundQueue(conversationId: string): Promise<
  {
    id: string;
    content: string;
    step: string;
  }[]
> {
  const client = getClient();
  const { data, error } = await client
    .from("sdr_message_queue")
    .select("id, content, step")
    .eq("conversation_id", conversationId)
    .eq("direction", "outbound")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { id: string; content: string; step: string }[];
}

export async function markQueueSent(id: string): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from("sdr_message_queue")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function upsertQualificationData(params: {
  conversation_id: string;
  data: ConversationData;
  decisao_final?: string;
}): Promise<void> {
  const client = getClient();
  const payload = {
    conversation_id: params.conversation_id,
    motivacao: params.data.motivacao ?? null,
    objetivo_principal: params.data.objetivo_principal ?? null,
    objetivos_extras: params.data.objetivos_extras ?? null,
    situacao_atual: params.data.situacao_atual ?? null,
    prioridade: params.data.prioridade ?? null,
    capacidade_investimento:
      typeof params.data.capacidade_investimento === "boolean"
        ? params.data.capacidade_investimento
        : null,
    decisao_final: params.decisao_final ?? null
  };

  const { error } = await client
    .from("sdr_qualification_data")
    .upsert(payload, { onConflict: "conversation_id" });
  if (error) throw error;
}
