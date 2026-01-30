import type { LeadPayload } from "@/types";

export function validateLeadPayload(payload: unknown): payload is LeadPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.name === "string" &&
    typeof p.whatsapp === "string" &&
    typeof p.email === "string" &&
    typeof p.instagram === "string" &&
    typeof p.renda === "string"
  );
}

export function normalizeWhatsapp(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export function isYes(text: string): boolean {
  return /(^|\\s)(sim|claro|pode|ok|quero)(\\s|$)/i.test(text);
}

export function isNo(text: string): boolean {
  return /(^|\\s)(nao|negativo|agora nao)(\\s|$)/i.test(text);
}

export function isLearnPath(text: string): boolean {
  return /aprender|curso|aula|sozinho|sozinh[oa]|estudar/i.test(text);
}

export function isAccompanimentPath(text: string): boolean {
  return /acompanhamento|mentoria|consultoria|ajuda|suporte|guiado/i.test(text);
}

export function safeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}
