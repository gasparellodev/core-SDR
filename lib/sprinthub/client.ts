import type { SprintHubLead, SprintHubStageUpdate } from "@/lib/sprinthub/types";

const baseUrl = process.env.SPRINTHUB_API_URL;
const apiKey = process.env.SPRINTHUB_API_KEY;

function getConfig() {
  if (!baseUrl || !apiKey) {
    throw new Error("SprintHub config missing");
  }
  return { baseUrl, apiKey };
}

export async function upsertLead(
  lead: Omit<SprintHubLead, "id">
): Promise<SprintHubLead> {
  const { baseUrl: url, apiKey: key } = getConfig();
  const response = await fetch(`${url}/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(lead)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SprintHub upsertLead failed: ${response.status} ${text}`);
  }
  return (await response.json()) as SprintHubLead;
}

export async function updateStage(payload: SprintHubStageUpdate): Promise<void> {
  const { baseUrl: url, apiKey: key } = getConfig();
  const response = await fetch(`${url}/leads/${payload.leadId}/stage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SprintHub updateStage failed: ${response.status} ${text}`);
  }
}
