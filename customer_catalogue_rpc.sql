-- CETAKNOW CORP - Public Customer Catalogue RPC
-- Run this SQL once in Supabase > SQL Editor.
-- The function exposes only customer-safe fields. It never returns supplier,
-- internal notes, product_financials, or product_price_tier_financials data.

create or replace function public.get_customer_catalogue()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'code', p.code,
        'category', p.category,
        'moq', p.moq,
        'specifications', p.specifications,
        'image_url', p.image_url,
        'lead_time', p.lead_time,
        'price_tiers', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', t.id,
              'bag_type', t.bag_type,
              'printing_method', t.printing_method,
              'printing_size', t.printing_size,
              'quantity_min', t.quantity_min,
              'quantity_max', t.quantity_max,
              'selling_price', t.selling_price
            )
            order by t.bag_type, t.printing_method, t.printing_size, t.quantity_min
          )
          from public.product_price_tiers t
          where t.product_id = p.id
        ), '[]'::jsonb),
        'reference_images', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'image_url', r.image_url,
              'image_type', r.image_type,
              'caption', r.caption
            )
            order by r.created_at desc
          )
          from public.product_reference_images r
          where r.product_id = p.id
        ), '[]'::jsonb)
      )
      order by p.name
    ),
    '[]'::jsonb
  )
  from public.products p;
$$;

revoke all on function public.get_customer_catalogue() from public;
grant execute on function public.get_customer_catalogue() to anon, authenticated;

comment on function public.get_customer_catalogue() is
'Returns the public customer catalogue. Excludes supplier information, internal notes and all cost/margin data.';
