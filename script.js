const todayLabelEl = document.getElementById("today-label");
const todayListEl = document.getElementById("today-list");
const allListEl = document.getElementById("all-list");
const todayCountEl = document.getElementById("today-count");
const allCountEl = document.getElementById("all-count");
const todayEmptyEl = document.getElementById("today-empty");
const allEmptyEl = document.getElementById("all-empty");
const listViewBtn = document.getElementById("list-view-btn");
const calendarViewBtn = document.getElementById("calendar-view-btn");
const listViewPanel = document.getElementById("list-view-panel");
const calendarViewPanel = document.getElementById("calendar-view-panel");
const calendarGridEl = document.getElementById("calendar-grid");
const calendarTitleEl = document.getElementById("calendar-title");
const calendarEmptyEl = document.getElementById("calendar-empty");
const calendarPrevBtn = document.getElementById("calendar-prev-btn");
const calendarNextBtn = document.getElementById("calendar-next-btn");
const filterAllBtn = document.getElementById("filter-all-btn");
const filterIncompleteBtn = document.getElementById("filter-incomplete-btn");
const filterCompletedBtn = document.getElementById("filter-completed-btn");

const modalOverlay = document.getElementById("modal-overlay");
const detailModalOverlay = document.getElementById("detail-modal-overlay");
const openModalBtn = document.getElementById("open-modal-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelBtn = document.getElementById("cancel-btn");
const closeDetailModalBtn = document.getElementById("close-detail-modal-btn");
const detailCloseBtn = document.getElementById("detail-close-btn");
const detailEditBtn = document.getElementById("detail-edit-btn");
const detailCompleteBtn = document.getElementById("detail-complete-btn");
const detailForm = document.getElementById("detail-form");
const taskForm = document.getElementById("task-form");
const taskTitleInput = document.getElementById("task-title");
const taskDetailInput = document.getElementById("task-detail");
const taskDateInput = document.getElementById("task-date");
const detailTitleEl = document.getElementById("detail-title");
const detailDetailEl = document.getElementById("detail-detail");
const detailDateEl = document.getElementById("detail-date");
const detailEditTitleInput = document.getElementById("detail-edit-title");
const detailEditDetailInput = document.getElementById("detail-edit-detail");
const detailEditDateInput = document.getElementById("detail-edit-date");
const detailModalTitleEl = document.getElementById("detail-modal-title");

let tasks = [];
let currentDetailTaskId = null;
let isDetailEditMode = false;
let currentView = "list";
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let listFilter = "all";

function getTask(id) {
  return tasks.find((t) => t.id === id);
}

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
}

function formatTodayHeader() {
  const now = new Date();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const w = weekdays[now.getDay()];
  todayLabelEl.textContent = `${y}년 ${m}월 ${d}일 (${w})`;
}

function sortByTimeOrder(taskList) {
  return [...taskList].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt - b.createdAt;
  });
}

function sortByRecent(taskList) {
  return [...taskList].sort((a, b) => b.createdAt - a.createdAt);
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task-item" + (task.completed ? " completed" : "");
  li.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.addEventListener("click", (e) => e.stopPropagation());
  checkbox.addEventListener("change", () => toggleComplete(task.id));

  const body = document.createElement("div");
  body.className = "task-body";
  body.setAttribute("role", "button");
  body.setAttribute("tabindex", "0");
  body.setAttribute("aria-label", `${task.title} 상세 보기`);
  body.addEventListener("click", () => openDetailModal(task.id));
  body.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetailModal(task.id);
    }
  });

  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = task.title;

  const detail = document.createElement("div");
  detail.className = "task-detail";
  detail.textContent = task.detail || "상세 내용 없음";
  if (!task.detail) detail.style.fontStyle = "italic";

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const dateSpan = document.createElement("span");
  dateSpan.className = "task-date";
  dateSpan.textContent = formatDateLabel(task.date);

  meta.appendChild(dateSpan);
  body.appendChild(title);
  body.appendChild(detail);
  body.appendChild(meta);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "task-delete";
  deleteBtn.setAttribute("aria-label", "삭제");
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteTask(task.id);
  });

  li.appendChild(checkbox);
  li.appendChild(body);
  li.appendChild(deleteBtn);

  return li;
}

