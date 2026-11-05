"use strict";

const PYTHON_SOURCE_PATH = "python/analytics.py";
const PYODIDE_VERSION = "0.27.7";
const PAGE_SIZE = 10;
const SECTION_EXPLANATIONS = {
  "1. Importing Libraries": "Imports Python tools for reproducible random data, Pandas analysis, Matplotlib charts, and browser-ready image encoding.",
  "2. Generating Synthetic Data": "Builds 100 fictional patient records with consistent admission, discharge, stay, and billing values.",
  "3. Creating the DataFrame": "Creates the Pandas DataFrame and converts the date columns to datetime values.",
  "4. Data Cleaning": "Removes duplicate patient IDs and prepares numeric columns for analysis.",
  "5. Statistical Analysis": "Uses Pandas counts, means, sums, groupby, and value_counts to calculate dashboard measures.",
  "6. Department Analysis": "Groups the patient records by department to compare patient volume, age, stay, and total billing.",
  "7. Financial Analysis": "Summarizes payment totals and groups billing by department and admission month.",
  "8. Matplotlib Visualizations": "Builds four Matplotlib figures and exports each chart as a Base64-encoded PNG.",
};

let pyodide = null;
let originalSource = "";
let dashboardData = null;
let patientSort = { key: "Admission_Date", direction: "desc" };
let currentPage = 1;
let selectedCodeSection = null;

const byId = (id) => document.getElementById(id);
const formatCurrency = (value, compact = false) => {
  const amount = Number(value) || 0;
  if (compact && amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (compact && amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

function renderIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function setLoadingStatus(message) {
  byId("loading-status").textContent = message;
}

function showLoadingError(error) {
  byId("loading-error").hidden = false;
  byId("loading-error-message").textContent = `Python could not start: ${error.message || error}. Check your internet connection and retry.`;
  setLoadingStatus("Initialization needs attention");
}

function loadPyodideScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;
    script.onload = resolve;
    script.onerror = () => reject(new Error("The Pyodide CDN script could not be downloaded."));
    document.head.appendChild(script);
  });
}

