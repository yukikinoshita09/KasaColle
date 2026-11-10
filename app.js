const STORAGE_KEY = "kasanodeban-umbrellas-v2";
const SESSION_KEY = "kasanodeban-role";
const IMAGE_OPTIONS = [
  { src: "./assets/umbrella-navy.png", label: "紺色の長傘" },
  { src: "./assets/umbrella-clear.png", label: "透明のビニール傘" },
  { src: "./assets/umbrella-yellow.png", label: "黄色の折りたたみ傘" },
  { src: "./assets/umbrella-plaid.png", label: "緑のチェック傘" },
  { src: "./assets/umbrella-red-dots.png", label: "赤い水玉模様の傘" },
  { src: "./assets/umbrella-blue-stripe.png", label: "青いボーダーの折りたたみ傘" },
  { src: "./assets/umbrella-black.png", label: "黒い長傘" },
  { src: "./assets/umbrella-kids-blue.png", label: "水色の子ども傘" },
];

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const initialData = () => [
  { id: crypto.randomUUID(), name: "紺色の長傘", type: "長傘", location: "中央図書館 1F", foundDate: daysAgo(4), image: IMAGE_OPTIONS[0].src, status: "waiting", claimed: false },
  { id: crypto.randomUUID(), name: "透明のビニール傘", type: "ビニール傘", location: "北口コミュニティセンター", foundDate: daysAgo(18), image: IMAGE_OPTIONS[1].src, status: "available", claimed: false },
  { id: crypto.randomUUID(), name: "黄色の折りたたみ傘", type: "折りたたみ傘", location: "市民ギャラリー受付", foundDate: daysAgo(23), image: IMAGE_OPTIONS[2].src, status: "loaned", claimed: false },
  { id: crypto.randomUUID(), name: "緑のチェック傘", type: "長傘", location: "南町バス待合所", foundDate: daysAgo(15), image: IMAGE_OPTIONS[3].src, status: "available", claimed: false },
  { id: crypto.randomUUID(), name: "赤い水玉模様の傘", type: "長傘", location: "市役所 東側入口", foundDate: daysAgo(2), image: IMAGE_OPTIONS[4].src, status: "waiting", claimed: false },
  { id: crypto.randomUUID(), name: "青いボーダーの折りたたみ傘", type: "折りたたみ傘", location: "文化会館 2F", foundDate: daysAgo(6), image: IMAGE_OPTIONS[5].src, status: "waiting", claimed: false },
  { id: crypto.randomUUID(), name: "黒い長傘", type: "長傘", location: "西口駐輪場", foundDate: daysAgo(9), image: IMAGE_OPTIONS[6].src, status: "waiting", claimed: false },
  { id: crypto.randomUUID(), name: "水色の子ども傘", type: "長傘", location: "児童館 玄関", foundDate: daysAgo(12), image: IMAGE_OPTIONS[7].src, status: "waiting", claimed: false },
];

let umbrellas = loadData();
let selectedImage = null;
let claimTargetId = null;
let adminListFilter = "forgotten";

function showLogin() {
  sessionStorage.removeItem(SESSION_KEY);
  document.querySelector("#app-shell").hidden = true;
  document.querySelector("#login-view").hidden = false;
  document.querySelector("#login-form").reset();
  document.querySelector("#login-error").textContent = "";
  document.querySelector("#login-id").focus();
}

function showApp(role) {
  const isAdmin = role === "admin";
  sessionStorage.setItem(SESSION_KEY, role);
  document.querySelector("#login-view").hidden = true;
  document.querySelector("#app-shell").hidden = false;
  document.querySelector("#user-view").classList.toggle("is-active", !isAdmin);
  document.querySelector("#admin-view").classList.toggle("is-active", isAdmin);
  document.querySelector("#role-label").textContent = isAdmin ? "管理者としてログイン中" : "利用者としてログイン中";
  document.querySelector("#login-error").textContent = "";
  window.scrollTo({ top: 0 });
  renderAll();
}

function attemptLogin(id, password) {
  if (id === "user" && password === "user") { showApp("user"); return; }
  if (id === "admin" && password === "admin") { showApp("admin"); return; }
  document.querySelector("#login-error").textContent = "IDまたはパスワードが正しくありません。";
  document.querySelector("#login-password").value = "";
  document.querySelector("#login-password").focus();
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialData();
  try { return JSON.parse(saved); } catch { return initialData(); }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(umbrellas));
}

