import { google } from 'googleapis';

// ─── Google Sheets Client ─────────────────────────────
function getSheetsClient() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!credentials || !spreadsheetId) return null;

  try {
    const parsed = JSON.parse(credentials);
    const auth = new google.auth.GoogleAuth({
      credentials: parsed,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId };
  } catch {
    return null;
  }
}

// ─── In-Memory Store (fallback / demo mode) ───────────
let memoryStore: {
  settings: Record<string, string>;
  students: Record<string, string>[];
  admins: Record<string, string>[];
  logs: Record<string, string>[];
} = {
  settings: {
    appName: 'Pengumuman Kelulusan',
    schoolName: 'SMA Negeri 1 Contoh',
    logoUrl: '',
    announcementDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
    runningText: 'Selamat datang di Portal Pengumuman Kelulusan. Masukkan NISN untuk mengecek hasil kelulusan Anda.',
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    enableQR: 'true',
    enableConfetti: 'true',
    footerText: 'SMA Negeri 1 Contoh',
  },
  students: [
    { NISN: '0012345678', NIS: '12345', Nama: 'Budi Santoso', Kelas: 'XII IPA 1', Status: 'LULUS', Pesan: 'Selamat! Anda dinyatakan lulus dengan baik.', LinkSKL: '' },
    { NISN: '0012345679', NIS: '12346', Nama: 'Siti Aminah', Kelas: 'XII IPS 2', Status: 'LULUS', Pesan: 'Selamat atas kelulusan Anda!', LinkSKL: '' },
    { NISN: '0012345680', NIS: '12347', Nama: 'Ahmad Rizki', Kelas: 'XII IPA 2', Status: 'TIDAK LULUS', Pesan: 'Tetap semangat. Perjuanganmu belum berakhir.', LinkSKL: '' },
    { NISN: '0012345681', NIS: '12348', Nama: 'Dewi Lestari', Kelas: 'XII IPS 1', Status: 'LULUS', Pesan: 'Selamat! Hasil kerja kerasmu membuahkan hasil.', LinkSKL: '' },
    { NISN: '0012345682', NIS: '12349', Nama: 'Rendi Pratama', Kelas: 'XII IPA 1', Status: 'LULUS', Pesan: 'Lulus dengan predikat baik. Terus berkembang!', LinkSKL: '' },
  ],
  admins: [
    { Username: 'admin', Password: 'admin123', Nama: 'Administrator', Role: 'superadmin' },
  ],
  logs: [],
};

// ─── Public API ───────────────────────────────────────

export async function getSettings() {
  const client = getSheetsClient();
  if (!client) return memoryStore.settings;

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: 'Pengaturan!A:B',
    });
    const rows = res.data.values || [];
    const settings: Record<string, string> = {};
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] && rows[i][1] !== undefined) {
        settings[rows[i][0]] = rows[i][1];
      }
    }
    return Object.keys(settings).length > 0 ? settings : memoryStore.settings;
  } catch {
    return memoryStore.settings;
  }
}

export async function saveSettings(settings: Record<string, string>) {
  const client = getSheetsClient();
  if (!client) {
    memoryStore.settings = { ...memoryStore.settings, ...settings };
    return { success: true, message: 'Pengaturan disimpan (demo mode).' };
  }

  try {
    const existing = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: 'Pengaturan!A:B',
    });
    const rows = existing.data.values || [];
    const keyMap: Record<string, number> = {};
    for (let i = 1; i < rows.length; i++) {
      keyMap[rows[i][0]] = i;
    }

    const updates: Promise<unknown>[] = [];
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'stats') continue;
      if (keyMap[key] !== undefined) {
        updates.push(
          client.sheets.spreadsheets.values.update({
            spreadsheetId: client.spreadsheetId,
            range: `Pengaturan!B${keyMap[key] + 1}`,
            valueInputOption: 'RAW',
            requestBody: { values: [[value]] },
          })
        );
      } else {
        updates.push(
          client.sheets.spreadsheets.values.append({
            spreadsheetId: client.spreadsheetId,
            range: 'Pengaturan!A:B',
            valueInputOption: 'RAW',
            requestBody: { values: [[key, value]] },
          })
        );
      }
    }
    await Promise.all(updates);
    return { success: true, message: 'Pengaturan berhasil disimpan!' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: 'Gagal menyimpan: ' + msg };
  }
}

