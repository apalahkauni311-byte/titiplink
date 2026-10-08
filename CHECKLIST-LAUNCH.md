# CHECKLIST LAUNCH — Titiplink

Status saat paket dibuat: **NO-GO / BELUM SIAP LAUNCH**.

- [ ] Implementasikan adapter frontend: hapus semua localStorage untuk data akun/titipan/laporan/iklan/tombol video dan gunakan API.
- [ ] Hapus semua seed/demo, akun sinta/budi, titipan contoh, laporan palsu, kata sandi admin123, dan panel preview dari UI produksi.
- [ ] Bootstrap admin satu kali dengan ADMIN_EMAIL/ADMIN_PASSWORD via secret; tidak ada kredensial hardcode.
- [ ] Implementasikan semua API list/detail/create/edit/delete dan otorisasi pemilik/admin.
- [ ] Terapkan CSRF untuk seluruh mutasi, termasuk logout dan laporan; audit session expiry/logout.
- [ ] Tambahkan domain terlarang CRUD + pemeriksaan server yang benar (hostname parsing, bukan substring).
- [ ] Tambahkan slug collision retry, dedupe view counter, TTL dan cleanup test.
- [ ] Terapkan halaman password unlock tanpa bocor konten, noindex headers/meta, rate limit durable.
- [ ] Sambungkan konfigurasi ads/video dari KV ke frontend dan render format banner/native/directlink/custom/popunder/social bar secara aman.
- [ ] Implementasikan CSP allowlist host iklan admin; validasi semua script src HTTPS.
- [ ] Tambahkan sitemap dinamis titipan publik, 404/offline/error page, meta SEO/OG per titipan.
- [ ] Jalankan `npm install`, `npm run check`, `npm test`, `npx wrangler dev`, uji API dan Playwright end-to-end.
- [ ] Bandingkan seluruh event handler v8: Play, Download HD, Download Video, pola dua klik dan mode gerbang. Tidak boleh mengubah logikanya.
- [ ] Jalankan audit dependency (`npm audit`) dan scan rahasia.
- [ ] Uji di staging dengan publisher test account; verifikasi iklan nyata, batas jaringan iklan dan batas Cloudflare.
- [ ] Baru setelah seluruh kotak selesai: deploy, pasang domain, cek HTTPS, cookie, CSP, D1/KV, cron, ads.txt dan monitoring.
