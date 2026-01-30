create table if not exists sdr_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text unique not null,
  email text not null,
  instagram text not null,
  renda text not null,
  objetivo text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists sdr_conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references sdr_leads(id),
  lead_whatsapp text unique not null,
  lead_name text not null,
  lead_email text not null,
  lead_instagram text not null,
  lead_renda text not null,
  current_step text not null,
  conversation_data jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  sprinthub_lead_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists sdr_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references sdr_conversations(id),
  direction text not null,
  content text not null,
  step text not null,
  created_at timestamp with time zone default now()
);

create table if not exists sdr_qualification_data (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid unique references sdr_conversations(id),
  motivacao text,
  objetivo_principal text,
  objetivos_extras text[],
  situacao_atual text,
  prioridade text,
  capacidade_investimento boolean,
  decisao_final text,
  created_at timestamp with time zone default now()
);

create table if not exists sdr_conversation_steps (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references sdr_conversations(id),
  step text not null,
  direction text not null,
  content text,
  created_at timestamp with time zone default now()
);

create table if not exists sdr_message_queue (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references sdr_conversations(id),
  direction text not null,
  content text not null,
  step text not null,
  status text not null default 'pending',
  created_at timestamp with time zone default now(),
  sent_at timestamp with time zone
);
