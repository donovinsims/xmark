create table vault_items (
  user_id text not null references "user"(id),
  post_id text not null,
  extracted_at bigint not null,
  result jsonb not null,
  favorite boolean not null default false,
  trashed boolean not null default false,
  primary key (user_id, post_id)
);

create index vault_items_timeline
  on vault_items (user_id, trashed, extracted_at desc, post_id desc);