async function initializeApplication() {
  const retryButton = byId("retry-button");
  retryButton.disabled = true;
  byId("loading-error").hidden = true;
  try {
    setLoadingStatus("Loading Python WebAssembly runtime...");
    if (!window.loadPyodide) await loadPyodideScript();
    if (!window.loadPyodide) throw new Error("The Pyodide CDN script did not load.");
    pyodide = await window.loadPyodide({ indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/` });
    setLoadingStatus("Loading Pandas and Matplotlib...");
    await pyodide.loadPackage(["pandas", "matplotlib"]);
    setLoadingStatus("Loading the hospital analytics source...");
    const response = await fetch(PYTHON_SOURCE_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${PYTHON_SOURCE_PATH} (${response.status}).`);
    originalSource = await response.text();
    byId("python-editor").value = originalSource;
    renderCodeHighlight();
    byId("runtime-version").textContent = `Ready · Python ${pyodide.version}`;
    byId("runtime-version").closest(".runtime-card").querySelector(".runtime-dot").style.background = "var(--teal)";
    await executePython(originalSource, { initial: true });
    byId("app-shell").setAttribute("aria-hidden", "false");
    byId("loading-screen").hidden = true;
    renderIcons();
  } catch (error) {
    showLoadingError(error);
  } finally {
    retryButton.disabled = false;
  }
}

function getPythonText(name) {
  return pyodide.globals.get(name);
}

async function executePython(source, options = {}) {
  const output = byId("python-output");
  const status = byId("execution-status");
  const runButton = byId("run-code-button");
  const capturedOutput = [];
  if (!pyodide) throw new Error("The Python runtime is not ready yet.");
  if (!options.initial) {
    runButton.disabled = true;
    status.textContent = "Running...";
    status.classList.remove("is-error");
  }
  output.textContent = "Executing Python in the browser...";
  try {
    pyodide.setStdout({ batched: (message) => capturedOutput.push(message) });
    pyodide.setStderr({ batched: (message) => capturedOutput.push(message) });
    await pyodide.runPythonAsync(source);
    let resultText = capturedOutput.join("\n");
    try {
      const currentLabOutput = getPythonText("lab_output");
      if (currentLabOutput) resultText = [resultText, currentLabOutput].filter(Boolean).join("\n\n");
    } catch (error) {
      if (capturedOutput.length === 0) resultText = "Python code executed successfully. No output was printed.";
    }
    output.textContent = resultText || "Python code executed successfully. No output was printed.";
    status.textContent = "Completed";
    status.classList.remove("is-error");
    try {
      const dataText = getPythonText("dashboard_json");
      const imageText = getPythonText("chart_images_json");
      if (dataText && imageText) {
        dashboardData = JSON.parse(dataText);
        renderDashboard(JSON.parse(imageText));
      }
    } catch (error) {
      if (options.initial) throw error;
    }
  } catch (error) {
    output.textContent = `${error.name || "PythonError"}: ${error.message || error}`;
    status.textContent = "Execution failed";
    status.classList.add("is-error");
    if (options.initial) throw error;
  } finally {
    if (!options.initial) runButton.disabled = false;
  }
}

function renderDashboard(charts) {
  if (!dashboardData) return;
  const { kpis, financial } = dashboardData;
  byId("kpi-patients").textContent = new Intl.NumberFormat("en-IN").format(kpis.total_patients);
  byId("kpi-age").textContent = `${kpis.average_age} yrs`;
  byId("kpi-revenue").textContent = formatCurrency(kpis.total_revenue, true);
  byId("kpi-stay").textContent = `${kpis.average_stay} days`;
  byId("kpi-pending").textContent = formatCurrency(kpis.pending_amount, true);
  byId("kpi-department").textContent = kpis.most_occupied_department;
  byId("data-date").textContent = `As of ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${dashboardData.generated_on}T00:00:00Z`))}`;

  const chartElements = {
    department: ["chart-department-overview", "chart-department-analytics", "chart-department-gallery"],
    gender: ["chart-gender-overview", "chart-gender-gallery"],
    monthly: ["chart-monthly-gallery"],
    revenue: ["chart-revenue-finance", "chart-revenue-gallery"],
  };
  for (const [chartName, elementIds] of Object.entries(chartElements)) {
    for (const elementId of elementIds) byId(elementId).src = charts[chartName];
  }

  const paidShare = financial.total_revenue ? financial.paid_amount / financial.total_revenue * 100 : 0;
  byId("payment-track-paid").style.width = `${paidShare}%`;
  byId("payment-track-pending").style.width = `${100 - paidShare}%`;
  byId("finance-total-overview").textContent = formatCurrency(financial.total_revenue);
  byId("paid-amount-overview").textContent = formatCurrency(financial.paid_amount);
  byId("pending-amount-overview").textContent = formatCurrency(financial.pending_amount);
  byId("finance-total").textContent = formatCurrency(financial.total_revenue, true);
  byId("finance-average-bill").textContent = formatCurrency(financial.average_bill, true);
  byId("finance-paid").textContent = formatCurrency(financial.paid_amount, true);
  byId("finance-pending").textContent = formatCurrency(financial.pending_amount, true);
  byId("finance-paid-count").textContent = `${financial.paid_count} payments marked paid`;
  byId("finance-pending-count").textContent = `${financial.pending_count} payments pending`;
  byId("record-count").textContent = `${dashboardData.patients.length} records`;

  const departmentCounts = dashboardData.department_counts;
  const leader = departmentCounts[0];
  byId("department-leader-count").textContent = leader.count;
  byId("department-leader-name").textContent = leader.department;
  populateDepartmentFilter();
  renderDepartmentTable();
  renderCollectionSummary();
  renderRecentPatients();
  renderPatientRecords();
  renderIcons();
}

function statusMarkup(status) {
  const paid = status === "Paid";
  return `<span class="status-pill ${paid ? "status-paid" : "status-pending"}">${escapeHTML(status)}</span>`;
}

function patientCell(patient) {
  return `<div class="patient-cell"><strong>${escapeHTML(patient.Patient_Name)}</strong><span>${escapeHTML(patient.Patient_ID)}</span></div>`;
}

function renderRecentPatients() {
  const recent = [...dashboardData.patients]
    .sort((left, right) => right.Admission_Date.localeCompare(left.Admission_Date))
    .slice(0, 5);
  byId("recent-patients-body").innerHTML = recent.map((patient) => `<tr>
    <td>${patientCell(patient)}</td><td>${escapeHTML(patient.Department)}</td>
    <td>${escapeHTML(formatDate(patient.Admission_Date))}</td><td>${formatCurrency(patient.Bill_Amount)}</td>
    <td>${statusMarkup(patient.Payment_Status)}</td></tr>`).join("");
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function populateDepartmentFilter() {
  const select = byId("department-filter");
  const currentValue = select.value;
  select.innerHTML = `<option value="">All departments</option>${dashboardData.departments.map((entry) => `<option value="${escapeHTML(entry.Department)}">${escapeHTML(entry.Department)}</option>`).join("")}`;
  select.value = currentValue;
}

function renderDepartmentTable() {
  byId("department-table-body").innerHTML = dashboardData.departments.map((department) => `<tr>
    <td>${escapeHTML(department.Department)}</td><td>${department.Patient_Count}</td>
    <td>${department.Average_Age} yrs</td><td>${department.Average_Stay} days</td>
    <td>${formatCurrency(department.Total_Billing)}</td></tr>`).join("");
}

function renderCollectionSummary() {
  const { financial } = dashboardData;
  const entries = [
    { name: "Paid", amount: financial.paid_amount, color: "dot-teal", ...dashboardData.payment_distribution[0] },
    { name: "Pending", amount: financial.pending_amount, color: "dot-gold", ...dashboardData.payment_distribution[1] },
  ];
  byId("collection-summary").innerHTML = entries.map((entry) => `<div class="collection-row">
    <span><i class="legend-dot ${entry.color}"></i>${entry.name}</span><strong>${formatCurrency(entry.amount)}</strong>
    <small>${entry.count} patient records · ${entry.share}% of records</small><div class="collection-meter ${entry.color}"><span style="width: ${entry.share}%"></span></div></div>`).join("");
}

function getFilteredPatients() {
  const query = byId("patient-search").value.trim().toLocaleLowerCase();
  const department = byId("department-filter").value;
  const gender = byId("gender-filter").value;
  return dashboardData.patients.filter((patient) => {
    const matchesSearch = !query || patient.Patient_ID.toLocaleLowerCase().includes(query) || patient.Patient_Name.toLocaleLowerCase().includes(query);
    return matchesSearch && (!department || patient.Department === department) && (!gender || patient.Gender === gender);
  }).sort((left, right) => {
    const leftValue = left[patientSort.key];
    const rightValue = right[patientSort.key];
    const comparison = typeof leftValue === "number" ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue));
    return patientSort.direction === "asc" ? comparison : -comparison;
  });
}

function renderPatientRecords() {
  if (!dashboardData) return;
  const filtered = getFilteredPatients();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  byId("patient-records-body").innerHTML = pageItems.length ? pageItems.map((patient) => `<tr>
    <td>${patientCell(patient)}</td><td>${patient.Age} yrs · ${escapeHTML(patient.Gender)}</td>
    <td>${escapeHTML(patient.Department)}</td><td>${escapeHTML(patient.Diagnosis)}</td>
    <td>${escapeHTML(patient.Doctor_Name)}</td><td>${escapeHTML(patient.Room_Type)}</td>
    <td>${escapeHTML(formatDate(patient.Admission_Date))}</td><td>${escapeHTML(formatDate(patient.Discharge_Date))}</td><td>${patient.Length_of_Stay} days</td>
    <td>${formatCurrency(patient.Bill_Amount)}</td><td>${statusMarkup(patient.Payment_Status)}</td></tr>`).join("") : `<tr><td class="empty-state" colspan="8">No patient records match these filters.</td></tr>`;
  byId("record-count").textContent = `${filtered.length} of ${dashboardData.patients.length} records`;
  byId("pagination-summary").textContent = filtered.length ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} records` : "Showing 0 records";
  byId("page-indicator").textContent = `${currentPage} / ${pages}`;
  byId("previous-page").disabled = currentPage <= 1;
  byId("next-page").disabled = currentPage >= pages;
}

