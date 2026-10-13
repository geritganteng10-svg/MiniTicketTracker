const STORAGE_KEY = 'miniTicketTracker.tickets';
const PRIORITY_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };
const STATUS_LIST = ['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed'];

let tickets = loadTickets();
let editingNo = null; // nomor tiket yang sedang diedit
let pendingData = null; // tiket menunggu pengisian solusi (pop up)
let currentTab = 'all'; // all | active | done
const DONE_STATUS = ['Resolved', 'Closed'];

const $ = (id) => document.getElementById(id);
const form = $('ticketForm');

/* ---------- Penyimpanan ---------- */
function loadTickets() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveTickets() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets)); }

/* ---------- Util ---------- */
function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
function formatTime(v) {
  const d = new Date(v);
  return isNaN(d) ? v : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function slug(s) { return s.toLowerCase().replace(/\s+/g, '-'); }

/* ---------- Notifikasi kecil ---------- */
let toastTimer;
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Validasi ---------- */
function clearErrors() {
  ['errNo', 'errTitle', 'errTime'].forEach((id) => ($(id).textContent = ''));
  ['ticketNo', 'title', 'createdAt'].forEach((id) => $(id).classList.remove('invalid'));
}
function setError(inputId, errId, msg) {
  $(errId).textContent = msg;
  $(inputId).classList.add('invalid');
}
function validate() {
  clearErrors();
  let ok = true;
  const no = $('ticketNo').value.trim();
  if (!no) { setError('ticketNo', 'errNo', 'Nomor tiket wajib diisi.'); ok = false; }
  else if (tickets.some((t) => t.no.toLowerCase() === no.toLowerCase() && t.no !== editingNo)) {
    setError('ticketNo', 'errNo', `Nomor tiket "${no}" sudah ada. Gunakan nomor lain.`); ok = false;
  }
  if (!$('title').value.trim()) { setError('title', 'errTitle', 'Judul / deskripsi wajib diisi.'); ok = false; }
  if (!$('createdAt').value) { setError('createdAt', 'errTime', 'Waktu masuk wajib diisi.'); ok = false; }
  return ok;
}

/* ---------- Form ---------- */
function resetForm() {
  form.reset();
  $('createdAt').value = nowLocalInput();
  editingNo = null;
  $('formTitle').textContent = 'Tambah Tiket';
  $('submitBtn').textContent = 'Tambah Tiket';
  $('cancelEditBtn').classList.add('hidden');
  clearErrors();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validate()) return;
  const data = {
    no: $('ticketNo').value.trim(),
    title: $('title').value.trim(),
    priority: $('priority').value,
    status: $('status').value,
    createdAt: $('createdAt').value,
    notes: $('notes').value.trim(),
  };
  const existing = editingNo ? tickets.find((t) => t.no === editingNo) : null;
  data.solution = existing ? existing.solution || '' : '';
  const wasResolved = existing && existing.status === 'Resolved';

  // Jika status baru menjadi Resolved -> minta solusi lewat pop up
  if (data.status === 'Resolved' && !wasResolved) {
    pendingData = data;
    openSolutionModal();
    return;
  }
  commitTicket(data);
});

function commitTicket(data) {
  const wasEdit = !!editingNo;
  if (editingNo) {
    const i = tickets.findIndex((t) => t.no === editingNo);
    tickets[i] = data;
  } else {
    tickets.push(data);
  }
  saveTickets();
  resetForm();
  render();
  showToast(wasEdit ? 'Perubahan tiket disimpan' : 'Tiket berhasil ditambahkan');
}

/* ---------- Pop up solusi ---------- */
function openSolutionModal() {
  $('modalTitle').textContent = 'Tiket ' + pendingData.no + ' diselesaikan';
  $('solution').value = pendingData.solution || '';
  $('errSolution').textContent = '';
  $('solutionModal').classList.remove('hidden');
  $('solution').focus();
}
function closeSolutionModal() {
  $('solutionModal').classList.add('hidden');
  pendingData = null;
}
$('saveSolutionBtn').addEventListener('click', () => {
  const sol = $('solution').value.trim();
  if (!sol) { $('errSolution').textContent = 'Solusi wajib diisi sebelum tiket di-Resolved.'; return; }
  pendingData.solution = sol;
  const data = pendingData;
  closeSolutionModal();
  commitTicket(data);
});
$('cancelSolutionBtn').addEventListener('click', closeSolutionModal);
$('solutionModal').addEventListener('click', (e) => { if (e.target.id === 'solutionModal') closeSolutionModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pendingData) closeSolutionModal(); });

$('cancelEditBtn').addEventListener('click', resetForm);

