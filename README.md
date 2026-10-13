# Mini Ticket Tracker

Website pencatat tiket service desk (HTML + CSS + JavaScript, tanpa library).

## Cara menjalankan di Visual Studio Code
1. Ekstrak file ZIP, lalu buka folder `mini-ticket-tracker` di VS Code (File > Open Folder).
2. Install extension **Live Server** (Ritwick Dey) dari tab Extensions (Ctrl+Shift+X).
3. Klik kanan `index.html` > **Open with Live Server**. Browser terbuka otomatis.
   (Alternatif: klik dua kali `index.html` di File Explorer.)

## Struktur file
- `index.html` : struktur halaman (form, filter, tabel)
- `style.css`  : tampilan, palette, responsive
- `script.js`  : logika (validasi, filter, edit, localStorage, CSV)

## Font & Palette
- Font: Inter, karena huruf jelas dan mudah dibaca di ukuran 14-16px, baik di laptop maupun HP.
- Warna utama: Navy #1F3A5F, Biru muda #E8EEF6, Putih #FFFFFF.
- Warna status: hijau = OK, kuning = Warning, merah = Error.

## Fitur
Level 1: form, validasi (wajib & duplikat), tabel + badge, hapus, filter status + prioritas, reset.
Level 2: edit, localStorage, pencarian, ringkasan, pengurutan.
Level 3: catatan/log per tiket, export CSV.

Tambahan: pop up solusi saat status diubah menjadi Resolved, serta tab Semua / Tiket Aktif / Tiket Selesai.
Tombol Export CSV menghasilkan file Excel (.xlsx) berwarna seperti di web (library ExcelJS dari CDN, perlu internet). Jika offline, otomatis mengunduh CSV biasa.
