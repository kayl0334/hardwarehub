begin;

alter table public.orders
  add column if not exists idempotency_key uuid,
  add column if not exists payment_method text default 'cod',
  add column if not exists payment_status text default 'pending',
  add column if not exists payment_reference text,
  add column if not exists checkout_url text,
  add column if not exists paid_at timestamptz;

create unique index if not exists orders_maya_sandbox_idempotency
  on public.orders (user_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.place_maya_sandbox_order(
  p_user_id uuid, p_idempotency_key uuid, p_shipping_address text, p_items jsonb
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  order_id uuid;
  order_total numeric;
  priced_items jsonb;
begin
  select o.id into order_id from public.orders o
    where o.user_id = p_user_id and o.idempotency_key = p_idempotency_key;
  if found then
    return order_id;
  end if;

  select sum(p.price * i.quantity),
         jsonb_agg(jsonb_build_object(
           'product_id', p.id, 'quantity', i.quantity, 'unit_price', p.price
         ))
  into order_total, priced_items
  from jsonb_to_recordset(p_items) as i(product_id bigint, quantity integer)
  join public.products p on p.id = i.product_id
  where i.quantity between 1 and 100 and p.stock >= i.quantity and p.price >= 0;

  if order_total is null or order_total <= 0
     or jsonb_array_length(priced_items) <> jsonb_array_length(p_items) then
    raise exception 'Invalid cart or insufficient stock' using errcode = 'P0001';
  end if;

  insert into public.orders (
    user_id, idempotency_key, shipping_address, total, status, payment_method, payment_status
  ) values (
    p_user_id, p_idempotency_key, p_shipping_address, round(order_total, 2), 'pending', 'maya', 'pending'
  )
  on conflict (user_id, idempotency_key) where idempotency_key is not null do nothing
  returning id into order_id;

  if order_id is null then
    select o.id into strict order_id from public.orders o
      where o.user_id = p_user_id and o.idempotency_key = p_idempotency_key;
    return order_id;
  end if;

  insert into public.order_items (order_id, product_id, quantity, unit_price)
  select order_id, i.product_id, i.quantity, i.unit_price
  from jsonb_to_recordset(priced_items) as i(product_id bigint, quantity integer, unit_price numeric);

  return order_id;
end;
$$;

create or replace function public.settle_maya_sandbox_order(
  p_order_id uuid, p_payment_reference text, p_result text
) returns void
language plpgsql set search_path = ''
as $$
declare
  saved_order public.orders%rowtype;
  unavailable boolean;
begin
  select * into saved_order from public.orders
    where id = p_order_id and payment_method = 'maya' for update;
  if not found or saved_order.payment_reference::text is distinct from p_payment_reference
     or saved_order.payment_status <> 'pending' or saved_order.status <> 'pending' then
    return;
  end if;

  if p_result in ('failed', 'cancelled') then
    update public.orders set payment_status = p_result, status = 'cancelled'
      where id = p_order_id;
    return;
  end if;

  if p_result is distinct from 'paid' then
    raise exception 'Invalid payment result';
  end if;

  perform p.id from public.products p
    join public.order_items i on i.product_id = p.id
    where i.order_id = p_order_id order by p.id for update of p;

  select exists (
    select 1 from public.order_items i
    left join public.products p on p.id = i.product_id
    where i.order_id = p_order_id and (p.stock is null or p.stock < i.quantity)
  ) into unavailable;

  if not unavailable then
    update public.products p set stock = p.stock - i.quantity
      from public.order_items i where i.order_id = p_order_id and i.product_id = p.id;
  end if;

  update public.orders set payment_status = 'paid', paid_at = now(),
    status = case when unavailable then 'pending' else 'processing' end
    where id = p_order_id;
end;
$$;

revoke all on function public.place_maya_sandbox_order(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.settle_maya_sandbox_order(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.place_maya_sandbox_order(uuid, uuid, text, jsonb) to service_role;
grant execute on function public.settle_maya_sandbox_order(uuid, text, text) to service_role;

commit;