function navigateToView(viewName) {
  const panel = document.querySelector(`[data-view-panel="${viewName}"]`);
  if (!panel) return;
  document.querySelectorAll("[data-view-panel]").forEach((view) => {
    const isActive = view.dataset.viewPanel === viewName;
    view.hidden = !isActive;
    view.classList.toggle("is-visible", isActive);
  });
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === viewName));
  const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"] span`);
  byId("page-title").textContent = activeNav ? activeNav.textContent : "Overview";
  byId("sidebar").classList.remove("is-open");
  byId("sidebar-scrim").classList.remove("is-visible");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCodeHighlight() {
  const editor = byId("python-editor");
  const highlighted = byId("code-highlight");
  highlighted.textContent = editor.value;
  if (window.Prism) window.Prism.highlightElement(highlighted);
  byId("editor-cursor").textContent = `Python 3 · ${editor.value.split("\n").length} lines`;
}

function selectCodeSection(title) {
  const editor = byId("python-editor");
  const marker = `# ${title}`;
  const start = editor.value.indexOf(marker);
  if (start < 0) return;
  const nextSection = editor.value.indexOf("\n# ", start + marker.length);
  const end = nextSection < 0 ? editor.value.length : nextSection + 1;
  editor.focus();
  editor.setSelectionRange(start, end);
  const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 18;
  const line = editor.value.slice(0, start).split("\n").length - 1;
  editor.scrollTop = Math.max(0, line * lineHeight - editor.clientHeight / 3);
  byId("section-explanation").querySelector("p").textContent = SECTION_EXPLANATIONS[title];
  document.querySelectorAll("#code-section-nav button").forEach((button) => button.classList.toggle("is-selected", button.dataset.codeSection === title));
  selectedCodeSection = title;
}

