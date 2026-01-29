# Plano de Desenvolvimento - IA SDR CORE + Evolution API

## Objetivo do documento
Descrever de forma operacional o desenvolvimento do agente de IA SDR no WhatsApp,
integrado a Evolution API e CRM, seguindo o fluxo de qualificacao definido.
O foco e atendimento humanizado, linguagem natural, sem parecer automacao.

## Escopo
- Receber leads desqualificados por renda (<= R$4.000) e iniciar fluxo por IA.
- Conduzir conversa com etapas fixas, sem pular etapas.
- Qualificar com base nas respostas (nao apenas renda).
- Decidir por UMA saida: Closer ou SDR/Erupcao.
- Atualizar CRM a cada avanço de etapa.

## Premissas e regras
- Uma pergunta por vez.
- Sempre validar a resposta do lead antes de avancar.
- Sem frases roboticas; tom humano e direto.
- Decisoes baseadas nas respostas do lead.
- Leadscoring e apenas referencia, nao regra rigida.

## Entrada do fluxo
Leads com renda ate R$4.000 entram automaticamente no fluxo de IA no WhatsApp.
Nao devem ser descartados.

### Payload de entrada (exemplo)
```json
{
  "name": "Bruno Henrique Lopes",
  "whatsapp": "5555359973097",
  "email": "bruninholopes1997@hotmail.com",
  "instagram": "@bruninhosagui",
  "renda": "De R$2.501,00 ate R$4.500,00"
}
```

## Saidas possiveis
### Opcao A - Qualificado para Diagnostico (Closer)
- Prioridade alta
- Intencao clara de investir
- Aceita faixa media de investimento
Acao: enviar link da agenda do Closer e atualizar CRM.

### Opcao B - Qualificado para Raio-X (SDR) / Erupcao
- Quer ajuda ou acompanhamento mais leve
- Ainda nao pronto para Closer
Acao: enviar link SDR ou produto Erupcao, conforme resposta.

## Fluxo conversacional (script)
### 4.1 Abertura
Boa tarde, {{nome}}! Tudo bem?
Eu me chamo {{nome_IA}} e faco parte da equipe do Elias Maman.
Vi que voce preencheu nosso formulario com interesse em participar de uma call de diagnostico do seu Instagram.
Pra dar sequencia certinho, preciso te fazer algumas perguntas rapidas pra entender se esse diagnostico faz sentido pra voce agora. Pode ser?

### 4.2 Motivacao
Perfeito.
Olhando seu formulario aqui, o que mais te chamou a atencao pra se inscrever com a gente?
(validar resposta antes de seguir)
Legal, {{nome}}.
Essa conversa e importante justamente pra mapear pontos estrategicos que podem ajudar seu perfil a destravar crescimento.

### 4.3 Confirmacao de perfil
So confirmando: esse e o seu perfil do Instagram mesmo? {{@perfil}}

### 4.4 Objetivo principal
Vi aqui que seu principal objetivo hoje e {{objetivo_forms}}.
Além disso, tem mais alguma coisa que hoje seria importante pra voce?
Exemplo: autoridade, audiencia, seguidores qualificados, engajamento…

### 4.5 Situacao atual
Hoje tem alguem cuidando do seu Instagram ou alguma estrategia ja em andamento?

### 4.6 Prioridade real
{{nome}}, antes de avancarmos, preciso ser bem direto.
O quanto faz sentido pra voce comecar de verdade um projeto serio no Instagram?
Isso e uma prioridade pra voce agora?

### 4.7 Capacidade de investimento
Entendendo que isso e uma prioridade pra voce, preciso te fazer uma pergunta importante.
Hoje, voce estaria disposto(a) a investir financeiramente pra destravar esse projeto?
Trabalhamos com programas de acompanhamento e, em media, o investimento gira em torno de R$3.000 por mes.
Isso e algo que hoje estaria dentro da sua realidade?

## Logica de decisao (alta nivel)
1) Se nao tem capacidade de investimento agora:
   - Perguntar: aprender ou acompanhamento?
   - Se APRENDER: direcionar para Erupcao / Raio-X (SDR).
   - Se ACOMPANHAMENTO: direcionar para SDR.
   - Atualizar CRM com a escolha.
2) Se tem capacidade de investimento:
   - Explicar diagnostico e pedir confirmacao.
   - Direcionar para agenda do Closer.
   - Atualizar CRM.

## Leadscoring (referencia)
Usar apenas como norte, nao como regra rigida.
Base: https://docs.google.com/spreadsheets/d/1XFHn1VSVBHFc_WlNF6DHf6XL9sqrkrgtlchgxR9FyI4/edit?usp=sharing
Regra aproximada: >= 80 pontos indica alta qualificacao.

### Estrutura sugerida de leadscoring (nao vinculante)
- Perfil e contexto: nicho, clareza de objetivo, consistencia no perfil.
- Dor/urgencia: dor declarada, urgencia percebida, prioridade real.
- Recursos: disponibilidade de tempo, abertura para investimento.
- Intencao: desejo explicito de resultado, abertura para ajuda externa.
- Aderencia: alinhamento com proposta, interesse em diagnostico.

### Como usar no fluxo
- Calcular score ao longo das respostas, sem travar etapas.
- Usar apenas como sinal auxiliar para reforcar decisao.
- Caso score alto e respostas conflitem, prevalece a conversa.

