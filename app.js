/* ============================
   SALARY ADMIN - app.js
   Lưu dữ liệu bằng localStorage
   ============================ */

const LS_EMP = "salary_employees_v1";
const LS_ORDERS = "salary_orders_v1";

/* ---------------- Network particle FX (giống bản mẫu) ---------------- */
(function(){
  const canvas = document.getElementById('fx');
  const ctx = canvas.getContext('2d');
  let W, H, DPR, nodes;
  function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, 2.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initNodes();
  }
  function initNodes(){
    const count = Math.max(50, Math.floor((W*H)/22000));
    nodes = Array.from({length: count}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      vx: (Math.random()-0.5)*1.6, vy: (Math.random()-0.5)*1.6,
      r: 1.6 + Math.random()*2, kind: Math.random() < 0.12 ? 'gold' : (Math.random() < 0.28 ? 'white' : 'blue')
    }));
  }
  const COLORS = { gold:'#f2b23c', white:'#ffffff', blue:'#a0beff' };
  function animate(){
    ctx.clearRect(0,0,W,H);
    for(const n of nodes){
      n.x += n.vx; n.y += n.vy;
      if(n.x<0||n.x>W) n.vx*=-1;
      if(n.y<0||n.y>H) n.vy*=-1;
    }
    ctx.lineWidth = 1;
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i], b=nodes[j];
        const dist = Math.hypot(a.x-b.x, a.y-b.y);
        if(dist < 130){
          ctx.strokeStyle = `rgba(200,212,255,${0.4*(1-dist/130)})`;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    for(const n of nodes){
      ctx.beginPath();
      ctx.fillStyle = COLORS[n.kind];
      ctx.arc(n.x, n.y, n.r, 0, Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(animate);
  }
  window.addEventListener('resize', resize);
  resize(); animate();
})();

/* ---------------- Sidebar / điều hướng trang ---------------- */
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const pageHeaderTitle = document.getElementById('pageHeaderTitle');

const PAGE_TITLES = {
  dashboard: 'Tổng Quan',
  employees: 'Nhân Viên',
  orders: 'Nhập Đơn Hàng',
  ranking: 'Bảng Xếp Hạng',
  orderlist: 'Chi Tiết Đơn'
};

function openSidebar(){
  sidebar.classList.add('show');
  sidebarOverlay.classList.add('show');
}
function closeSidebar(){
  sidebar.classList.remove('show');
  sidebarOverlay.classList.remove('show');
}
menuBtn.addEventListener('click', openSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

function switchPage(pageId){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  document.querySelectorAll('.side-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`.side-item[data-page="${pageId}"]`).classList.add('active');
  pageHeaderTitle.textContent = PAGE_TITLES[pageId];
  closeSidebar();
  if(pageId === 'dashboard') renderDashboard();
}

document.querySelectorAll('.side-item').forEach(item=>{
  item.addEventListener('click', ()=> switchPage(item.dataset.page));
});

/* ---------------- Toast ---------------- */
let toastTimer = null;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove('show'), 1800);
}

/* ---------------- Helpers ---------------- */
function loadEmployees(){ return JSON.parse(localStorage.getItem(LS_EMP) || "[]"); }
function saveEmployees(list){ localStorage.setItem(LS_EMP, JSON.stringify(list)); }
function loadOrders(){ return JSON.parse(localStorage.getItem(LS_ORDERS) || "[]"); }
function saveOrders(list){ localStorage.setItem(LS_ORDERS, JSON.stringify(list)); }
function formatVND(n){ return Number(n || 0).toLocaleString("vi-VN") + " đ"; }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function escapeHtml(str){
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------- Nhân viên ---------------- */
function addEmployee(){
  const nameEl = document.getElementById("empName");
  const name = nameEl.value.trim();

  if (!name) { showToast("⚠ Nhập tên nhân viên"); return; }

  const employees = loadEmployees();
  if (employees.some(e => e.name.toLowerCase() === name.toLowerCase())) {
    showToast("⚠ Nhân viên đã tồn tại");
    return;
  }

  employees.push({ id: uid(), name });
  saveEmployees(employees);

  nameEl.value = "";

  showToast(`✅ Đã thêm "${name}"`);
  renderEmployees();
  renderOrderEmpSelect();
  renderRanking();
}

function deleteEmployee(id){
  let employees = loadEmployees();
  const emp = employees.find(e => e.id === id);
  if (!confirm(`Xoá nhân viên "${emp ? emp.name : ''}"? Đơn hàng liên quan vẫn được giữ lại.`)) return;
  employees = employees.filter(e => e.id !== id);
  saveEmployees(employees);
  showToast("🗑 Đã xoá nhân viên");
  renderEmployees();
  renderOrderEmpSelect();
  renderRanking();
}

function renderEmployees(){
  const employees = loadEmployees();
  const wrap = document.getElementById("empList");
  wrap.innerHTML = "";

  if (employees.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có nhân viên nào.</div>`;
    return;
  }

  employees.forEach(emp => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <div class="item-main">
        <div class="item-name">${escapeHtml(emp.name)}</div>
      </div>
      <button>Xoá</button>
    `;
    row.querySelector("button").addEventListener("click", () => deleteEmployee(emp.id));
    wrap.appendChild(row);
  });
}

