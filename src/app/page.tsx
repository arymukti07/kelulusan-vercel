'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';

// ─── Types ────────────────────────────────────────────
interface Settings {
  appName?: string;
  schoolName?: string;
  logoUrl?: string;
  announcementDate?: string;
  runningText?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
}

interface StudentData {
  nama: string;
  nisn: string;
  nis: string;
  kelas: string;
  status: string;
  pesan: string;
  linkSKL: string;
}

interface Stats {
  total: number;
  lulus: number;
  tidakLulus: number;
  persentase: number;
  perKelas: Record<string, { total: number; lulus: number; tidakLulus: number }>;
}

interface LogEntry {
  timestamp: string;
  nisn: string;
  nama: string;
  status: string;
}

// ─── Particles Component ──────────────────────────────
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }[] = [];

    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);

    const reset = (p: typeof particles[0]) => {
      p.x = Math.random() * w; p.y = Math.random() * h;
      p.size = Math.random() * 2 + 0.5;
      p.speedX = (Math.random() - 0.5) * 0.5;
      p.speedY = (Math.random() - 0.5) * 0.5;
      p.opacity = Math.random() * 0.5 + 0.1;
    };

    for (let i = 0; i < 60; i++) {
      const p = { x: 0, y: 0, size: 0, speedX: 0, speedY: 0, opacity: 0 };
      reset(p);
      particles.push(p);
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.speedX; p.y += p.speedY;
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) reset(p);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.05 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