export async function checkKelulusan(nisn: string) {
  if (!nisn || nisn.trim() === '') {
    return { success: false, message: 'NISN tidak boleh kosong.' };
  }

  nisn = nisn.trim();
  const client = getSheetsClient();

  let students: Record<string, string>[];

  if (client) {
    try {
      const res = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: 'DataSiswa!A:G',
      });
      const rows = res.data.values || [];
      if (rows.length <= 1) return { success: false, message: 'Data siswa belum tersedia.' };

      const headers = rows[0].map((h: string) => h.toLowerCase().trim());
      students = [];
      for (let i = 1; i < rows.length; i++) {
        const obj: Record<string, string> = {};
        headers.forEach((h: string, idx: number) => {
          obj[h] = rows[i][idx] || '';
        });
        students.push(obj);
      }
    } catch {
      students = memoryStore.students;
    }
  } else {
    students = memoryStore.students;
  }

  // Normalize headers
  const student = students.find(s => {
    const sNisn = (s.NISN || s.nisn || '').trim();
    return sNisn === nisn;
  });

  if (!student) {
    return { success: false, message: `NISN "${nisn}" tidak ditemukan.` };
  }

  const data = {
    nama: student.Nama || student.nama || '-',
    nisn: student.NISN || student.nisn || nisn,
    nis: student.NIS || student.nis || '-',
    kelas: student.Kelas || student.kelas || '-',
    status: student.Status || student.status || '-',
    pesan: student.Pesan || student.pesan || '-',
    linkSKL: student.LinkSKL || student.linkskl || '',
  };

  // Log
  await logActivity(nisn, data.nama, data.status);

  return { success: true, data };
}

export async function getStatistics() {
  const client = getSheetsClient();
  let students: Record<string, string>[];

  if (client) {
    try {
      const res = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: 'DataSiswa!A:G',
      });
      const rows = res.data.values || [];
      if (rows.length <= 1) return { total: 0, lulus: 0, tidakLulus: 0, persentase: 0, perKelas: {} };

      const headers = rows[0].map((h: string) => h.toLowerCase().trim());
      students = [];
      for (let i = 1; i < rows.length; i++) {
        const obj: Record<string, string> = {};
        headers.forEach((h: string, idx: number) => {
          obj[h] = rows[i][idx] || '';
        });
        students.push(obj);
      }
    } catch {
      students = memoryStore.students;
    }
  } else {
    students = memoryStore.students;
  }

  let total = 0, lulus = 0, tidakLulus = 0;
  const perKelas: Record<string, { total: number; lulus: number; tidakLulus: number }> = {};

  for (const s of students) {
    const status = (s.Status || s.status || '').toUpperCase().trim();
    const kelas = s.Kelas || s.kelas || 'Unknown';
    if (!status) continue;

    total++;
    if (!perKelas[kelas]) perKelas[kelas] = { total: 0, lulus: 0, tidakLulus: 0 };
    perKelas[kelas].total++;

    if (status === 'LULUS') {
      lulus++;
      perKelas[kelas].lulus++;
    } else {
      tidakLulus++;
      perKelas[kelas].tidakLulus++;
    }
  }

  return {
    total,
    lulus,
    tidakLulus,
    persentase: total > 0 ? Math.round((lulus / total) * 100) : 0,
    perKelas,
  };
}

export async function verifyAdmin(username: string, password: string) {
  const client = getSheetsClient();
  let admins: Record<string, string>[];

  if (client) {
    try {
      const res = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: 'Admin!A:D',
      });
      const rows = res.data.values || [];
      const headers = rows[0]?.map((h: string) => h.toLowerCase().trim()) || [];
      admins = [];
      for (let i = 1; i < rows.length; i++) {
        const obj: Record<string, string> = {};
        headers.forEach((h: string, idx: number) => {
          obj[h] = rows[i][idx] || '';
        });
        admins.push(obj);
      }
    } catch {
      admins = memoryStore.admins;
    }
  } else {
    admins = memoryStore.admins;
  }

  const admin = admins.find(a => {
    const aUser = (a.Username || a.username || '').trim();
    const aPass = (a.Password || a.password || '').trim();
    return aUser === username && aPass === password;
  });

  if (admin) {
    return {
      success: true,
      message: 'Login berhasil!',
      role: admin.Role || admin.role || 'admin',
      adminName: admin.Nama || admin.name || username,
    };
  }

  return { success: false, message: 'Username atau password salah.' };
}

export async function logActivity(nisn: string, nama: string, status: string) {
  const client = getSheetsClient();
  const entry = {
    Timestamp: new Date().toISOString(),
    NISN: nisn,
    Nama: nama,
    Status: status,
  };

  if (client) {
    try {
      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: 'LogAktivitas!A:D',
        valueInputOption: 'RAW',
        requestBody: { values: [[entry.Timestamp, nisn, nama, status]] },
      });
    } catch { /* silent */ }
  }

  memoryStore.logs.unshift(entry);
  if (memoryStore.logs.length > 200) memoryStore.logs.pop();
}

export async function getActivityLog() {
  const client = getSheetsClient();

  if (client) {
    try {
      const res = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: 'LogAktivitas!A:D',
      });
      const rows = res.data.values || [];
      const logs = [];
      const start = Math.max(1, rows.length - 100);
      for (let i = rows.length - 1; i >= start; i--) {
        logs.push({
          timestamp: rows[i][0] || '-',
          nisn: rows[i][1] || '-',
          nama: rows[i][2] || '-',
          status: rows[i][3] || '-',
        });
      }
      return { success: true, data: logs, total: rows.length - 1 };
    } catch {
      // fallthrough to memory
    }
  }

  return {
    success: true,
    data: memoryStore.logs.slice(0, 100).map(l => ({
      timestamp: new Date(l.Timestamp).toLocaleString('id-ID'),
      nisn: l.NISN,
      nama: l.Nama,
      status: l.Status,
    })),
    total: memoryStore.logs.length,
  };
}