function diffDays(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - new Date(`${dateString}T00:00:00`)) / 86400000));
}

function updateEligibility() {
  let changed = false;
  umbrellas.forEach((umbrella) => {
    if (umbrella.status === "waiting" && !umbrella.claimed && diffDays(umbrella.foundDate) >= 14) {
      umbrella.status = "available";
      changed = true;
    }
  });
  if (changed) saveData();
}

const statusInfo = {
  waiting: { label: "忘れ物｜持ち主待ち", short: "忘れ物" },
  available: { label: "貸出｜利用可能", short: "貸出・利用可能" },
  loaned: { label: "貸出｜貸出中", short: "貸出・貸出中" },
  claimed: { label: "忘れ物｜確認中", short: "忘れ物・確認中" },
};

function formatDate(dateString) {
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric" }).format(new Date(`${dateString}T00:00:00`));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function renderUserCards() {
  const grid = document.querySelector("#umbrella-grid");
  const filtered = umbrellas.filter((item) => item.status === "waiting" && !item.claimed);

  if (!filtered.length) {
    grid.innerHTML = '<p class="empty-state">現在表示できる傘はありません。</p>';
    return;
  }

  grid.innerHTML = filtered.map((item) => {
    const days = diffDays(item.foundDate);
    const remaining = Math.max(0, 14 - days);
    const message = item.status === "waiting" ? `あと${remaining}日、持ち主を待ちます` : item.status === "available" ? "貸し出しできます" : "現在貸出中です";
    const claimAction = item.status === "waiting" && days < 14
      ? `<button class="claim-button" data-claim-id="${item.id}" type="button">私の傘かも</button>`
      : "";
    return `<article class="umbrella-card">
      <div class="card-image"><img src="${item.image}" alt="${escapeHtml(item.name)}" /><span class="status-badge ${item.status}">${statusInfo[item.status].label}</span></div>
      <div class="card-body">
        <h3>${escapeHtml(item.name)}</h3>
        <ul class="meta-list"><li>⌖ ${escapeHtml(item.location)}</li><li>＋ ${formatDate(item.foundDate)}に発見</li><li>${escapeHtml(item.type)}</li></ul>
        <div class="card-bottom"><p class="card-message">${message}</p>${claimAction}</div>
      </div>
    </article>`;
  }).join("");
}

function renderAdminList() {
  const filtered = umbrellas.filter((item) => adminListFilter === "forgotten"
    ? ["waiting", "claimed"].includes(item.status)
    : ["available", "loaned"].includes(item.status));
  document.querySelector("#inventory-count").textContent = `${filtered.length} ITEMS`;
  document.querySelector("#admin-list").innerHTML = filtered.map((item) => {
    const action = adminListFilter === "forgotten"
      ? `<button class="action-button delete" data-action="delete" data-id="${item.id}">持ち主が見つかったので削除</button>`
      : item.status === "loaned"
        ? `<button class="action-button return" data-action="return" data-id="${item.id}">返却する</button>`
        : `<button class="action-button" data-action="loan" data-id="${item.id}">貸し出す</button>`;
    return `<article class="admin-item">
      <img src="${item.image}" alt="" />
      <div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.type)} ／ ${escapeHtml(item.location)}<br />発見から${diffDays(item.foundDate)}日</p><span class="status-badge ${item.status}">${statusInfo[item.status].short}</span></div>
      <div class="item-actions">${action}</div>
    </article>`;
  }).join("");
}

function renderAll() {
  updateEligibility();
  renderUserCards();
  renderAdminList();
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("画像を読み込めませんでした"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("画像を表示できませんでした"));
      image.onload = () => {
        const maxSize = 1200;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function resetUpload() {
  selectedImage = null;
  document.querySelector("#upload-preview").hidden = true;
  document.querySelector("#upload-preview").removeAttribute("src");
  document.querySelector("#upload-placeholder").hidden = false;
  document.querySelector("#change-photo").hidden = true;
}

function showToast(message, duration = 2600) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), duration);
}

document.querySelector("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  attemptLogin(form.get("id").trim(), form.get("password"));
});