/* ---------------- Đơn hàng ---------------- */
function renderOrderEmpSelect(){
  const employees = loadEmployees();
  const sel = document.getElementById("orderEmp");
  const prev = sel.value;
  sel.innerHTML = "";

  if (employees.length === 0) {
    sel.innerHTML = `<option value="">-- Chưa có nhân viên --</option>`;
    return;
  }

  employees.forEach(emp => {
    const opt = document.createElement("option");
    opt.value = emp.id;
    opt.textContent = emp.name;
    sel.appendChild(opt);
  });
  if (employees.some(e => e.id === prev)) sel.value = prev;
}

function addOrder(){
  const empId = document.getElementById("orderEmp").value;
  const qty = parseInt(document.getElementById("orderQty").value);
  const price = parseFloat(document.getElementById("orderPrice").value);
  const note = document.getElementById("orderNote").value.trim();

  if (!empId) { showToast("⚠ Chưa có nhân viên để chọn"); return; }
  if (isNaN(qty) || qty <= 0) { showToast("⚠ Nhập số lượng đơn hợp lệ"); return; }
  if (isNaN(price) || price < 0) { showToast("⚠ Nhập tiền 1 đơn hợp lệ"); return; }

  const employees = loadEmployees();
  const emp = employees.find(e => e.id === empId);
  if (!emp) { showToast("⚠ Không tìm thấy nhân viên"); return; }

  const orders = loadOrders();
  orders.push({
    id: uid(), empId, empName: emp.name,
    qty, price, total: qty * price, note,
    date: new Date().toISOString()
  });
  saveOrders(orders);

  document.getElementById("orderQty").value = "";
  document.getElementById("orderPrice").value = "";
  document.getElementById("orderNote").value = "";

  const preview = document.getElementById("orderPreview");
  preview.textContent = `Đã thêm: ${qty} đơn x ${formatVND(price)} = ${formatVND(qty * price)} cho ${emp.name}`;
  preview.classList.add("show");

  showToast(`✅ Đã thêm ${qty} đơn cho ${emp.name}`);
  renderOrderHistory();
  renderRanking();
}

function deleteOrder(id){
  if (!confirm("Xoá đơn hàng này?")) return;
  let orders = loadOrders();
  orders = orders.filter(o => o.id !== id);
  saveOrders(orders);
  showToast("🗑 Đã xoá đơn hàng");
  renderOrderHistory();
  renderRanking();
}

function clearOrders(){
  if (!confirm("Xoá TẤT CẢ đơn hàng? Không thể hoàn tác.")) return;
  saveOrders([]);
  showToast("🗑 Đã xoá toàn bộ đơn hàng");
  renderOrderHistory();
  renderRanking();
  const preview = document.getElementById("orderPreview");
  preview.textContent = "";
  preview.classList.remove("show");
}

