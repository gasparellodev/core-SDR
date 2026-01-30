import { NextResponse } from "next/server";
import { validateLeadPayload, normalizeWhatsapp } from "@/lib/utils/validation";
import {
  createConversation,
  getConversationByWhatsapp,
  insertMessage,
  insertConversationStep,
  upsertLeadRecord,
  enqueueOutboundMessage,
  getPendingOutboundQueue,
  markQueueSent
} from "@/lib/supabase/client";
import { flow } from "@/lib/conversation/flow";
import { sendMessage } from "@/lib/evolution/client";
import { splitIntoChunks } from "@/lib/utils/chunking";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!validateLeadPayload(payload)) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const whatsapp = normalizeWhatsapp(payload.whatsapp);
    const existing = await getConversationByWhatsapp(whatsapp);
    if (existing) {
      return NextResponse.json({ status: "exists", id: existing.id });
    }

    const initialQuestion = flow.abertura.question({
      name: payload.name,
      instagram: payload.instagram,
      objetivoForms: payload.objetivo
    });

    const lead = await upsertLeadRecord({
      name: payload.name,
      whatsapp,
      email: payload.email,
      instagram: payload.instagram,
      renda: payload.renda,
      objetivo: payload.objetivo
    });

    const conversation = await createConversation({
      lead_id: lead.id,
      lead_whatsapp: whatsapp,
      lead_name: payload.name,
      lead_email: payload.email,
      lead_instagram: payload.instagram,
      lead_renda: payload.renda,
      current_step: "abertura",
      conversation_data: {
        objetivo_forms: payload.objetivo,
        objetivo_principal: payload.objetivo
      },
      status: "active"
    });

    const chunks = splitIntoChunks(initialQuestion, 3);
    for (const content of chunks) {
      await enqueueOutboundMessage({
        conversation_id: conversation.id,
        content,
        step: "abertura"
      });
    }

    const pending = await getPendingOutboundQueue(conversation.id);
    for (const item of pending) {
      await sendMessage(whatsapp, item.content);
      await insertMessage({
        conversation_id: conversation.id,
        direction: "outbound",
        content: item.content,
        step: item.step
      });
      await insertConversationStep({
        conversation_id: conversation.id,
        step: item.step,
        direction: "outbound",
        content: item.content
      });
      await markQueueSent(item.id);
    }

    return NextResponse.json({ status: "created", id: conversation.id });
  } catch (error) {
    return NextResponse.json(
      { error: "internal_error", details: String(error) },
      { status: 500 }
    );
  }
}
