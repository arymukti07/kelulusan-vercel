# Cara Setup Google Sheets

## 1. Buat Google Spreadsheet baru
Buka https://sheets.new

## 2. Buat 4 Sheet (tab) dengan nama persis:
- `DataSiswa`
- `Pengaturan`
- `Admin`
- `LogAktivitas`

## 3. Isi masing-masing sheet

### Sheet: DataSiswa
Baris 1 (header): `NISN | NIS | Nama | Kelas | Status | Pesan | LinkSKL`
Baris 2+: data siswa

| NISN | NIS | Nama | Kelas | Status | Pesan | LinkSKL |
|------|-----|------|-------|--------|-------|---------|
| 0012345678 | 12345 | Budi Santoso | XII IPA 1 | LULUS | Selamat! Anda dinyatakan lulus. | |
| 0012345679 | 12346 | Siti Aminah | XII IPS 2 | LULUS | Selamat atas kelulusan Anda! | |
| 0012345680 | 12347 | Ahmad Rizki | XII IPA 2 | TIDAK LULUS | Tetap semangat. | |

**Kolom Status:** harus `LULUS` atau `TIDAK LULUS` (kapital)
**Kolom LinkSKL:** opsional, bisa link Google Drive untuk download SKL

### Sheet: Pengaturan
Baris 1 (header): `Key | Value`
Baris 2+: key-value pairs

| Key | Value |
|-----|-------|
| appName | Pengumuman Kelulusan |
| schoolName | SMA Negeri 1 Contoh |
| logoUrl | https://via.placeholder.com/150 |
| announcementDate | 2026-06-05T08:00 |
| runningText | Selamat datang di portal pengumuman kelulusan. |
| primaryColor | #3b82f6 |
| secondaryColor | #8b5cf6 |
| enableQR | true |
| enableConfetti | true |
| footerText | © 2026 SMA Negeri 1 Contoh |

**announcementDate:** format `YYYY-MM-DDTHH:MM` (tanpa detik)

### Sheet: Admin
Baris 1 (header): `Username | Password | Nama | Role`
Baris 2+: data admin

| Username | Password | Nama | Role |
|----------|----------|------|------|
| admin | admin123 | Administrator | superadmin |

### Sheet: LogAktivitas
Baris 1 (header): `Timestamp | NISN | Nama | Status`
Baris 2+: kosongkan (akan diisi otomatis oleh sistem)

## 4. Buat Service Account

1. Buka https://console.cloud.google.com/apis/credentials
2. Pilih/buat project
3. Enable Google Sheets API
4. Create Credentials → Service Account
5. Beri nama, klik Create & Continue, Done
6. Klik service account yang baru dibuat
7. Tab Keys → Add Key → Create New Key → JSON
8. Download file JSON-nya

## 5. Share Spreadsheet ke Service Account

1. Buka spreadsheet kamu
2. Klik Share
3. Paste email service account (format: `xxx@xxx.iam.gserviceaccount.com`)
4. Beri akses Editor
5. Klik Send

## 6. Ambil Spreadsheet ID

Dari URL spreadsheet:
`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_INI/edit`

Copy bagian `SPREADSHEET_ID_INI`.

## 7. Set Environment Variables di Vercel

Di Vercel dashboard → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| GOOGLE_SERVICE_ACCOUNT_JSON | (paste isi file JSON service account dalam 1 baris) |
| GOOGLE_SPREADSHEET_ID | (ID spreadsheet kamu) |

## 8. Selesai!

Deploy ulang di Vercel, dan portal sudah terkoneksi ke Google Sheets.