function renderOrderHistory(){
  const orders = loadOrders().slice().reverse();
  const wrap = document.getElementById("orderHistoryList");
  wrap.innerHTML = "";

  if (orders.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có đơn hàng nào.</div>`;
    return;
  }

  orders.forEach(o => {
    const d = new Date(o.date);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const hh = String(d.getHours()).padStart(2,'0');
    const mi = String(d.getMinutes()).padStart(2,'0');
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <div class="item-main">
        <div class="item-name">${escapeHtml(o.empName)} — ${o.qty} đơn</div>
        <div class="item-sub">${formatVND(o.price)}/đơn · Thành tiền ${formatVND(o.total)} · ${dd}/${mm} ${hh}:${mi}${o.note ? " · " + escapeHtml(o.note) : ""}</div>
      </div>
      <button>Xoá</button>
    `;
    row.querySelector("button").addEventListener("click", () => deleteOrder(o.id));
    wrap.appendChild(row);
  });
}

/* ---------------- Thống kê / Xếp hạng ---------------- */
function computeStats(){
  const employees = loadEmployees();
  const orders = loadOrders();

  const stats = employees.map(emp => {
    const empOrders = orders.filter(o => o.empId === emp.id);
    const totalQty = empOrders.reduce((s, o) => s + o.qty, 0);
    const totalRevenue = empOrders.reduce((s, o) => s + o.total, 0);
    const salary = totalRevenue;
    return { name: emp.name, totalQty, totalRevenue, salary };
  });

  stats.sort((a, b) => b.totalQty - a.totalQty || b.totalRevenue - a.totalRevenue);
  return stats;
}

function rankBadgeHtml(rank){
  if (rank === 1) return `<div class="rank-badge r1">🥇</div>`;
  if (rank === 2) return `<div class="rank-badge r2">🥈</div>`;
  if (rank === 3) return `<div class="rank-badge r3">🥉</div>`;
  return `<div class="rank-badge">${rank}</div>`;
}

function renderRanking(){
  const stats = computeStats();
  const wrap = document.getElementById("rankList");
  wrap.innerHTML = "";

  if (stats.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có dữ liệu.</div>`;
  } else {
    stats.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "rank-row";
      row.innerHTML = `
        ${rankBadgeHtml(i + 1)}
        <div class="rank-main">
          <div class="rank-name">${escapeHtml(s.name)}</div>
          <div class="rank-sub">Doanh thu ${formatVND(s.totalRevenue)}</div>
        </div>
        <div class="rank-orders">${s.totalQty} đơn</div>
        <div class="rank-salary">${formatVND(s.salary)}</div>
      `;
      wrap.appendChild(row);
    });
  }

  renderDashboard();
}

/* ---------------- Dashboard ---------------- */
function renderDashboard(){
  const employees = loadEmployees();
  const orders = loadOrders();
  const stats = computeStats();

  const totalOrders = orders.reduce((s, o) => s + o.qty, 0);
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalSalary = stats.reduce((s, x) => s + x.salary, 0);

  document.getElementById("sumEmp").textContent = employees.length;
  document.getElementById("sumOrders").textContent = totalOrders;
  document.getElementById("sumRevenue").textContent = formatVND(totalRevenue);
  document.getElementById("sumSalary").textContent = formatVND(totalSalary);

  const top = stats.slice(0, 5);
  const wrap = document.getElementById("topRankList");
  wrap.innerHTML = "";
  if (top.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có dữ liệu.</div>`;
    return;
  }
  top.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "rank-row";
    row.innerHTML = `
      ${rankBadgeHtml(i + 1)}
      <div class="rank-main">
        <div class="rank-name">${escapeHtml(s.name)}</div>
        <div class="rank-sub">${s.totalQty} đơn</div>
      </div>
      <div class="rank-salary">${formatVND(s.salary)}</div>
    `;
    wrap.appendChild(row);
  });
}

/* ---------------- Xuất dữ liệu ---------------- */
function exportData(){
  const data = {
    employees: loadEmployees(),
    orders: loadOrders(),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `luong-nhan-vien-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("⬇ Đã xuất file JSON");
}

/* ---------------- Gắn sự kiện & khởi tạo ---------------- */
document.getElementById("addEmpBtn").addEventListener("click", addEmployee);
document.getElementById("addOrderBtn").addEventListener("click", addOrder);
document.getElementById("clearOrdersBtn").addEventListener("click", clearOrders);
document.getElementById("exportBtn").addEventListener("click", exportData);

renderEmployees();
renderOrderEmpSelect();
renderOrderHistory();
renderRanking();
renderDashboard();