function createCalendarTaskElement(task) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "calendar-task" + (task.completed ? " completed" : "");
  item.textContent = task.title;
  item.title = task.title;
  item.addEventListener("click", (e) => {
    e.stopPropagation();
    openDetailModal(task.id);
  });
  return item;
}

function filterTasksForList(taskList) {
  if (listFilter === "incomplete") {
    return taskList.filter((task) => !task.completed);
  }
  if (listFilter === "completed") {
    return taskList.filter((task) => task.completed);
  }
  return taskList;
}

function getListEmptyMessage() {
  if (listFilter === "incomplete") return "미완료 할 일이 없습니다.";
  if (listFilter === "completed") return "완료된 할 일이 없습니다.";
  return "아직 등록된 할 일이 없습니다.";
}

function renderListView() {
  const filtered = filterTasksForList(tasks);
  const sorted = sortByTimeOrder(filtered);

  allListEl.innerHTML = "";
  sorted.forEach((task) => {
    allListEl.appendChild(createTaskElement(task));
  });

  allCountEl.textContent = filtered.length;
  allEmptyEl.textContent = getListEmptyMessage();
  allEmptyEl.classList.toggle("hidden", filtered.length > 0);
}

function setListFilter(filter) {
  listFilter = filter;
  filterAllBtn.classList.toggle("active", filter === "all");
  filterIncompleteBtn.classList.toggle("active", filter === "incomplete");
  filterCompletedBtn.classList.toggle("active", filter === "completed");
  renderListView();
}

function renderCalendarView() {
  const today = getTodayString();
  const monthTasks = tasks.filter((task) => {
    const [y, m] = task.date.split("-").map(Number);
    return y === calendarYear && m - 1 === calendarMonth;
  });

  calendarTitleEl.textContent = `${calendarYear}년 ${calendarMonth + 1}월`;
  calendarGridEl.innerHTML = "";

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day empty";
    calendarGridEl.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTasks = sortByTimeOrder(tasks.filter((t) => t.date === dateStr));

    const cell = document.createElement("div");
    cell.className = "calendar-day";
    if (dateStr === today) cell.classList.add("today");

    const dayNumber = document.createElement("span");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = day;

    const taskList = document.createElement("div");
    taskList.className = "calendar-day-tasks";
    dayTasks.forEach((task) => {
      taskList.appendChild(createCalendarTaskElement(task));
    });

    cell.appendChild(dayNumber);
    cell.appendChild(taskList);
    calendarGridEl.appendChild(cell);
  }

  calendarEmptyEl.classList.toggle("hidden", monthTasks.length > 0);
}

function render() {
  const today = getTodayString();
  const todayTasks = sortByRecent(tasks.filter((t) => t.date === today));

  todayListEl.innerHTML = "";
  todayTasks.forEach((task) => {
    todayListEl.appendChild(createTaskElement(task));
  });

  todayCountEl.textContent = todayTasks.length;
  todayEmptyEl.classList.toggle("hidden", todayTasks.length > 0);

  if (currentView === "list") {
    renderListView();
  } else {
    renderCalendarView();
  }

  if (currentDetailTaskId && !detailModalOverlay.hidden) {
    refreshDetailModal();
  }
}

function setView(view) {
  currentView = view;
  listViewBtn.classList.toggle("active", view === "list");
  calendarViewBtn.classList.toggle("active", view === "calendar");
  listViewPanel.hidden = view !== "list";
  calendarViewPanel.hidden = view !== "calendar";
  document.querySelector(".app").classList.toggle("calendar-mode", view === "calendar");
  render();
}

function changeCalendarMonth(delta) {
  calendarMonth += delta;
  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear += 1;
  } else if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear -= 1;
  }
  renderCalendarView();
}

function openModal() {
  taskForm.reset();
  taskDateInput.value = getTodayString();
  modalOverlay.hidden = false;
  taskTitleInput.focus();
}

function closeModal() {
  modalOverlay.hidden = true;
  taskForm.reset();
}

function setDetailEditMode(editing) {
  isDetailEditMode = editing;

  document.querySelectorAll(".detail-view").forEach((el) => {
    el.hidden = editing;
  });
  document.querySelectorAll(".detail-edit").forEach((el) => {
    el.hidden = !editing;
  });

  detailEditBtn.textContent = editing ? "저장" : "편집";
  detailCompleteBtn.hidden = editing;
  detailCloseBtn.textContent = editing ? "취소" : "닫기";

  if (editing) {
    detailEditTitleInput.focus();
  }
}

