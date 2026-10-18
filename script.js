/* StudentHub — student records, validation, filters, and local persistence */
"use strict";

const STORAGE_KEY = "studentHubRecords_v1";
const COURSE_OPTIONS = [
  "Computer Science",
  "Information Technology",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electronics Engineering",
  "Business Administration"
];

const elements = {
  form: document.querySelector("#studentForm"),
  editId: document.querySelector("#editStudentId"),
  id: document.querySelector("#studentId"),
  name: document.querySelector("#studentName"),
  email: document.querySelector("#studentEmail"),
  course: document.querySelector("#studentCourse"),
  year: document.querySelector("#studentYear"),
  marks: document.querySelector("#studentMarks"),
  status: document.querySelector("#studentStatus"),
  formTitle: document.querySelector("#formTitle"),
  formMessage: document.querySelector("#formMessage"),
  saveButton: document.querySelector("#saveStudent"),
  cancelEdit: document.querySelector("#cancelEdit"),
  clearForm: document.querySelector("#clearForm"),
  tableBody: document.querySelector("#studentTableBody"),
  search: document.querySelector("#searchInput"),
  courseFilter: document.querySelector("#courseFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  resetFilters: document.querySelector("#resetFilters"),
  totalStudents: document.querySelector("#totalStudents"),
  activeStudents: document.querySelector("#activeStudents"),
  averageMarks: document.querySelector("#averageMarks"),
  totalCourses: document.querySelector("#totalCourses"),
  recordCount: document.querySelector("#recordCount"),
  tableCount: document.querySelector("#tableCount"),
  exportCsv: document.querySelector("#exportCsv"),
  toastContainer: document.querySelector("#toastContainer"),
  currentDate: document.querySelector("#currentDate"),
  currentYear: document.querySelector("#currentYear"),
  mobileMenuButton: document.querySelector("#mobileMenuButton"),
  sidebar: document.querySelector("#sidebar"),
  sidebarScrim: document.querySelector("#sidebarScrim")
};

let students = loadStudents();
let toastTimerIds = [];

function loadStudents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((student) =>
      student &&
      typeof student.id === "string" &&
      typeof student.name === "string" &&
      typeof student.email === "string" &&
      typeof student.course === "string" &&
      typeof student.year === "string" &&
      Number.isFinite(Number(student.marks)) &&
      ["Active", "Inactive"].includes(student.status)
    ).map((student) => ({
      ...student,
      marks: Number(student.marks),
      createdAt: student.createdAt || new Date().toISOString()
    }));
  } catch (error) {
    console.error("StudentHub could not read saved records:", error);
    return [];
  }
}

function saveStudents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    return true;
  } catch (error) {
    console.error("StudentHub could not save records:", error);
    showToast("Storage unavailable", "Your browser could not save these changes. Check browser storage settings.", "error");
    return false;
  }
}

function normalize(value) {
  return String(value ?? "").trim();
}