// ─── Main Page ────────────────────────────────────────
export default function Home() {
  // State
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'countdown' | 'search' | 'result' | 'admin'>('countdown');

  // Countdown
  const [cd, setCd] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Search
  const [nisn, setNisn] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<StudentData | null>(null);
  const [searchError, setSearchError] = useState('');

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // Admin
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminTab, setAdminTab] = useState<'settings' | 'stats' | 'logs'>('settings');
  const [adminForm, setAdminForm] = useState<Settings>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [saving, setSaving] = useState(false);

  // QR Modal
  const [showQR, setShowQR] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // ─── Fetch Settings ─────────────────────────────────
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.error) return;
      setSettings(data);
      setAdminForm(data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ─── Countdown ──────────────────────────────────────
  useEffect(() => {
    if (!settings.announcementDate) return;
    const target = new Date(settings.announcementDate).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setView('search');
        return;
      }
      setCd({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [settings.announcementDate]);

  // ─── Fetch Stats ────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ─── Search ─────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisn.trim()) return;
    setSearching(true);
    setSearchError('');
    setResult(null);

    try {
      const res = await fetch(`/api/check?nisn=${encodeURIComponent(nisn.trim())}`);
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setView('result');
        if (data.data.status.toUpperCase() === 'LULUS') {
          fireConfetti();
        }
      } else {
        setSearchError(data.message || 'NISN tidak ditemukan.');
      }
    } catch {
      setSearchError('Terjadi kesalahan sistem.');
    }
    setSearching(false);
  };

  const fireConfetti = () => {
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10b981', '#3b82f6', '#8b5cf6'] });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10b981', '#3b82f6', '#8b5cf6'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  // ─── QR Code ────────────────────────────────────────
  const generateQR = async () => {
    if (!result || !qrCanvasRef.current) return;
    setShowQR(true);
    const text = `VERIFIKASI KELULUSAN\nNama: ${result.nama}\nNISN: ${result.nisn}\nKelas: ${result.kelas}\nStatus: ${result.status}`;
    try {
      const QRCode = await import('qrcode');
      await QRCode.toCanvas(qrCanvasRef.current, text, {
        width: 200, margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      });
    } catch { /* silent */ }
  };

  // ─── Print ──────────────────────────────────────────
  const printResult = () => {
    if (!result) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>SKL - ${result.nama}</title>
      <style>body{font-family:'Times New Roman',serif;padding:40px;color:#000}
      .header{text-align:center;border-bottom:3px double #000;padding-bottom:20px;margin-bottom:30px}
      .header h1{font-size:18px;margin:0}.header h2{font-size:16px;margin:5px 0;font-weight:normal}
      .badge{display:inline-block;padding:8px 24px;border-radius:4px;color:white;font-weight:bold;font-size:16px}
      .badge-l{background:#10b981}.badge-t{background:#ef4444}
      table{width:100%;border-collapse:collapse;margin:20px 0}
      td{padding:8px 12px;border:1px solid #ddd}
      td:first-child{background:#f5f5f5;width:150px;font-weight:bold}
      .footer{text-align:center;margin-top:40px;font-size:12px;color:#666}</style></head><body>
      <div class="header"><h1>PENGUMUMAN KELULUSAN</h1><h2>${settings.schoolName || ''}</h2></div>
      <table>
        <tr><td>Nama</td><td>${result.nama}</td></tr>
        <tr><td>NISN / NIS</td><td>${result.nisn} / ${result.nis}</td></tr>
        <tr><td>Kelas</td><td>${result.kelas}</td></tr>
        <tr><td>Status</td><td><span class="badge ${result.status.toUpperCase()==='LULUS'?'badge-l':'badge-t'}">${result.status}</span></td></tr>
        <tr><td>Keterangan</td><td>${result.pesan}</td></tr>
      </table>
      <div class="footer">Dicetak pada: ${new Date().toLocaleString('id-ID')}</div></body></html>`);
    w.document.close();
    w.print();
  };

  // ─── Share ──────────────────────────────────────────
  const shareText = result ? `Hasil Kelulusan ${result.nama}: ${result.status} - ${result.pesan}` : '';
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  // ─── Admin Login ────────────────────────────────────
  const handleAdminLogin = async () => {
    if (!adminUser || !adminPass) return alert('Masukkan username & password');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUser, password: adminPass }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminLoggedIn(true);
        setAdminUser('');
        setAdminPass('');
      } else {
        alert(data.message || 'Login gagal');
      }
    } catch { alert('Error koneksi'); }
  };

  // ─── Admin Save ─────────────────────────────────────
  const handleAdminSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm),
      });
      const data = await res.json();
      if (data.success) {
        alert('Pengaturan berhasil disimpan!');
        fetchSettings();
      } else {
        alert(data.message || 'Gagal menyimpan');
      }
    } catch { alert('Error koneksi'); }
    setSaving(false);
  };

  // ─── Admin Logs ─────────────────────────────────────
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data.data || []);
      setLogsTotal(data.total || 0);
    } catch { /* silent */ }
  };

  useEffect(() => { if (adminLoggedIn && adminTab === 'logs') fetchLogs(); }, [adminLoggedIn, adminTab]);

  // ─── Loading ────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-gradient-anim min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  // ─── Format countdown date ──────────────────────────
  const fmtDate = (() => {
    if (!settings.announcementDate) return '';
    try {
      return new Date(settings.announcementDate).toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return settings.announcementDate; }
  })();

  const pad = (n: number) => String(n).padStart(2, '0');

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="bg-gradient-anim min-h-screen flex flex-col items-center justify-center p-4 relative">
      <Particles />

      {/* ═══ MAIN APP ═══ */}
      {!adminLoggedIn && (
        <div className="glass w-full max-w-2xl rounded-3xl p-6 md:p-10 relative z-10 fade-in">

          {/* Header */}
          <div className="flex flex-col items-center border-b border-white/10 pb-6 mb-6">
            <div className="logo-shell mb-4">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              )}
              <div className="logo-badge">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-center">
              {settings.appName || 'Pengumuman Kelulusan'}
            </h1>
            <p className="text-white/55 font-medium text-sm mt-1.5">{settings.schoolName || ''}</p>
          </div>

          {/* Running Text */}
          {settings.runningText && (
            <div className="marquee-wrap mb-8">
              <span className="marquee-text">{settings.runningText}</span>
            </div>
          )}

          {/* ─── COUNTDOWN ─── */}
          {view === 'countdown' && (
            <div className="text-center fade-in">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-4 border border-blue-400/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                WAKTU PENGUMUMAN
              </div>
              <div className="text-base font-semibold text-white/70 mb-6">{fmtDate}</div>
              <h2 className="text-lg md:text-xl font-bold text-white mb-6">Pengumuman akan dibuka dalam:</h2>

              <div className="grid grid-cols-4 gap-3 max-w-md mx-auto mb-6">
                <div className="countdown-card">
                  <span className="countdown-num text-3xl md:text-5xl font-black text-white block">{pad(cd.days)}</span>
                  <span className="text-[10px] md:text-xs text-white/45 uppercase font-semibold tracking-wider mt-1.5 block">Hari</span>
                </div>
                <div className="countdown-card">
                  <span className="countdown-num text-3xl md:text-5xl font-black text-white block">{pad(cd.hours)}</span>
                  <span className="text-[10px] md:text-xs text-white/45 uppercase font-semibold tracking-wider mt-1.5 block">Jam</span>
                </div>
                <div className="countdown-card">
                  <span className="countdown-num text-3xl md:text-5xl font-black text-white block">{pad(cd.minutes)}</span>
                  <span className="text-[10px] md:text-xs text-white/45 uppercase font-semibold tracking-wider mt-1.5 block">Menit</span>
                </div>
                <div className="countdown-card pulse-glow">
                  <span className="countdown-num text-3xl md:text-5xl font-black text-blue-300 block">{pad(cd.seconds)}</span>
                  <span className="text-[10px] md:text-xs text-white/45 uppercase font-semibold tracking-wider mt-1.5 block">Detik</span>
                </div>
              </div>
            </div>
          )}

          {/* ─── SEARCH ─── */}
          {view === 'search' && (
            <div className="text-center fade-in">
              <div className="float-anim mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Pengumuman Telah Dibuka!</h2>
              <p className="text-white/50 mb-6 text-sm">Masukkan Nomor Induk Siswa Nasional (NISN) Anda</p>

              <form onSubmit={handleSearch} className="max-w-md mx-auto">
                <div className="relative">
                  <svg className="w-5 h-5 text-white/30 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" /></svg>
                  <input type="text" value={nisn} onChange={e => setNisn(e.target.value)} required
                    placeholder="Ketik NISN Anda..."
                    className="input-glow w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/20 text-white text-lg font-semibold text-center tracking-widest placeholder:text-white/30 outline-none transition-all focus:border-blue-400/50" />
                </div>
                {searchError && (
                  <p className="text-red-400 text-sm mt-2">{searchError}</p>
                )}
                <button type="submit" disabled={searching}
                  className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/30 transform transition hover:-translate-y-0.5 hover:shadow-xl flex justify-center items-center gap-2 active:scale-95 disabled:opacity-60">
                  {searching ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  )}
                  {searching ? 'Mencari...' : 'Cek Hasil Kelulusan'}
                </button>
              </form>

              {/* Quick stats */}
              {stats && stats.total > 0 && (
                <div className="mt-8 grid grid-cols-3 gap-3 max-w-sm mx-auto">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                    <div className="text-xs text-white/40">Total</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-2xl font-bold text-emerald-400">{stats.lulus}</div>
                    <div className="text-xs text-white/40">Lulus</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-2xl font-bold text-blue-400">{stats.persentase}%</div>
                    <div className="text-xs text-white/40">Rate</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── RESULT ─── */}
          {view === 'result' && result && (
            <div className="text-center fade-in">
              {/* Back */}
              <div className="text-left mb-4">
                <button onClick={() => { setView('search'); setResult(null); setNisn(''); }}
                  className="text-blue-400 hover:text-blue-300 font-semibold flex items-center text-sm transition gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Kembali
                </button>
              </div>

              {/* Student Card */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6 relative overflow-hidden">
                <div className="absolute top-4 right-4 opacity-5">
                  <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1">Identitas Siswa</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{result.nama}</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 text-left mt-4">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-white/30 font-bold uppercase">NISN / NIS</p>
                    <p className="font-semibold text-white text-sm mt-0.5">{result.nisn} / {result.nis}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-white/30 font-bold uppercase">Kelas</p>
                    <p className="font-semibold text-white text-sm mt-0.5">{result.kelas}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="mb-6">
                <p className="text-sm text-white/40 font-semibold uppercase tracking-wider mb-3">Status Kelulusan</p>
                <div className={`inline-block px-10 py-4 rounded-2xl text-xl font-black tracking-widest text-white ${result.status.toUpperCase() === 'LULUS' ? 'badge-lulus' : 'badge-tidak'}`}>
                  {result.status}
                </div>
                <p className="text-white/60 mt-4 px-4 text-sm leading-relaxed">{result.pesan}</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {result.linkSKL && (
                  <a href={result.linkSKL} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition hover:-translate-y-0.5 active:scale-95">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Download SKL
                  </a>
                )}
                <button onClick={printResult}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-3.5 px-6 rounded-xl border border-white/20 hover:bg-white/20 transition active:scale-95">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Cetak
                </button>
                <button onClick={generateQR}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-3.5 px-6 rounded-xl border border-white/20 hover:bg-white/20 transition active:scale-95">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                  QR Code
                </button>
              </div>

              {/* Share */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-xs text-white/30 mb-3">Bagikan hasil:</p>
                <div className="flex justify-center gap-3">
                  <a href={`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition flex items-center justify-center">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.638-1.215A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.09 0-4.032-.655-5.631-1.77l-.404-.267-2.75.72.735-2.692-.294-.468A9.7 9.7 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75S21.75 6.615 21.75 12s-4.365 9.75-9.75 9.75z"/></svg>
                  </a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition flex items-center justify-center">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition flex items-center justify-center">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                  <button onClick={() => navigator.clipboard.writeText(shareUrl).then(() => alert('Link disalin!'))}
                    className="w-10 h-10 rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-5 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-white/35 text-[11px] tracking-wide">
              <span>©</span>
              <span>{new Date().getFullYear()}</span>
              <span className="text-white/50">{settings.schoolName || 'Sekolah'}</span>
              <span className="text-white/20">·</span>
              <span>v2.0</span>
              <button onClick={() => {
                const u = prompt('Username:');
                const p = prompt('Password:');
                if (u && p) { setAdminUser(u); setAdminPass(p); setTimeout(handleAdminLogin, 100); }
              }} className="opacity-30 hover:opacity-100 transition ml-1.5" title="Admin Login">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADMIN PANEL ═══ */}
      {adminLoggedIn && (
        <div className="glass w-full max-w-3xl rounded-3xl p-6 md:p-10 relative z-10 fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center border-b border-white/10 pb-4 mb-6 gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Dashboard Admin
            </h2>
            <button onClick={() => setAdminLoggedIn(false)}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-2 border border-red-500/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {(['settings', 'stats', 'logs'] as const).map(tab => (
              <button key={tab} onClick={() => setAdminTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${adminTab === tab ? 'tab-active' : 'bg-white/5 text-white/50 hover:text-white/70'}`}>
                {tab === 'settings' && '⚙️ Pengaturan'}
                {tab === 'stats' && '📊 Statistik'}
                {tab === 'logs' && '📋 Log Aktivitas'}
              </button>
            ))}
          </div>

          {/* Tab: Settings */}
          {adminTab === 'settings' && (
            <div className="space-y-4 fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-1">Nama Aplikasi</label>
                  <input type="text" value={adminForm.appName || ''} onChange={e => setAdminForm(f => ({ ...f, appName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-blue-400/50 transition" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-1">Nama Sekolah</label>
                  <input type="text" value={adminForm.schoolName || ''} onChange={e => setAdminForm(f => ({ ...f, schoolName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-blue-400/50 transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1">URL Logo</label>
                <input type="text" value={adminForm.logoUrl || ''} onChange={e => setAdminForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/30 outline-none focus:border-blue-400/50 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1">Waktu Pengumuman Dibuka</label>
                <input type="datetime-local" step="1" value={adminForm.announcementDate || ''} onChange={e => setAdminForm(f => ({ ...f, announcementDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-blue-400/50 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1">Running Text</label>
                <input type="text" value={adminForm.runningText || ''} onChange={e => setAdminForm(f => ({ ...f, runningText: e.target.value }))} placeholder="Pesan berjalan..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/30 outline-none focus:border-blue-400/50 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1">Footer Text</label>
                <input type="text" value={adminForm.footerText || ''} onChange={e => setAdminForm(f => ({ ...f, footerText: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-blue-400/50 transition" />
              </div>
              <button onClick={handleAdminSave} disabled={saving}
                className="w-full mt-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition hover:-translate-y-0.5 flex justify-center items-center gap-2 active:scale-95 disabled:opacity-60">
                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          )}

          {/* Tab: Stats */}
          {adminTab === 'stats' && stats && (
            <div className="fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-3xl font-black text-white">{stats.total}</div>
                  <div className="text-xs text-white/40 mt-1">Total Siswa</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-3xl font-black text-emerald-400">{stats.lulus}</div>
                  <div className="text-xs text-white/40 mt-1">Lulus</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-3xl font-black text-red-400">{stats.tidakLulus}</div>
                  <div className="text-xs text-white/40 mt-1">Tidak Lulus</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-3xl font-black text-blue-400">{stats.persentase}%</div>
                  <div className="text-xs text-white/40 mt-1">Kelulusan</div>
                </div>
              </div>

              {/* Per Kelas */}
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Per Kelas</h3>
              <div className="space-y-2 mb-6">
                {Object.entries(stats.perKelas).map(([kelas, k], i) => {
                  const pct = k.total > 0 ? Math.round((k.lulus / k.total) * 100) : 0;
                  const colors = ['from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500'];
                  return (
                    <div key={kelas} className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-white">{kelas}</span>
                        <span className="text-xs text-white/40">{k.lulus}/{k.total} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2.5">
                        <div className={`bg-gradient-to-r ${colors[i % colors.length]} h-2.5 rounded-full chart-bar`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Donut */}
              <div className="flex justify-center mt-6">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3"
                      strokeDasharray={`${stats.persentase} ${100 - stats.persentase}`} strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white">{stats.persentase}%</span>
                    <span className="text-xs text-white/40">Lulus</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Logs */}
          {adminTab === 'logs' && (
            <div className="fade-in">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-white/40">Total pencarian: <span className="text-white font-semibold">{logsTotal}</span></p>
                <button onClick={fetchLogs} className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition">
                  ↻ Refresh
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <div className="text-center text-white/30 py-8">Belum ada aktivitas</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/8 transition">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${log.status.toUpperCase() === 'LULUS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {log.status.toUpperCase() === 'LULUS' ? '✓' : '✕'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{log.nama}</p>
                          <p className="text-xs text-white/30">NISN: {log.nisn}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-semibold ${log.status.toUpperCase() === 'LULUS' ? 'text-emerald-400' : 'text-red-400'}`}>{log.status}</span>
                        <p className="text-xs text-white/20 mt-0.5">{log.timestamp}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ QR MODAL ═══ */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">QR Code Verifikasi</h3>
            <canvas ref={qrCanvasRef} className="mx-auto mb-4 rounded-xl" />
            <p className="text-xs text-gray-500 mb-4">Scan untuk verifikasi kelulusan</p>
            <button onClick={() => setShowQR(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-xl transition">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