function populateDetailModal(task) {
  detailTitleEl.textContent = task.title;
  detailDetailEl.textContent = task.detail || "상세 내용 없음";
  detailDetailEl.classList.toggle("empty", !task.detail);
  detailDateEl.textContent = formatDateLabel(task.date);

  detailEditTitleInput.value = task.title;
  detailEditDetailInput.value = task.detail;
  detailEditDateInput.value = task.date;

  detailCompleteBtn.textContent = task.completed ? "미완료" : "완료";
  detailCompleteBtn.classList.toggle("btn-warning", task.completed);
  detailCompleteBtn.classList.toggle("btn-success", !task.completed);

  detailModalTitleEl.textContent = task.completed ? "할 일 상세 (완료됨)" : "할 일 상세";
}

function refreshDetailModal() {
  const task = getTask(currentDetailTaskId);
  if (!task) {
    closeDetailModal();
    return;
  }
  populateDetailModal(task);
}

function openDetailModal(taskId) {
  const task = getTask(taskId);
  if (!task) return;

  currentDetailTaskId = taskId;
  setDetailEditMode(false);
  populateDetailModal(task);
  detailModalOverlay.hidden = false;
}

function closeDetailModal() {
  detailModalOverlay.hidden = true;
  currentDetailTaskId = null;
  setDetailEditMode(false);
}

function saveDetailEdit() {
  const task = getTask(currentDetailTaskId);
  if (!task) return;

  const title = detailEditTitleInput.value.trim();
  const detail = detailEditDetailInput.value.trim();
  const date = detailEditDateInput.value;

  if (!title || !date) {
    detailEditTitleInput.focus();
    return;
  }

  task.title = title;
  task.detail = detail;
  task.date = date;

  setDetailEditMode(false);
  populateDetailModal(task);
  render();
}

function handleDetailEditClick() {
  if (isDetailEditMode) {
    saveDetailEdit();
  } else {
    setDetailEditMode(true);
  }
}

function handleDetailCloseClick() {
  if (isDetailEditMode) {
    refreshDetailModal();
    setDetailEditMode(false);
  } else {
    closeDetailModal();
  }
}

function toggleDetailComplete() {
  if (!currentDetailTaskId) return;
  toggleComplete(currentDetailTaskId);
  refreshDetailModal();
}

function addTask(title, detail, date) {
  const task = {
    id: crypto.randomUUID(),
    title: title.trim(),
    detail: detail.trim(),
    date,
    completed: false,
    createdAt: Date.now(),
  };

  tasks.unshift(task);
  render();
}

function toggleComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    render();
  }
}

function deleteTask(id) {
  if (currentDetailTaskId === id) {
    closeDetailModal();
  }
  tasks = tasks.filter((t) => t.id !== id);
  render();
}

listViewBtn.addEventListener("click", () => setView("list"));
calendarViewBtn.addEventListener("click", () => setView("calendar"));
filterAllBtn.addEventListener("click", () => setListFilter("all"));
filterIncompleteBtn.addEventListener("click", () => setListFilter("incomplete"));
filterCompletedBtn.addEventListener("click", () => setListFilter("completed"));
calendarPrevBtn.addEventListener("click", () => changeCalendarMonth(-1));
calendarNextBtn.addEventListener("click", () => changeCalendarMonth(1));

openModalBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

detailModalOverlay.addEventListener("click", (e) => {
  if (e.target === detailModalOverlay) handleDetailCloseClick();
});

closeDetailModalBtn.addEventListener("click", handleDetailCloseClick);
detailCloseBtn.addEventListener("click", handleDetailCloseClick);
detailEditBtn.addEventListener("click", handleDetailEditClick);
detailCompleteBtn.addEventListener("click", toggleDetailComplete);

detailForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (isDetailEditMode) saveDetailEdit();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!detailModalOverlay.hidden) handleDetailCloseClick();
  else if (!modalOverlay.hidden) closeModal();
});

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = taskTitleInput.value;
  const detail = taskDetailInput.value;
  const date = taskDateInput.value;

  if (!title.trim() || !date) return;

  addTask(title, detail, date);
  closeModal();
});

formatTodayHeader();
setView("list");
