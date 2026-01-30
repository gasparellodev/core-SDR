import type { ConversationState, ConversationStep } from "@/types";

type LlmReply = {
  valid: boolean;
  reply: string;
  extracted?: Record<string, unknown>;
};

type Provider = "openai" | "anthropic";

function getProvider(): Provider | null {
  const value = process.env.AI_PROVIDER?.toLowerCase();
  if (value === "openai" || value === "anthropic") return value;
  return null;
}

function buildSystemPrompt(): string {
  return (
    "Voce e o SDR IA da Core, com atendimento humano, natural e direto. " +
    "Fale como um humano real, sem parecer automacao. " +
    "Sempre uma pergunta por vez. " +
    "Valide a resposta antes de avancar. " +
    "Siga o fluxo por etapas, sem pular. " +
    "Responda no mesmo idioma do lead. " +
    "Se as perguntas estiverem em pt-BR, traduza para o idioma do lead mantendo o sentido. " +
    "Mantenha mensagens curtas (2-3 frases). " +
    "Se precisar ser mais longo, divida em trechos curtos e objetivos. " +
    "Responda apenas com JSON valido.\n\n" +
    "OBJETIVO DO ATENDIMENTO:\n" +
    "- Qualificar leads por IA no WhatsApp com linguagem humanizada.\n" +
    "- Conduzir a conversa ate o proximo passo correto no funil.\n" +
    "- Nao empurrar agendamento; qualificar bem.\n\n" +
    "ENTRADA NO FLUXO:\n" +
    "- Leads com renda ate R$4.000 entram no fluxo de IA.\n" +
    "- Eles nao sao descartados; precisam de qualificacao aprofundada.\n\n" +
    "SAIDAS POSSIVEIS (apenas UMA):\n" +
    "A) Qualificado para Diagnostico de Perfil (Closer):\n" +
    "- Prioridade alta, intencao de investir e aceita a faixa de investimento.\n" +
    "B) Qualificado para Raio-X (SDR/Erupcao):\n" +
    "- Quer ajuda, quer aprender ou acompanhamento leve, nao pronto para closer.\n\n" +
    "TOM E DIRETRIZES:\n" +
    "- Linguagem humana, clara e natural.\n" +
    "- Nada de frases roboticas.\n" +
    "- Uma pergunta por vez.\n" +
    "- Validar a resposta do lead antes de avancar.\n" +
    "- Conduzir com autoridade, sem pressao excessiva.\n\n" +
    "SCRIPT PRINCIPAL (ORDEM DAS ETAPAS):\n" +
    "1) Abertura\n" +
    "2) Motivacao\n" +
    "3) Confirmacao de Perfil\n" +
    "4) Objetivo Principal\n" +
    "5) Situacao Atual\n" +
    "6) Prioridade Real\n" +
    "7) Capacidade de Investimento\n" +
    "8) Caminho pos capacidade (aprender vs acompanhamento)\n" +
    "9) Decisao final (closer/sdr/erupcao)\n\n" +
    "DECISAO:\n" +
    "- Se tiver capacidade de investimento: direcionar para closer.\n" +
    "- Se nao tiver capacidade: perguntar se prefere aprender ou acompanhamento.\n" +
    "- Se aprender: direcionar para Erupcao.\n" +
    "- Se acompanhamento: direcionar para SDR.\n\n" +
    "MIDIA:\n" +
    "- Quando o texto do lead vier de audio/imagem/video/documento/figurinha, " +
    "trate como a mensagem do lead e responda normalmente.\n" +
    "- Se a mensagem do lead vier como 'MIDIA_SEM_TEXTO:tipo', " +
    "peca uma breve descricao do conteudo em uma unica frase curta.\n"
  );
}

function buildUserPrompt(params: {
  step: ConversationStep;
  leadName: string;
  instagram: string;
  objetivoForms?: string;
  inboundText: string;
  currentQuestion: string;
  nextQuestion: string;
}): string {
  return (
    "Etapa atual: " +
    params.step +
    "\n" +
    "Pergunta atual:\n" +
    params.currentQuestion +
    "\n\n" +
    "Mensagem do lead:\n" +
    params.inboundText +
    "\n\n" +
    "Proxima pergunta (se valido):\n" +
    params.nextQuestion +
    "\n\n" +
    "Dados do lead:\n" +
    `nome=${params.leadName}, instagram=${params.instagram}, objetivo=${params.objetivoForms ?? ""}\n\n` +
    "Tarefa:\n" +
    "- Diga se a resposta do lead e valida para avancar.\n" +
    "- Gere uma resposta humana e natural.\n" +
    "- Se valido, inclua uma confirmacao curta e a proxima pergunta.\n" +
    "- Se nao valido, faca uma pergunta de esclarecimento.\n" +
    "- Retorne JSON estrito no formato:\n" +
    '{"valid": true|false, "reply": "texto", "extracted": {"campo":"valor"}}'
  );
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.4
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${text}`);
  }
  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(system: string, user: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.4
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic error: ${response.status} ${text}`);
  }
  const json = await response.json();
  const content = json.content?.[0]?.text;
  return typeof content === "string" ? content : "";
}

export async function generateSdrReply(params: {
  state: ConversationState;
  step: ConversationStep;
  inboundText: string;
  currentQuestion: string;
  nextQuestion: string;
}): Promise<LlmReply | null> {
  const provider = getProvider();
  if (!provider) return null;

  const system = buildSystemPrompt();
  const user = buildUserPrompt({
    step: params.step,
    leadName: params.state.lead_name,
    instagram: params.state.lead_instagram,
    objetivoForms: params.state.conversation_data.objetivo_forms,
    inboundText: params.inboundText,
    currentQuestion: params.currentQuestion,
    nextQuestion: params.nextQuestion
  });

  const raw =
    provider === "openai"
      ? await callOpenAI(system, user)
      : await callAnthropic(system, user);

  try {
    const parsed = JSON.parse(raw) as LlmReply;
    if (typeof parsed.reply !== "string" || typeof parsed.valid !== "boolean") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