function getGrade(marks) {
  if (marks >= 90) return { label: "A+", className: "grade-a" };
  if (marks >= 80) return { label: "A", className: "grade-a" };
  if (marks >= 70) return { label: "B", className: "grade-b" };
  if (marks >= 60) return { label: "C", className: "grade-c" };
  if (marks >= 40) return { label: "D", className: "grade-d" };
  return { label: "F", className: "grade-f" };
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getInitials(name) {
  return normalize(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "ST";
}

function getAvatarClass(index) {
  return `avatar-${index % 5}`;
}

function showToast(title, message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " error" : ""}`;
  const symbol = type === "error" ? "!" : "✓";
  toast.innerHTML = `
    <span class="toast-symbol" aria-hidden="true">${symbol}</span>
    <div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(message)}</p></div>
  `;
  elements.toastContainer.appendChild(toast);

  const timerId = window.setTimeout(() => {
    toast.classList.add("toast-out");
    window.setTimeout(() => toast.remove(), 250);
  }, 3600);
  toastTimerIds.push(timerId);
}

function setFormMessage(message = "", type = "") {
  elements.formMessage.textContent = message;
  elements.formMessage.className = `form-message${type ? ` ${type}` : ""}`;
}

function clearInvalidStates() {
  elements.form.querySelectorAll("[aria-invalid='true']").forEach((field) => {
    field.removeAttribute("aria-invalid");
  });
}

function markInvalid(field, message) {
  field.setAttribute("aria-invalid", "true");
  setFormMessage(message, "error");
  field.focus();
}

function validateForm() {
  clearInvalidStates();
  setFormMessage("");

  const id = normalize(elements.id.value).toUpperCase();
  const name = normalize(elements.name.value);
  const email = normalize(elements.email.value).toLowerCase();
  const course = elements.course.value;
  const year = elements.year.value;
  const marksText = normalize(elements.marks.value);
  const status = elements.status.value;
  const marks = Number(marksText);

  if (!id) return markInvalid(elements.id, "Please enter a student ID."), null;
  if (!/^[A-Z0-9][A-Z0-9_-]{1,19}$/.test(id)) {
    return markInvalid(elements.id, "Use 2–20 characters: letters, numbers, hyphens, or underscores."), null;
  }
  if (!name || name.length < 2 || !/^[\p{L}][\p{L}\p{M} .'-]*$/u.test(name)) {
    return markInvalid(elements.name, "Enter a valid full name using letters and common name punctuation."), null;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return markInvalid(elements.email, "Enter a valid email address, such as name@example.com."), null;
  }
  if (!COURSE_OPTIONS.includes(course)) {
    return markInvalid(elements.course, "Please select a course from the list."), null;
  }
  if (!["1st Year", "2nd Year", "3rd Year", "4th Year"].includes(year)) {
    return markInvalid(elements.year, "Please select an academic year."), null;
  }
  if (marksText === "" || !Number.isFinite(marks) || marks < 0 || marks > 100) {
    return markInvalid(elements.marks, "Marks must be a number between 0 and 100."), null;
  }
  if (!["Active", "Inactive"].includes(status)) {
    return markInvalid(elements.status, "Please select a valid student status."), null;
  }

  const editingId = elements.editId.value;
  const duplicateId = students.some((student) =>
    student.id.toUpperCase() === id && student.id !== editingId
  );
  if (duplicateId) {
    return markInvalid(elements.id, "This student ID already exists. Please use a unique ID."), null;
  }

  const duplicateEmail = students.some((student) =>
    student.email.toLowerCase() === email && student.id !== editingId
  );
  if (duplicateEmail) {
    return markInvalid(elements.email, "This email is already assigned to another student."), null;
  }

  return { id, name, email, course, year, marks: Math.round(marks * 100) / 100, status };
}

function renderStats() {
  const total = students.length;
  const active = students.filter((student) => student.status === "Active").length;
  const average = total
    ? students.reduce((sum, student) => sum + student.marks, 0) / total
    : 0;
  const courses = new Set(students.map((student) => student.course));

  elements.totalStudents.textContent = String(total);
  elements.activeStudents.textContent = String(active);
  elements.averageMarks.textContent = `${average.toFixed(1)}%`;
  elements.totalCourses.textContent = String(courses.size);
}

function renderCourseFilter() {
  const selected = elements.courseFilter.value;
  const availableCourses = [...new Set([
    ...COURSE_OPTIONS,
    ...students.map((student) => student.course)
  ])].sort((a, b) => a.localeCompare(b));

  elements.courseFilter.replaceChildren(new Option("All courses", ""));
  availableCourses.forEach((course) => {
    elements.courseFilter.add(new Option(course, course));
  });
  if (availableCourses.includes(selected)) elements.courseFilter.value = selected;
}

function getFilteredStudents() {
  const query = normalize(elements.search.value).toLowerCase();
  const course = elements.courseFilter.value;
  const status = elements.statusFilter.value;

  return students
    .filter((student) => {
      const searchable = [student.id, student.name, student.email, student.course, student.year]
        .join(" ").toLowerCase();
      return (!query || searchable.includes(query)) &&
        (!course || student.course === course) &&
        (!status || student.status === status);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderTable() {
  const filteredStudents = getFilteredStudents();
  elements.tableBody.replaceChildren();

  if (filteredStudents.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.className = "empty-state";
    const icon = document.createElement("span");
    icon.className = "empty-icon";
    icon.textContent = "▤";
    const heading = document.createElement("strong");
    const detail = document.createElement("span");
    if (students.length === 0) {
      heading.textContent = "No student records yet";
      detail.textContent = "Add your first student using the form above.";
    } else {
      heading.textContent = "No matching students";
      detail.textContent = "Try another search term or reset your filters.";
    }
    cell.append(icon, heading, detail);
    row.appendChild(cell);
    elements.tableBody.appendChild(row);
  } else {
    filteredStudents.forEach((student, index) => {
      const grade = getGrade(student.marks);
      const row = document.createElement("tr");
      const safeId = escapeHTML(student.id);
      const safeName = escapeHTML(student.name);
      const safeEmail = escapeHTML(student.email);
      const safeCourse = escapeHTML(student.course);
      const safeYear = escapeHTML(student.year);
      const avatarClass = getAvatarClass(index);
      const statusClass = student.status === "Active" ? "status-active" : "status-inactive";

      row.innerHTML = `
        <td data-label="Student">
          <div class="student-cell">
            <span class="student-avatar ${avatarClass}">${escapeHTML(getInitials(student.name))}</span>
            <span>
              <span class="student-name">${safeName}</span>
              <span class="student-email">${safeEmail}</span>
              <span class="student-email">ID: ${safeId}</span>
            </span>
          </div>
        </td>
        <td data-label="Course">${safeCourse}</td>
        <td data-label="Year">${safeYear}</td>
        <td data-label="Marks" class="marks-cell">${student.marks.toFixed(2).replace(/\.00$/, "")}%</td>
        <td data-label="Grade"><span class="grade-badge ${grade.className}">${grade.label}</span></td>
        <td data-label="Status"><span class="status-badge ${statusClass}">${student.status}</span></td>
        <td data-label="Actions">
          <div class="action-group">
            <button class="action-button" type="button" data-action="edit" data-id="${safeId}" aria-label="Edit ${safeName}" title="Edit student">✎</button>
            <button class="action-button delete" type="button" data-action="delete" data-id="${safeId}" aria-label="Delete ${safeName}" title="Delete student">⌫</button>
          </div>
        </td>
      `;
      elements.tableBody.appendChild(row);
    });
  }

  elements.recordCount.textContent = `Showing ${filteredStudents.length} of ${students.length} student${students.length === 1 ? "" : "s"}`;
  elements.tableCount.textContent = String(students.length);
}

function renderApp() {
  renderStats();
  renderCourseFilter();
  renderTable();
}

function resetFormState() {
  elements.form.reset();
  elements.editId.value = "";
  elements.formTitle.textContent = "Add a student";
  elements.saveButton.innerHTML = '<span class="button-plus">＋</span> Save student';
  elements.cancelEdit.hidden = true;
  clearInvalidStates();
  setFormMessage("");
}

function startEditing(studentId) {
  const student = students.find((record) => record.id === studentId);
  if (!student) {
    showToast("Record not found", "This student may have already been removed.", "error");
    return;
  }

  elements.editId.value = student.id;
  elements.id.value = student.id;
  elements.name.value = student.name;
  elements.email.value = student.email;
  elements.course.value = student.course;
  elements.year.value = student.year;
  elements.marks.value = String(student.marks);
  elements.status.value = student.status;
  elements.formTitle.textContent = "Edit student details";
  elements.saveButton.textContent = "Update student";
  elements.cancelEdit.hidden = false;
  clearInvalidStates();
  setFormMessage("Editing an existing record. Save your changes when ready.", "success");
  document.querySelector("#student-form").scrollIntoView({ behavior: "smooth", block: "start" });
  elements.name.focus({ preventScroll: true });
}

function deleteStudent(studentId) {
  const student = students.find((record) => record.id === studentId);
  if (!student) {
    showToast("Record not found", "The student record could not be located.", "error");
    return;
  }

  const confirmed = window.confirm(`Delete the record for ${student.name} (${student.id})? This action cannot be undone.`);
  if (!confirmed) return;

  const previousStudents = students;
  students = students.filter((record) => record.id !== studentId);
  if (!saveStudents()) {
    students = previousStudents;
    return;
  }

  if (elements.editId.value === studentId) resetFormState();
  renderApp();
  showToast("Student deleted", `${student.name}'s record was removed.`);
}

