import { NextResponse } from "next/server";
import crypto from "crypto";
import type { EvolutionWebhookEvent } from "@/lib/evolution/types";
import { normalizeWhatsapp } from "@/lib/utils/validation";
import {
  getConversationByWhatsapp,
  insertMessage,
  insertConversationStep,
  updateConversation,
  upsertQualificationData
} from "@/lib/supabase/client";
import { processInboundMessage } from "@/lib/ai/agent";
import { sendMessage } from "@/lib/evolution/client";

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function extractText(event: EvolutionWebhookEvent): string | null {
  const message = event.data?.message;
  if (!message) return null;
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  return null;
}

function extractNumber(remoteJid?: string): string | null {
  if (!remoteJid) return null;
  return normalizeWhatsapp(remoteJid.split("@")[0]);
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-evolution-signature");
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as EvolutionWebhookEvent;
    if (event.event !== "MESSAGES_UPSERT") {
      return NextResponse.json({ status: "ignored" });
    }

    const fromMe = event.data?.key?.fromMe ?? false;
    if (fromMe) return NextResponse.json({ status: "ignored" });

    const text = extractText(event);
    if (!text) return NextResponse.json({ status: "ignored" });

    const number = extractNumber(event.data?.key?.remoteJid);
    if (!number) return NextResponse.json({ status: "ignored" });

    const conversation = await getConversationByWhatsapp(number);
    if (!conversation) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    await insertMessage({
      conversation_id: conversation.id,
      direction: "inbound",
      content: text,
      step: conversation.current_step
    });
    await insertConversationStep({
      conversation_id: conversation.id,
      step: conversation.current_step,
      direction: "inbound",
      content: text
    });

    const result = await processInboundMessage(conversation, {
      text,
      from: number,
      pushName: event.data?.pushName ?? null,
      messageId: event.data?.key?.id ?? null
    });

    let reply = result.reply;
    if (result.decision === "closer" && process.env.CLOSER_AGENDA_LINK) {
      reply = `${reply}\n${process.env.CLOSER_AGENDA_LINK}`;
    }
    if (result.decision === "sdr" && process.env.SDR_AGENDA_LINK) {
      reply = `${reply}\n${process.env.SDR_AGENDA_LINK}`;
    }
    if (result.decision === "erupcao" && process.env.ERUPCAO_LINK) {
      reply = `${reply}\n${process.env.ERUPCAO_LINK}`;
    }

    await sendMessage(number, reply);
    await insertMessage({
      conversation_id: conversation.id,
      direction: "outbound",
      content: reply,
      step: result.nextState.current_step
    });
    await insertConversationStep({
      conversation_id: conversation.id,
      step: result.nextState.current_step,
      direction: "outbound",
      content: reply
    });

    const updated = await updateConversation(conversation.id, {
      current_step: result.nextState.current_step,
      conversation_data: result.nextState.conversation_data,
      status: result.nextState.status
    });

    await upsertQualificationData({
      conversation_id: updated.id,
      data: updated.conversation_data,
      decisao_final: result.decision
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      { error: "internal_error", details: String(error) },
      { status: 500 }
    );
  }
}