function startEdit(no) {
  const t = tickets.find((x) => x.no === no);
  if (!t) return;
  editingNo = no;
  $('ticketNo').value = t.no;
  $('title').value = t.title;
  $('priority').value = t.priority;
  $('status').value = t.status;
  $('createdAt').value = t.createdAt;
  $('notes').value = t.notes || '';
  $('formTitle').textContent = 'Edit Tiket ' + t.no;
  $('submitBtn').textContent = 'Simpan Perubahan';
  $('cancelEditBtn').classList.remove('hidden');
  clearErrors();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteTicket(no) {
  if (!confirm(`Hapus tiket ${no}?`)) return;
  tickets = tickets.filter((t) => t.no !== no);
  if (editingNo === no) resetForm();
  saveTickets();
  render();
  showToast('Tiket ' + no + ' dihapus');
}

/* ---------- Filter, cari, urut ---------- */
function getVisible() {
  const st = $('filterStatus').value;
  const pr = $('filterPriority').value;
  const q = $('search').value.trim().toLowerCase();
  const list = tickets.filter((t) =>
    (currentTab === 'all' || (currentTab === 'done') === DONE_STATUS.includes(t.status)) &&
    (!st || t.status === st) &&
    (!pr || t.priority === pr) &&
    (!q || t.no.toLowerCase().includes(q) || t.title.toLowerCase().includes(q))
  );
  const sort = $('sortBy').value;
  list.sort((a, b) => {
    if (sort === 'timeAsc') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'prioDesc') return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (sort === 'prioAsc') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  return list;
}

/* ---------- Render ---------- */
function renderSummary() {
  if (!tickets.length) { $('summary').textContent = 'Belum ada tiket.'; return; }
  const parts = STATUS_LIST
    .map((s) => [s, tickets.filter((t) => t.status === s).length])
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${s}`);
  $('summary').textContent = `Total ${tickets.length} tiket: ${parts.join(', ')}`;
}

function renderTabs() {
  const done = tickets.filter((t) => DONE_STATUS.includes(t.status)).length;
  $('cntAll').textContent = tickets.length;
  $('cntDone').textContent = done;
  $('cntActive').textContent = tickets.length - done;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === currentTab));
}
$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('.tab');
  if (!b) return;
  currentTab = b.dataset.tab;
  render();
});

function render() {
  renderSummary();
  renderTabs();
  const list = getVisible();
  $('tbody').innerHTML = list.map((t) => `
    <tr>
      <td data-label="No. Tiket"><strong>${esc(t.no)}</strong></td>
      <td data-label="Judul">${esc(t.title)}</td>
      <td data-label="Prioritas"><span class="badge p-${slug(t.priority)}">${esc(t.priority)}</span></td>
      <td data-label="Status"><span class="badge s-${slug(t.status)}">${esc(t.status)}</span></td>
      <td data-label="Waktu Masuk">${esc(formatTime(t.createdAt))}</td>
      <td data-label="Catatan" class="notes-cell">${esc(t.notes || '-')}</td>
      <td data-label="Solusi" class="solution-cell">${esc(t.solution || '-')}</td>
      <td data-label="Aksi">
        <div class="row-actions">
          <button class="btn btn-outline btn-sm" data-edit="${esc(t.no)}">Edit</button>
          <button class="btn btn-danger btn-sm" data-del="${esc(t.no)}">Hapus</button>
        </div>
      </td>
    </tr>`).join('');
  $('emptyMsg').classList.toggle('hidden', list.length > 0);
}

$('tbody').addEventListener('click', (e) => {
  const edit = e.target.closest('[data-edit]');
  const del = e.target.closest('[data-del]');
  if (edit) startEdit(edit.dataset.edit);
  if (del) deleteTicket(del.dataset.del);
});

['filterStatus', 'filterPriority', 'sortBy'].forEach((id) => $(id).addEventListener('change', render));
$('search').addEventListener('input', render);
$('resetBtn').addEventListener('click', () => {
  $('filterStatus').value = '';
  $('filterPriority').value = '';
  $('search').value = '';
  $('sortBy').value = 'timeDesc';
  currentTab = 'all';
  render();
});

/* ---------- Data contoh ---------- */
$('sampleBtn').addEventListener('click', () => {
  const base = nowLocalInput();
  const sample = [
    ['INC-001', 'User tidak bisa login VPN', 'High', 'Open'],
    ['INC-002', 'Printer lantai 2 tidak terdeteksi', 'Low', 'In Progress'],
    ['INC-003', 'Email tidak bisa kirim attachment', 'Medium', 'Waiting for User'],
    ['INC-004', 'Aplikasi ERP lambat saat jam sibuk', 'Critical', 'In Progress'],
    ['INC-005', 'Reset password akun karyawan baru', 'Low', 'Resolved'],
    ['INC-006', 'Disk server hampir penuh', 'High', 'Open'],
  ];
  let added = 0;
  sample.forEach(([no, title, priority, status], i) => {
    if (tickets.some((t) => t.no === no)) return;
    const d = new Date(base); d.setMinutes(d.getMinutes() - (sample.length - i) * 30);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    tickets.push({ no, title, priority, status, createdAt: d.toISOString().slice(0, 16), notes: '' });
    added++;
  });
  saveTickets();
  render();
  if (!added) alert('Data contoh sudah ada semua.');
});

/* ---------- Export CSV ---------- */
function exportCsv() {
  if (!tickets.length) { alert('Belum ada tiket untuk di-export.'); return; }
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['No. Tiket', 'Judul', 'Prioritas', 'Status', 'Waktu Masuk', 'Catatan', 'Solusi']];
  getVisible().forEach((t) => rows.push([t.no, t.title, t.priority, t.status, formatTime(t.createdAt), t.notes, t.solution]));
  const csv = '\uFEFF' + rows.map((r) => r.map(q).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'tiket.csv'; a.click();
  URL.revokeObjectURL(url);
}


/* ---------- Tombol Export CSV -> menghasilkan file Excel (.xlsx) berwarna seperti di web ---------- */
// Jika library Excel gagal dimuat (offline), otomatis turun ke file CSV biasa (exportCsv).
// [warna latar, warna teks] sama dengan badge di tampilan web
const BADGE_COLORS = {
  'Low': ['DFF3E7', '1E7E4A'], 'Medium': ['FFF2C7', '8A6100'],
  'High': ['FFE1C7', '9A4400'], 'Critical': ['FDE0DE', 'B3261E'],
  'Open': ['FDE0DE', 'B3261E'], 'In Progress': ['FFF2C7', '8A6100'],
  'Waiting for User': ['FFE1C7', '9A4400'], 'Resolved': ['DFF3E7', '1E7E4A'],
  'Closed': ['E6E9EE', '4A5563'],
};

function toExcelDate(v) {
  // "2026-10-12T16:34" -> tanggal Excel dengan jam yang sama (tanpa geser zona waktu)
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || '');
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])) : v;
}

$('exportBtn').addEventListener('click', async () => {
  if (!tickets.length) { alert('Belum ada tiket untuk di-export.'); return; }
  const list = getVisible();
  if (!list.length) { alert('Tidak ada tiket yang tampil. Reset filter dulu.'); return; }
  if (typeof ExcelJS === 'undefined') {
    alert('Library Excel gagal dimuat (perlu koneksi internet). File CSV diunduh sebagai gantinya.');
    exportCsv();
    return;
  }

  const NAVY = 'FF1F3A5F', SOFT = 'FFE8EEF6', LINE = 'FFCFD9E5';
  const thin = { style: 'thin', color: { argb: LINE } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const argb = (hex) => 'FF' + hex;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Tiket', { views: [{ state: 'frozen', ySplit: 3 }] });
  ws.columns = [
    { width: 14 }, { width: 40 }, { width: 13 }, { width: 18 },
    { width: 20 }, { width: 38 }, { width: 38 },
  ];

  // Baris 1: judul
  ws.mergeCells('A1:G1');
  Object.assign(ws.getCell('A1'), { value: 'Mini Ticket Tracker' });
  ws.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getCell('A1').alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 30;

  // Baris 2: ringkasan (sama seperti di atas tabel pada web)
  ws.mergeCells('A2:G2');
  ws.getCell('A2').value = $('summary').textContent;
  ws.getCell('A2').font = { name: 'Calibri', size: 12, bold: true, color: { argb: NAVY } };
  ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
  ws.getCell('A2').alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 24;

  // Baris 3: header tabel
  const header = ws.getRow(3);
  header.values = ['No. Tiket', 'Judul', 'Prioritas', 'Status', 'Waktu Masuk', 'Catatan', 'Solusi'];
  header.height = 24;
  header.eachCell((c) => {
    c.font = { name: 'Calibri', size: 12, bold: true, color: { argb: NAVY } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    c.border = border;
  });

  // Data tiket (sesuai tab, filter, pencarian, dan urutan yang sedang tampil)
  list.forEach((t) => {
    const row = ws.addRow([t.no, t.title, t.priority, t.status, toExcelDate(t.createdAt), t.notes || '', t.solution || '']);
    row.eachCell((c) => {
      c.font = { name: 'Calibri', size: 12, color: { argb: 'FF1C2733' } };
      c.alignment = { vertical: 'top', wrapText: true };
      c.border = border;
    });
    row.getCell(1).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1C2733' } };
    row.getCell(5).numFmt = 'dd mmm yyyy hh:mm';
    row.getCell(5).alignment = { vertical: 'top', horizontal: 'left' };
    // Badge warna prioritas (kolom C) dan status (kolom D)
    [[3, t.priority], [4, t.status]].forEach(([col, val]) => {
      const colors = BADGE_COLORS[val];
      if (!colors) return;
      const c = row.getCell(col);
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(colors[0]) } };
      c.font = { name: 'Calibri', size: 12, bold: true, color: { argb: argb(colors[1]) } };
      c.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
    });
    if (t.solution) row.getCell(7).font = { name: 'Calibri', size: 12, color: { argb: 'FF1E7E4A' } };
  });

  ws.autoFilter = 'A3:G3';
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  try {
    const buffer = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tiket-' + new Date().toISOString().slice(0, 10) + '.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert('Gagal membuat file Excel. Coba lagi atau gunakan Export CSV.');
  }
});

/* ---------- Mulai ---------- */
resetForm();
render();
