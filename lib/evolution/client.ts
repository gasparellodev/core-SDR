import type { EvolutionSendMessageResponse } from "@/lib/evolution/types";

const baseUrl = process.env.EVOLUTION_API_URL;
const apiKey = process.env.EVOLUTION_API_KEY;
const instanceName = process.env.EVOLUTION_INSTANCE_NAME;

export function getEvolutionConfig() {
  if (!baseUrl || !apiKey || !instanceName) {
    throw new Error("Evolution API config missing");
  }
  return { baseUrl, apiKey, instanceName };
}

export async function sendMessage(
  toNumber: string,
  message: string
): Promise<EvolutionSendMessageResponse> {
  const { baseUrl: url, apiKey: key, instanceName: instance } =
    getEvolutionConfig();

  const response = await fetch(`${url}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key
    },
    body: JSON.stringify({
      number: toNumber,
      text: message
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Evolution sendMessage failed: ${response.status} ${text}`);
  }

  return (await response.json()) as EvolutionSendMessageResponse;
}
