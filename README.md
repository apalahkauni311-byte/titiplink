# Titiplink Worker — migrasi awal (BELUM SIAP LAUNCH)

Paket ini dibuat dari `titiplink-preview-v8.html`. **Ini bukan paket siap launching**: UI v8 masih merupakan aplikasi preview yang memakai state lokal. File itu disertakan apa adanya sebagai `public/index.html` dan `ORIGINAL-v8.html` untuk menjaga desain dan menyediakan pembanding. Lapisan UI belum dihubungkan ke endpoint API; oleh karena itu jangan deploy sebagai produksi dan jangan memasukkan kredensial atau kode publisher sungguhan.

## Status implementasi

Sudah disiapkan: struktur Worker ES module, binding D1/KV/Static Assets, schema D1, cron pembersihan kedaluwarsa, kerangka endpoint autentikasi, hashing PBKDF2 dengan salt, cookie sesi, endpoint konfigurasi iklan/video yang dibatasi admin, password titipan diperiksa server sebelum isi dikirim, rate-limit KV dasar, reports, robots/manifest/favicon, dan pengujian unit helper.

Belum selesai / launch blocker:
- Frontend v8 belum dimigrasikan dari `localStorage` ke `fetch`; fungsi tombol/gerbang masih hanya terjamin dalam file original, belum teruji dalam integrasi backend.
- Akun admin bootstrap dari `ADMIN_EMAIL`/`ADMIN_PASSWORD` belum diimplementasikan. Jangan menganggap environment variable tersebut otomatis membuat admin.
- API edit/hapus/list titipan, dashboard admin lengkap, domain terlarang CRUD, sitemap dinamis, hitungan kunjungan deduplikasi, mekanisme noindex pada HTML, dan validasi/normalisasi URL penuh belum selesai.
- CSP saat ini baseline ketat; allowlist skrip iklan per host belum dibangun. Script iklan belum terintegrasi dengan backend.
- CSRF token perlu disediakan melalui alur frontend; saat ini endpoint mutasi mengharuskan header `X-CSRF-Token`.
- Tidak ada uji browser Playwright yang berhasil dijalankan dan tidak ada uji tayangan iklan nyata.

## Persiapan lokal

1. Install Node.js LTS di komputer/lingkungan kerja.
2. `npm install`
3. `npx wrangler login`
4. Buat D1: `npx wrangler d1 create titiplink-db`, salin `database_id` ke `wrangler.toml`.
5. Buat KV: `npx wrangler kv namespace create CONFIG`, salin ID ke `wrangler.toml`.
6. Terapkan schema: `npx wrangler d1 migrations apply titiplink-db --local`, lalu `npx wrangler d1 migrations apply titiplink-db --remote`.
7. Salin `.dev.vars.example` menjadi `.dev.vars`, isi secret kuat. Jangan commit file `.dev.vars`.
8. Jalankan pemeriksaan `npm run check` dan `npm test`.
9. `npm run dev` untuk inspeksi lokal.
10. **Jangan deploy ke domain produksi sebelum semua launch blocker di atas ditutup.** Setelah lulus, `npm run deploy`, lalu atur custom domain melalui Cloudflare Dashboard > Workers & Pages > worker > Settings > Domains & Routes.

## Iklan / CSP

Konfigurasi skrip iklan belum terhubung ke UI. Sebelum produksi, admin harus dapat mengatur host HTTPS yang diizinkan dan CSP `script-src` harus disusun dari allowlist tersebut; jangan memakai `unsafe-eval` atau mengizinkan semua host. Kode Custom HTML/JS harus tetap dalam iframe sandbox tanpa `allow-same-origin`. Jangan menguji skrip publisher asli di lingkungan lokal yang dipercaya.

## Yang perlu Anda isi nanti

- Domain produksi dan nama Worker.
- D1 database ID dan KV namespace ID.
- Email admin dan password admin yang kuat; mekanisme bootstrap admin masih harus dibuat.
- `SESSION_SECRET` setelah alur rotasi/validasi secret diimplementasikan.
- Kode publisher (Adsterra, Monetag, dan jaringan lain) setelah CSP/renderer siap.
- Isi `ads.txt` yang diberikan jaringan iklan.
- Host skrip HTTPS resmi yang akan dimasukkan ke CSP.

## Catatan pengujian

Unit test hanya menguji helper password/token/sanitasi. Test bukan bukti seluruh API atau browser flow berfungsi. Perilaku tombol Play, Download HD, Download Video, dua klik gerbang, native ads, popunder, social bar, batas halaman/sesi dan pencegahan script reload belum diverifikasi terhadap versi produksi. Tayangan iklan nyata dan kebijakan jaringan iklan tidak dapat diverifikasi sebelum deploy dan pengujian dengan akun publisher sendiri.
