import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/evolution/client";
import {
  insertMessage,
  insertConversationStep,
  getConversationByWhatsapp
} from "@/lib/supabase/client";
import { normalizeWhatsapp } from "@/lib/utils/validation";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const to = normalizeWhatsapp(payload?.to ?? "");
    const text = String(payload?.text ?? "").trim();
    if (!to || !text) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    await sendMessage(to, text);
    const conversation = await getConversationByWhatsapp(to);
    if (conversation) {
      await insertMessage({
        conversation_id: conversation.id,
        direction: "outbound",
        content: text,
        step: conversation.current_step
      });
      await insertConversationStep({
        conversation_id: conversation.id,
        step: conversation.current_step,
        direction: "outbound",
        content: text
      });
    }

    return NextResponse.json({ status: "sent" });
  } catch (error) {
    return NextResponse.json(
      { error: "internal_error", details: String(error) },
      { status: 500 }
    );
  }
}