## Arquitetura proposta (Next.js App Router)
```
core-sdr/
├── app/
│   ├── api/
│   │   ├── webhook/
│   │   │   └── evolution/
│   │   │       └── route.ts
│   │   ├── leads/
│   │   │   └── route.ts
│   │   └── messages/
│   │       └── route.ts
│   └── layout.tsx
├── lib/
│   ├── ai/
│   │   ├── agent.ts
│   │   ├── prompts.ts
│   │   └── decision.ts
│   ├── conversation/
│   │   ├── state.ts
│   │   └── flow.ts
│   ├── evolution/
│   │   ├── client.ts
│   │   └── types.ts
│   ├── sprinthub/
│   │   ├── client.ts
│   │   └── types.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── schema.sql
│   └── utils/
│       └── validation.ts
└── types/
    └── index.ts
```

## Endpoints e webhooks
### POST /api/leads
Responsavel por receber novos leads e iniciar a conversa.
Passos:
- Validar payload.
- Criar/atualizar registro no Supabase.
- Criar/atualizar lead no CRM.
- Enviar mensagem inicial pela Evolution API.
- Inicializar estado da conversa (step = abertura).

### POST /api/webhook/evolution
Recebe eventos da Evolution API (ex.: MESSAGES_UPSERT).
Passos:
- Validar assinatura (se suportado).
- Identificar lead pelo numero.
- Buscar estado da conversa no Supabase.
- Processar mensagem no agente.
- Atualizar estado e historico.
- Enviar resposta via Evolution API.
- Atualizar CRM conforme etapa.

#### Eventos recomendados
- MESSAGES_UPSERT: mensagens recebidas.
- MESSAGES_UPDATE: entrega/leitura (opcional, para log).

#### Assinatura do webhook (proposta)
- Criar segredo compartilhado: EVOLUTION_WEBHOOK_SECRET.
- Enviar header: X-Evolution-Signature.
- Calcular HMAC SHA256 do body bruto.
- Comparar assinatura com tempo constante.

##### Exemplo de verificacao (descricao)
1) Obter body bruto da requisicao (string).
2) Gerar hash: HMAC_SHA256(body, secret).
3) Comparar com header X-Evolution-Signature.
4) Se falhar, retornar 401 e logar tentativa.

#### Exemplo de payload (MESSAGES_UPSERT)
```json
{
  "event": "MESSAGES_UPSERT",
  "instance": "sdr-whatsapp-01",
  "timestamp": "2026-01-29T18:22:10.000Z",
  "data": {
    "key": {
      "remoteJid": "5555359973097@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0C5D4A1B2C3D4E5F6"
    },
    "message": {
      "conversation": "Quero entender como funciona o diagnostico."
    },
    "pushName": "Bruno Henrique",
    "messageTimestamp": 1769710930
  }
}
```

### POST /api/messages (opcional)
Endpoint auxiliar para envio manual de mensagens.

## Modelo de dados (Supabase)
### conversations
- id (uuid, PK)
- lead_whatsapp (text, unique)
- lead_name (text)
- lead_email (text)
- lead_instagram (text)
- lead_renda (text)
- current_step (text)
- conversation_data (jsonb)
- status (text) - active, completed, qualified_closer, qualified_sdr
- sprinthub_lead_id (text)
- created_at (timestamp)
- updated_at (timestamp)

### messages
- id (uuid, PK)
- conversation_id (uuid, FK)
- direction (text) - inbound/outbound
- content (text)
- step (text)
- created_at (timestamp)

### qualification_data
- id (uuid, PK)
- conversation_id (uuid, FK)
- motivacao (text)
- objetivo_principal (text)
- objetivos_extras (text[])
- situacao_atual (text)
- prioridade (text) - alta/media/baixa
- capacidade_investimento (boolean)
- decisao_final (text) - closer/sdr/erupcao
- created_at (timestamp)

## Estado e validacao do fluxo
- Cada etapa exige validacao de resposta antes de avancar.
- Se resposta for vaga, IA deve pedir esclarecimento.
- Nao avancar se o lead nao respondeu a pergunta atual.
- Registrar respostas em conversation_data.

## Integrações externas
### Evolution API
Funcoes:
- sendMessage(instance, number, message)
- getInstanceStatus(instance)

### SprintHub (CRM)
Funcoes:
- upsertLead(dados)
- updateStage(leadId, etapa)
- addNote(leadId, texto)
- createOpportunity(leadId) quando qualificado

## Variaveis de ambiente
```
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=
EVOLUTION_WEBHOOK_SECRET=
SPRINTHUB_API_URL=
SPRINTHUB_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY= (ou ANTHROPIC_API_KEY)
NEXT_PUBLIC_APP_URL=
CLOSER_AGENDA_LINK=
SDR_AGENDA_LINK=
ERUPCAO_LINK=
```

## Seguranca e validacoes
- Validacao de assinatura do webhook.
- Sanitizacao de inputs.
- Rate limiting por IP/numero.
- Logs de auditoria.
- Retry com backoff para falhas externas.

## Monitoramento e logs
- Log de todas as mensagens.
- Log de decisoes de qualificacao.
- Metricas por etapa (conversao).
- Alertas para falhas de integracao.

## Testes
- Unitarios para decisao e validacao.
- Integracao para webhooks.
- E2E do fluxo completo.
- Testes de prompts (respostas esperadas).

## Roadmap de implementacao (macro)
1) Infra e base do projeto (Next.js, Supabase, variaveis).
2) Integracao Evolution API (cliente + webhook).
3) Integracao CRM (cliente + atualizacoes).
4) Core do agente (prompts + fluxo + validacao).
5) Persistencia e historico (Supabase).
6) Observabilidade e retries.
7) Testes e QA.

