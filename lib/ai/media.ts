type MediaType = "audio" | "image" | "video" | "document" | "sticker";

function getOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  return key;
}

function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

async function fetchMedia(url: string, apiKey?: string): Promise<{
  bytes: ArrayBuffer;
  mime?: string | null;
}> {
  const res = await fetch(url, {
    headers: apiKey ? { apikey: apiKey } : undefined
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Media fetch failed: ${res.status} ${text}`);
  }
  return { bytes: await res.arrayBuffer(), mime: res.headers.get("content-type") };
}

export async function transcribeAudioFromUrl(url: string): Promise<string> {
  const apiKey = getOpenAiKey();
  const { bytes, mime } = await fetchMedia(url, process.env.EVOLUTION_API_KEY);
  const form = new FormData();
  const blob = new Blob([bytes], { type: mime || "audio/mpeg" });
  form.append("file", blob, "audio");
  form.append("model", "whisper-1");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI transcription error: ${response.status} ${text}`);
  }
  const json = (await response.json()) as { text?: string };
  return json.text?.trim() ?? "";
}

export async function describeImageFromUrl(url: string): Promise<string> {
  const apiKey = getOpenAiKey();
  const { bytes, mime } = await fetchMedia(url, process.env.EVOLUTION_API_KEY);
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${mime || "image/jpeg"};base64,${base64}`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      messages: [
        {
          role: "system",
          content:
            "Descreva a imagem em pt-BR de forma objetiva para uso em um atendimento de SDR."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Descreva a imagem." },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.2
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI vision error: ${response.status} ${text}`);
  }
  const json = await response.json();
  return json.choices?.[0]?.message?.content?.trim?.() ?? "";
}

export async function summarizeFallback(
  mediaType: MediaType,
  caption?: string | null
): Promise<string> {
  if (caption && caption.trim()) return caption.trim();
  return `MIDIA_SEM_TEXTO:${mediaType}`;
}