document.querySelectorAll("[data-demo-login]").forEach((button) => {
  button.addEventListener("click", () => {
    const role = button.dataset.demoLogin;
    document.querySelector("#login-id").value = role;
    document.querySelector("#login-password").value = role;
    attemptLogin(role, role);
  });
});

document.querySelector("#logout-button").addEventListener("click", showLogin);

document.querySelector("#umbrella-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-claim-id]");
  if (!button) return;
  claimTargetId = button.dataset.claimId;
  const umbrella = umbrellas.find((item) => item.id === claimTargetId);
  document.querySelector("#claim-copy").textContent = `「${umbrella.name}」（${umbrella.location}で発見）の持ち主確認を申請します。`;
  document.querySelector("#claim-note").value = "";
  document.querySelector("#claim-dialog").showModal();
});

document.querySelector("#confirm-claim").addEventListener("click", (event) => {
  event.preventDefault();
  const note = document.querySelector("#claim-note").value.trim();
  if (!note) { showToast("確認用のメモを入力してください"); return; }
  const umbrella = umbrellas.find((item) => item.id === claimTargetId);
  umbrella.status = "claimed";
  umbrella.claimed = true;
  umbrella.claimNote = note;
  saveData();
  document.querySelector("#claim-dialog").close();
  renderAll();
  showToast("申請を受け付けました。忘れ物管理室までお越しください。", 5000);
});

document.querySelector("#umbrella-image").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) { resetUpload(); return; }
  if (!file.type.startsWith("image/")) { event.target.value = ""; showToast("画像ファイルを選択してください"); return; }
  try {
    selectedImage = await compressImage(file);
    const preview = document.querySelector("#upload-preview");
    preview.src = selectedImage;
    preview.hidden = false;
    document.querySelector("#upload-placeholder").hidden = true;
    document.querySelector("#change-photo").hidden = false;
  } catch (error) {
    event.target.value = "";
    resetUpload();
    showToast(error.message);
  }
});

document.querySelector("#registration-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const foundDate = form.get("foundDate");
  if (!selectedImage) { showToast("傘の写真をアップロードしてください"); return; }
  umbrellas.unshift({
    id: crypto.randomUUID(), name: form.get("name").trim(), type: form.get("type"), location: form.get("location").trim(), foundDate,
    image: selectedImage, status: diffDays(foundDate) >= 14 ? "available" : "waiting", claimed: false,
  });
  saveData();
  event.currentTarget.reset();
  resetUpload();
  document.querySelector("#umbrella-date").value = new Date().toISOString().slice(0, 10);
  renderAll();
  showToast("傘を登録しました");
});

document.querySelector("#admin-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const umbrella = umbrellas.find((item) => item.id === button.dataset.id);
  if (button.dataset.action === "delete") {
    if (!window.confirm(`「${umbrella.name}」を削除しますか？`)) return;
    umbrellas = umbrellas.filter((item) => item.id !== umbrella.id);
    saveData();
    renderAll();
    showToast("傘を削除しました");
    return;
  }
  if (button.dataset.action === "loan") { umbrella.status = "loaned"; showToast("貸し出しを記録しました。いってらっしゃい！"); }
  if (button.dataset.action === "return") { umbrella.status = "available"; showToast("返却を記録しました。おかえりなさい！"); }
  saveData();
  renderAll();
});

document.querySelectorAll("[data-admin-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    adminListFilter = button.dataset.adminFilter;
    document.querySelectorAll("[data-admin-filter]").forEach((tab) => {
      const isActive = tab === button;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
    renderAdminList();
  });
});

document.querySelector("#reset-data").addEventListener("click", () => {
  if (!window.confirm("登録や貸出の変更をすべて初期状態に戻しますか？")) return;
  umbrellas = initialData();
  saveData();
  renderAll();
  showToast("デモデータを初期状態に戻しました");
});

document.querySelector("#umbrella-date").max = new Date().toISOString().slice(0, 10);
document.querySelector("#umbrella-date").value = new Date().toISOString().slice(0, 10);
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date());
renderAll();
const savedRole = sessionStorage.getItem(SESSION_KEY);
if (savedRole === "user" || savedRole === "admin") showApp(savedRole);
else showLogin();
