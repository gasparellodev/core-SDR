import { NextResponse } from "next/server";
import crypto from "crypto";
import type { EvolutionWebhookEvent } from "@/lib/evolution/types";
import { normalizeWhatsapp } from "@/lib/utils/validation";
import {
  getConversationByWhatsapp,
  insertMessage,
  insertConversationStep,
  enqueueOutboundMessage,
  getPendingOutboundQueue,
  markQueueSent,
  updateConversation,
  upsertQualificationData
} from "@/lib/supabase/client";
import { processInboundMessage } from "@/lib/ai/agent";
import { sendMessage } from "@/lib/evolution/client";
import { splitIntoChunks, appendLinkAsChunk } from "@/lib/utils/chunking";
import {
  describeImageFromUrl,
  summarizeFallback,
  transcribeAudioFromUrl
} from "@/lib/ai/media";

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
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;
  return null;
}

function extractMedia(event: EvolutionWebhookEvent): {
  type: "audio" | "image" | "video" | "document" | "sticker";
  url?: string;
} | null {
  const message = event.data?.message;
  if (!message) return null;
  if (message.audioMessage?.url) {
    return { type: "audio", url: message.audioMessage.url };
  }
  if (message.imageMessage?.url) {
    return { type: "image", url: message.imageMessage.url };
  }
  if (message.videoMessage?.url) {
    return { type: "video", url: message.videoMessage.url };
  }
  if (message.documentMessage?.url) {
    return { type: "document", url: message.documentMessage.url };
  }
  if (message.stickerMessage?.url) {
    return { type: "sticker", url: message.stickerMessage.url };
  }
  return null;
}

function extractNumber(remoteJid?: string): string | null {
  if (!remoteJid) return null;
  return normalizeWhatsapp(remoteJid.split("@")[0]);
}

function normalizeEventName(value?: string | null): string {
  if (!value) return "";
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function extractEventNameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    const last = pathname.split("/").filter(Boolean).pop();
    return normalizeEventName(last);
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const allowedTestNumber = "5511951276991";
    const rawBody = await request.text();
    const signature = request.headers.get("x-evolution-signature");
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as EvolutionWebhookEvent;
    const effectiveEvent =
      normalizeEventName(event.event) || extractEventNameFromUrl(request.url);
    if (effectiveEvent !== "MESSAGES_UPSERT") {
      return NextResponse.json({ status: "ignored" });
    }

    const fromMe = event.data?.key?.fromMe ?? false;
    if (fromMe) return NextResponse.json({ status: "ignored" });

    let text = extractText(event);
    if (!text) {
      const media = extractMedia(event);
      if (!media) return NextResponse.json({ status: "ignored" });
      if (media.type === "audio" && media.url) {
        const transcription = await transcribeAudioFromUrl(media.url);
        text = transcription
          ? `Transcricao de audio: ${transcription}`
          : await summarizeFallback(media.type);
      } else if (media.type === "image" && media.url) {
        const description = await describeImageFromUrl(media.url);
        text = description
          ? `Descricao de imagem: ${description}`
          : await summarizeFallback(media.type);
      } else {
        text = await summarizeFallback(media.type, extractText(event));
      }
    }
    if (!text) return NextResponse.json({ status: "ignored" });

    const number = extractNumber(event.data?.key?.remoteJid);
    if (!number) return NextResponse.json({ status: "ignored" });
    if (number !== allowedTestNumber) {
      return NextResponse.json({ status: "ignored" });
    }

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

    let chunks = splitIntoChunks(result.reply, 3);
    if (result.decision === "closer" && process.env.CLOSER_AGENDA_LINK) {
      chunks = appendLinkAsChunk(chunks, process.env.CLOSER_AGENDA_LINK);
    }
    if (result.decision === "sdr" && process.env.SDR_AGENDA_LINK) {
      chunks = appendLinkAsChunk(chunks, process.env.SDR_AGENDA_LINK);
    }
    if (result.decision === "erupcao" && process.env.ERUPCAO_LINK) {
      chunks = appendLinkAsChunk(chunks, process.env.ERUPCAO_LINK);
    }

    for (const content of chunks) {
      await enqueueOutboundMessage({
        conversation_id: conversation.id,
        content,
        step: result.nextState.current_step
      });
    }

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

    const pending = await getPendingOutboundQueue(conversation.id);
    for (const item of pending) {
      await sendMessage(number, item.content);
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

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      { error: "internal_error", details: String(error) },
      { status: 500 }
    );
  }
}
