# CETAKNOW CORP – Customer Catalogue Website

Website kedua untuk pelanggan. Ia berasingan daripada website dalaman Admin/Staff tetapi menggunakan Supabase project yang sama.

## Ciri-ciri
- Public catalogue tanpa login.
- Premium navy/blue corporate appearance.
- Carian produk dan tapisan kategori.
- Product detail modal dengan spesifikasi, MOQ, lead time dan galeri rujukan.
- Kalkulator indicative price berdasarkan jenis item, printing, saiz dan kuantiti.
- Butang WhatsApp untuk meminta quotation.
- Tiada paparan nama/nombor supplier, nota supplier, modal, kos, margin atau data dalaman.

## Keselamatan data
- Browser menggunakan Supabase publishable key sahaja.
- Website membaca katalog melalui RPC `get_customer_catalogue()`.
- RPC hanya memulangkan field customer-safe yang dinyatakan dalam SQL.
- RPC tidak memulangkan `supplier_name`, `supplier_phone`, `supplier_notes`, `product_financials`, `product_price_tier_financials`, `cost_price` atau margin.
- Tiada service_role key digunakan di frontend.
- Produk dan imej rujukan dibaca sahaja; website customer tidak mempunyai fungsi insert/update/delete.

## Setup wajib sebelum deploy
1. Buka Supabase Dashboard > SQL Editor.
2. Jalankan `supabase/customer_catalogue_rpc.sql` sekali.
3. Pastikan migration harga (`product_price_tiers`) dan galeri (`product_reference_images`) telah pun dijalankan.
4. Semak hasil RPC dengan:
   `select public.get_customer_catalogue();`
5. Dalam `app.js`, tetapkan `WHATSAPP_NUMBER` kepada nombor rasmi CETAKNOW CORP dalam format antarabangsa tanpa tanda `+`, contoh format `60123456789`. Jangan gunakan nombor contoh; masukkan nombor rasmi sendiri.
6. Upload folder ini ke repository GitHub berasingan, atau import sebagai projek Vercel baharu. Jangan replace repository website internal.
7. Deploy sebagai projek Vercel berasingan. Sambungkan domain customer apabila domain tersedia.

## Nota harga
Harga dipaparkan sebagai harga indikatif. Harga seunit dan jumlah dikira daripada tier harga jual yang telah direkodkan. Harga akhir perlu disahkan melalui quotation rasmi.

## Penting
Fungsi RPC ini mengandaikan jadual sedia ada `products`, `product_price_tiers` dan `product_reference_images`, serta lajur seperti yang digunakan oleh website internal CETAKNOW CORP. Jalankan SQL dan uji RPC sebelum deploy frontend.
