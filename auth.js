const ADMIN_NAME = "administrator";
const DEFAULT_ADMIN_PASSWORD = "super1234!@#$";
const SESSION_USER_KEY = "todowork_user";
const SESSION_ADMIN_KEY = "todowork_admin";

const firebaseConfig = {
  apiKey: "AIzaSyBSE1eH5ZrB_K4UEVoXC92jzb2e_UWrQe4",
  authDomain: "todowork-1af26.firebaseapp.com",
  databaseURL: "https://todowork-1af26-default-rtdb.firebaseio.com",
  projectId: "todowork-1af26",
  storageBucket: "todowork-1af26.firebasestorage.app",
  messagingSenderId: "410637187154",
  appId: "1:410637187154:web:977d3c438bff17ce34c78b",
  measurementId: "G-CPJYSN3ZMF",
};

firebase.initializeApp(firebaseConfig);
const accountRef = firebase.database().ref("account");

const loginScreen = document.getElementById("login-screen");
const adminScreen = document.getElementById("admin-screen");
const mainApp = document.getElementById("main-app");
const loginForm = document.getElementById("login-form");
const loginNameInput = document.getElementById("login-name");
const loginPasswordInput = document.getElementById("login-password");
const loginErrorEl = document.getElementById("login-error");
const goAdminBtn = document.getElementById("go-admin-btn");
const backToLoginBtn = document.getElementById("back-to-login-btn");
const adminLoginPanel = document.getElementById("admin-login-panel");
const adminManagementPanel = document.getElementById("admin-management-panel");
const adminLoginForm = document.getElementById("admin-login-form");
const adminLoginPasswordInput = document.getElementById("admin-login-password");
const adminLoginErrorEl = document.getElementById("admin-login-error");
const adminPasswordForm = document.getElementById("admin-password-form");
const adminAccountPasswordInput = document.getElementById("admin-account-password");
const adminUserListEl = document.getElementById("admin-user-list");
const adminUserEmptyEl = document.getElementById("admin-user-empty");
const openAddUserBtn = document.getElementById("open-add-user-btn");
const adminLogoutBtn = document.getElementById("admin-logout-btn");
const userModalOverlay = document.getElementById("user-modal-overlay");
const userForm = document.getElementById("user-form");
const userModalTitleEl = document.getElementById("user-modal-title");
const userFormNameInput = document.getElementById("user-form-name");
const userFormPasswordInput = document.getElementById("user-form-password");
const closeUserModalBtn = document.getElementById("close-user-modal-btn");
const cancelUserModalBtn = document.getElementById("cancel-user-modal-btn");
const loggedInUserEl = document.getElementById("logged-in-user");
const loggedInTimeEl = document.getElementById("logged-in-time");
const logoutBtn = document.getElementById("logout-btn");

let accounts = [];
let adminAccount = null;
let editingUserId = null;
let isAdminLoggedIn = false;