function wireInteractions() {
  document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => navigateToView(button.dataset.view)));
  document.querySelectorAll("[data-navigate]").forEach((button) => button.addEventListener("click", () => navigateToView(button.dataset.navigate)));
  byId("menu-button").addEventListener("click", () => {
    byId("sidebar").classList.add("is-open");
    byId("sidebar-scrim").classList.add("is-visible");
  });
  byId("sidebar-scrim").addEventListener("click", () => {
    byId("sidebar").classList.remove("is-open");
    byId("sidebar-scrim").classList.remove("is-visible");
  });

  ["patient-search", "department-filter", "gender-filter"].forEach((id) => byId(id).addEventListener(id === "patient-search" ? "input" : "change", () => {
    currentPage = 1;
    renderPatientRecords();
  }));
  byId("clear-filters").addEventListener("click", () => {
    byId("patient-search").value = "";
    byId("department-filter").value = "";
    byId("gender-filter").value = "";
    currentPage = 1;
    renderPatientRecords();
  });
  byId("previous-page").addEventListener("click", () => { currentPage -= 1; renderPatientRecords(); });
  byId("next-page").addEventListener("click", () => { currentPage += 1; renderPatientRecords(); });
  document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.sort;
    patientSort = { key, direction: patientSort.key === key && patientSort.direction === "asc" ? "desc" : "asc" };
    renderPatientRecords();
  }));

  byId("python-editor").addEventListener("input", () => {
    selectedCodeSection = null;
    document.querySelectorAll("#code-section-nav button").forEach((button) => button.classList.remove("is-selected"));
    renderCodeHighlight();
  });
  byId("python-editor").addEventListener("scroll", (event) => {
    const pre = byId("code-editor").querySelector("pre");
    pre.scrollTop = event.target.scrollTop;
    pre.scrollLeft = event.target.scrollLeft;
  });
  byId("python-editor").addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const editor = event.currentTarget;
      editor.setRangeText("    ", editor.selectionStart, editor.selectionEnd, "end");
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  document.querySelectorAll("[data-code-section]").forEach((button) => button.addEventListener("click", () => selectCodeSection(button.dataset.codeSection)));
  byId("run-code-button").addEventListener("click", async () => {
    const editor = byId("python-editor");
    const hasSelection = editor.selectionStart !== editor.selectionEnd;
    const code = hasSelection ? editor.value.slice(editor.selectionStart, editor.selectionEnd) : editor.value;
    await executePython(code);
  });
  byId("reset-code-button").addEventListener("click", () => {
    byId("python-editor").value = originalSource;
    selectedCodeSection = null;
    renderCodeHighlight();
    byId("section-explanation").querySelector("p").textContent = "Select a section to inspect its corresponding lines in the executable source.";
    document.querySelectorAll("#code-section-nav button").forEach((button) => button.classList.remove("is-selected"));
    byId("python-output").textContent = "Source restored to python/analytics.py. Run the code to refresh the dashboard.";
    byId("execution-status").textContent = "Ready";
  });
  byId("regenerate-button").addEventListener("click", async () => {
    const editor = byId("python-editor");
    const match = editor.value.match(/^RANDOM_SEED = (\d+)$/m);
    const nextSeed = match ? Number(match[1]) + 1 : 42;
    editor.value = editor.value.replace(/^RANDOM_SEED = \d+$/m, `RANDOM_SEED = ${nextSeed}`);
    renderCodeHighlight();
    await executePython(editor.value);
  });
  byId("retry-button").addEventListener("click", initializeApplication);
  document.querySelectorAll("[data-student-field]").forEach((input) => {
    const key = `medimetrics-${input.dataset.studentField}`;
    try {
      input.value = localStorage.getItem(key) || "";
      input.addEventListener("input", () => {
        try {
          localStorage.setItem(key, input.value);
        } catch {}
      });
    } catch {
      input.value = "";
    }
  });
}

wireInteractions();
renderIcons();
initializeApplication();