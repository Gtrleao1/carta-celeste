-- Blog: posts escritos no painel admin (editor visual) e imagens no Storage.
--
-- * `posts`: o texto fica em `content` (JSON do editor, só com os blocos que o
--   site sabe desenhar). Visitantes leem só posts publicados e já na hora de
--   publicação; escrever é só pelo servidor (service role), depois de
--   `requireAdmin()`.
-- * Bucket `blog`: público para leitura (as imagens aparecem nos posts). Os
--   envios passam pelo servidor, que confere o admin, o tipo e o tamanho.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null check (char_length(title) between 1 and 200),
  excerpt text not null default '' check (char_length(excerpt) <= 400),
  cover_url text,
  cover_alt text not null default '',
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_published_idx on public.posts (published_at desc)
  where status = 'published';

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

alter table public.posts enable row level security;

create policy "posts: publicados são públicos"
  on public.posts for select
  to anon, authenticated
  using (status = 'published' and published_at <= now());

revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant all on public.posts to service_role;

-- Imagens do blog (leitura pública; escrita só pelo servidor).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog',
  'blog',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;