function handleFormSubmit(event) {
  event.preventDefault();
  const data = validateForm();
  if (!data) return;

  const editingId = elements.editId.value;
  if (editingId) {
    const index = students.findIndex((student) => student.id === editingId);
    if (index === -1) {
      setFormMessage("This record no longer exists. Please add the student again.", "error");
      return;
    }

    const updatedRecord = { ...students[index], ...data, updatedAt: new Date().toISOString() };
    const previousStudents = students;
    students = students.map((student) => student.id === editingId ? updatedRecord : student);
    if (!saveStudents()) {
      students = previousStudents;
      return;
    }
    resetFormState();
    renderApp();
    showToast("Changes saved", `${data.name}'s record was updated successfully.`);
  } else {
    const newRecord = { ...data, createdAt: new Date().toISOString() };
    const previousStudents = students;
    students = [...students, newRecord];
    if (!saveStudents()) {
      students = previousStudents;
      return;
    }
    resetFormState();
    renderApp();
    showToast("Student added", `${data.name} has been added to the directory.`);
  }
}

function exportCsv() {
  if (students.length === 0) {
    showToast("Nothing to export", "Add at least one student before exporting a CSV file.", "error");
    return;
  }

  const headers = ["Student ID", "Full Name", "Email", "Course", "Academic Year", "Marks (%)", "Grade", "Status"];
  const rows = students.map((student) => [
    student.id,
    student.name,
    student.email,
    student.course,
    student.year,
    student.marks,
    getGrade(student.marks).label,
    student.status
  ]);
  const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `student-records-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("CSV exported", `${students.length} student record(s) were exported.`);
}

function resetFilters() {
  elements.search.value = "";
  elements.courseFilter.value = "";
  elements.statusFilter.value = "";
  renderTable();
}

function closeMobileSidebar() {
  elements.sidebar.classList.remove("is-open");
  elements.sidebarScrim.hidden = true;
  elements.mobileMenuButton.setAttribute("aria-expanded", "false");
  elements.mobileMenuButton.setAttribute("aria-label", "Open navigation");
}

function toggleMobileSidebar() {
  const isOpen = elements.sidebar.classList.toggle("is-open");
  elements.sidebarScrim.hidden = !isOpen;
  elements.mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
  elements.mobileMenuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
}

function initializeDate() {
  const now = new Date();
  elements.currentDate.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  }).format(now);
  elements.currentYear.textContent = String(now.getFullYear());
}

function attachEventListeners() {
  elements.form.addEventListener("submit", handleFormSubmit);

  elements.form.addEventListener("reset", () => {
    window.setTimeout(() => {
      elements.editId.value = "";
      elements.formTitle.textContent = "Add a student";
      elements.saveButton.innerHTML = '<span class="button-plus">＋</span> Save student';
      elements.cancelEdit.hidden = true;
      clearInvalidStates();
      setFormMessage("");
    }, 0);
  });

  elements.cancelEdit.addEventListener("click", () => {
    resetFormState();
    showToast("Edit cancelled", "The form is ready for a new student.");
  });

  [elements.id, elements.name, elements.email, elements.course, elements.year, elements.marks, elements.status]
    .forEach((field) => {
      field.addEventListener("input", () => {
        if (field.hasAttribute("aria-invalid")) field.removeAttribute("aria-invalid");
        if (elements.formMessage.classList.contains("error")) setFormMessage("");
      });
      field.addEventListener("change", () => {
        if (field.hasAttribute("aria-invalid")) field.removeAttribute("aria-invalid");
      });
    });

  elements.tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "edit") startEditing(id);
    if (action === "delete") deleteStudent(id);
  });

  elements.search.addEventListener("input", renderTable);
  elements.courseFilter.addEventListener("change", renderTable);
  elements.statusFilter.addEventListener("change", renderTable);
  elements.resetFilters.addEventListener("click", resetFilters);
  elements.exportCsv.addEventListener("click", exportCsv);

  elements.mobileMenuButton.addEventListener("click", toggleMobileSidebar);
  elements.sidebarScrim.addEventListener("click", closeMobileSidebar);
  elements.sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileSidebar);
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
    });
  });
}

function initializeApp() {
  initializeDate();
  attachEventListeners();
  renderApp();
}

initializeApp();