function formatDateTime(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function mapAccount(id, data) {
  if (!data) return null;
  return {
    id,
    name: data.name || "",
    pwd: data.pwd || "",
    createdtime: data.createdtime || 0,
    accessedcount: data.accessedcount || 0,
  };
}

function isAdministrator(account) {
  return account && account.name === ADMIN_NAME;
}

function showScreen(screen) {
  loginScreen.hidden = screen !== "login";
  adminScreen.hidden = screen !== "admin";
  mainApp.hidden = screen !== "main";
}

function showLoginError(message) {
  loginErrorEl.textContent = message;
  loginErrorEl.hidden = !message;
}

function showAdminLoginError(message) {
  adminLoginErrorEl.textContent = message;
  adminLoginErrorEl.hidden = !message;
}

function saveUserSession(user, loginTime) {
  sessionStorage.setItem(
    SESSION_USER_KEY,
    JSON.stringify({ id: user.id, name: user.name, loginTime })
  );
}

function getUserSession() {
  const raw = sessionStorage.getItem(SESSION_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function clearUserSession() {
  sessionStorage.removeItem(SESSION_USER_KEY);
}

function saveAdminSession(loggedIn) {
  if (loggedIn) {
    sessionStorage.setItem(SESSION_ADMIN_KEY, "true");
  } else {
    sessionStorage.removeItem(SESSION_ADMIN_KEY);
  }
}

function isAdminSessionActive() {
  return sessionStorage.getItem(SESSION_ADMIN_KEY) === "true";
}

function updateUserSessionBar(session) {
  loggedInUserEl.textContent = `${session.name}님`;
  loggedInTimeEl.textContent = `로그인: ${formatDateTime(session.loginTime)}`;
}

function enterMainApp(session) {
  showScreen("main");
  updateUserSessionBar(session);
  if (typeof window.initTodoApp === "function") {
    window.initTodoApp();
  }
}

async function ensureAdministratorAccount() {
  const snapshot = await accountRef.orderByChild("name").equalTo(ADMIN_NAME).once("value");
  if (snapshot.exists()) return;

  await accountRef.push({
    name: ADMIN_NAME,
    pwd: DEFAULT_ADMIN_PASSWORD,
    createdtime: Date.now(),
    accessedcount: 0,
  });
}

function syncAccountsFromSnapshot(snapshot) {
  const data = snapshot.val();
  accounts = [];
  adminAccount = null;

  if (data) {
    Object.entries(data).forEach(([id, accountData]) => {
      const account = mapAccount(id, accountData);
      if (!account) return;
      if (isAdministrator(account)) {
        adminAccount = account;
      } else {
        accounts.push(account);
      }
    });
  }

  accounts.sort((a, b) => a.createdtime - b.createdtime);

  if (isAdminLoggedIn) {
    renderAdminManagement();
  }
}

function subscribeToAccounts() {
  accountRef.on(
    "value",
    (snapshot) => {
      syncAccountsFromSnapshot(snapshot);
    },
    (error) => {
      console.error("Firebase 계정 불러오기 실패:", error);
    }
  );
}

async function findAccountByCredentials(name, pwd) {
  const snapshot = await accountRef.orderByChild("name").equalTo(name).once("value");
  if (!snapshot.exists()) return null;

  let matched = null;
  snapshot.forEach((child) => {
    const account = mapAccount(child.key, child.val());
    if (account && account.pwd === pwd) {
      matched = account;
    }
  });
  return matched;
}

async function incrementAccessCount(accountId) {
  const userRef = accountRef.child(accountId);
  await userRef.transaction((current) => {
    if (!current) return current;
    current.accessedcount = (current.accessedcount || 0) + 1;
    return current;
  });
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  showLoginError("");

  const name = loginNameInput.value.trim();
  const pwd = loginPasswordInput.value;

  if (!name || !pwd) {
    showLoginError("사용자 이름과 패스워드를 입력해 주세요.");
    return;
  }

  if (name === ADMIN_NAME) {
    showLoginError("관리자 계정은 사용자 관리 페이지에서 이용해 주세요.");
    return;
  }

  try {
    const account = await findAccountByCredentials(name, pwd);
    if (!account) {
      showLoginError("사용자 이름 또는 패스워드가 일치하지 않습니다.");
      return;
    }

    await incrementAccessCount(account.id);

    const loginTime = Date.now();
    saveUserSession(account, loginTime);
    loginForm.reset();
    enterMainApp({ id: account.id, name: account.name, loginTime });
  } catch (error) {
    console.error("로그인 실패:", error);
    showLoginError("로그인 중 오류가 발생했습니다.");
  }
}

function showAdminLoginPanel() {
  adminLoginPanel.hidden = false;
  adminManagementPanel.hidden = true;
  isAdminLoggedIn = false;
  saveAdminSession(false);
  adminLoginForm.reset();
  showAdminLoginError("");
}

function showAdminManagementPanel() {
  adminLoginPanel.hidden = true;
  adminManagementPanel.hidden = false;
  isAdminLoggedIn = true;
  saveAdminSession(true);
  renderAdminManagement();
}

async function handleAdminLoginSubmit(e) {
  e.preventDefault();
  showAdminLoginError("");

  const pwd = adminLoginPasswordInput.value;
  if (!pwd) {
    showAdminLoginError("패스워드를 입력해 주세요.");
    return;
  }

  try {
    const account = await findAccountByCredentials(ADMIN_NAME, pwd);
    if (!account) {
      showAdminLoginError("관리자 패스워드가 일치하지 않습니다.");
      return;
    }

    adminLoginForm.reset();
    showAdminManagementPanel();
  } catch (error) {
    console.error("관리자 로그인 실패:", error);
    showAdminLoginError("관리자 로그인 중 오류가 발생했습니다.");
  }
}

function renderAdminManagement() {
  if (adminAccount) {
    adminAccountPasswordInput.value = adminAccount.pwd;
  }

  adminUserListEl.innerHTML = "";
  accounts.forEach((account, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(account.name)}</td>
      <td>${escapeHtml(account.pwd)}</td>
      <td>${formatDateTime(account.createdtime)}</td>
      <td>${account.accessedcount}</td>
      <td class="admin-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="${account.id}">편집</button>
        <button type="button" class="btn btn-secondary btn-sm btn-danger" data-action="delete" data-id="${account.id}">삭제</button>
      </td>
    `;

    adminUserListEl.appendChild(row);
  });

  adminUserEmptyEl.classList.toggle("hidden", accounts.length > 0);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function handleAdminPasswordSubmit(e) {
  e.preventDefault();
  if (!adminAccount) return;

  const pwd = adminAccountPasswordInput.value.trim();
  if (!pwd) {
    alert("패스워드를 입력해 주세요.");
    return;
  }

  try {
    await accountRef.child(adminAccount.id).update({ pwd });
  } catch (error) {
    console.error("관리자 패스워드 저장 실패:", error);
    alert("관리자 패스워드를 저장하지 못했습니다.");
  }
}

function openUserModal(mode, account = null) {
  editingUserId = mode === "edit" ? account.id : null;
  userModalTitleEl.textContent = mode === "edit" ? "사용자 수정" : "신규 사용자 추가";
  userFormNameInput.value = account ? account.name : "";
  userFormPasswordInput.value = account ? account.pwd : "";
  userFormNameInput.readOnly = false;
  userModalOverlay.hidden = false;
  userFormNameInput.focus();
}

function closeUserModal() {
  userModalOverlay.hidden = true;
  editingUserId = null;
  userForm.reset();
  userFormNameInput.readOnly = false;
}

async function isDuplicateName(name, excludeId = null) {
  const snapshot = await accountRef.orderByChild("name").equalTo(name).once("value");
  if (!snapshot.exists()) return false;

  let duplicate = false;
  snapshot.forEach((child) => {
    if (child.key !== excludeId) duplicate = true;
  });
  return duplicate;
}

async function handleUserFormSubmit(e) {
  e.preventDefault();

  const name = userFormNameInput.value.trim();
  const pwd = userFormPasswordInput.value;

  if (!name || !pwd) return;

  if (name === ADMIN_NAME) {
    alert("administrator 이름은 사용할 수 없습니다.");
    return;
  }

  try {
    if (editingUserId) {
      const duplicate = await isDuplicateName(name, editingUserId);
      if (duplicate) {
        alert("이미 사용 중인 사용자 이름입니다.");
        return;
      }

      await accountRef.child(editingUserId).update({ name, pwd });
    } else {
      const duplicate = await isDuplicateName(name);
      if (duplicate) {
        alert("이미 사용 중인 사용자 이름입니다.");
        return;
      }

      await accountRef.push({
        name,
        pwd,
        createdtime: Date.now(),
        accessedcount: 0,
      });
    }

    closeUserModal();
  } catch (error) {
    console.error("사용자 저장 실패:", error);
    alert("사용자 정보를 Firebase에 저장하지 못했습니다.");
  }
}

async function deleteUser(accountId) {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) return;

  if (!confirm(`"${account.name}" 사용자를 삭제하시겠습니까?`)) return;

  try {
    await accountRef.child(accountId).remove();
  } catch (error) {
    console.error("사용자 삭제 실패:", error);
    alert("사용자를 Firebase에서 삭제하지 못했습니다.");
  }
}

function handleLogout() {
  clearUserSession();
  loginForm.reset();
  showLoginError("");
  showScreen("login");
}

function initAuth() {
  loginForm.addEventListener("submit", handleLoginSubmit);
  logoutBtn.addEventListener("click", handleLogout);

  goAdminBtn.addEventListener("click", () => {
    showScreen("admin");
    if (isAdminSessionActive()) {
      showAdminManagementPanel();
    } else {
      showAdminLoginPanel();
    }
  });

  backToLoginBtn.addEventListener("click", () => {
    showScreen("login");
    showAdminLoginPanel();
  });

  adminLoginForm.addEventListener("submit", handleAdminLoginSubmit);
  adminPasswordForm.addEventListener("submit", handleAdminPasswordSubmit);
  adminLogoutBtn.addEventListener("click", showAdminLoginPanel);
  openAddUserBtn.addEventListener("click", () => openUserModal("add"));
  userForm.addEventListener("submit", handleUserFormSubmit);
  closeUserModalBtn.addEventListener("click", closeUserModal);
  cancelUserModalBtn.addEventListener("click", closeUserModal);

  userModalOverlay.addEventListener("click", (e) => {
    if (e.target === userModalOverlay) closeUserModal();
  });

  adminUserListEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const accountId = btn.dataset.id;
    const account = accounts.find((item) => item.id === accountId);
    if (!account) return;

    if (btn.dataset.action === "edit") {
      openUserModal("edit", account);
    } else if (btn.dataset.action === "delete") {
      deleteUser(accountId);
    }
  });

  ensureAdministratorAccount()
    .then(() => {
      subscribeToAccounts();

      const session = getUserSession();
      if (session) {
        enterMainApp(session);
      } else {
        showScreen("login");
      }
    })
    .catch((error) => {
      console.error("계정 초기화 실패:", error);
      showScreen("login");
    });
}

initAuth();
