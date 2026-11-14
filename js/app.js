const STORAGE_KEY = "f3-math-progress-v1";
const pending = {};

let memoryProgress = {};

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return memoryProgress;
  }
}

function saveProgress(data) {
  memoryProgress = data;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // file:// pages in some browsers block storage; the session copy still works.
  }
}

function norm(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[−–—]/g, "-")
    .replace(/[×·⋅]/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/[{}]/g, "")
    .replace(/°/g, "")
    .replace(/度/g, "")
    .replace(/，/g, ",")
    .replace(/；/g, ",")
    .replace(/;/g, ",")
    .replace(/：/g, ":")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/＞/g, ">")
    .replace(/＜/g, "<")
    .replace(/\*/g, "")
    .replace(/sqrt\((\d+)\)/g, "sqrt$1");
}

function matches(input, accept) {
  const normalized = norm(input);
  if (accept.some((answer) => norm(answer) === normalized)) return true;
  if (/[a-z:/\\^()<>]/.test(normalized)) return false;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return false;
  return accept.some((answer) => {
    const target = norm(answer);
    if (/[a-z:/\\^()<>]/.test(target)) return false;
    const expected = Number(target);
    return Number.isFinite(expected) && Math.abs(value - expected) < 1e-6;
  });
}

function unitProgress(unit, progress) {
  const saved = progress[unit.id] || {};
  const done = unit.practice.filter((q) => saved[q.id]);
  const correct = done.filter((q) => saved[q.id].ok).length;
  return { done: done.length, correct, total: unit.practice.length };
}

function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2200);
}

function renderMath(root) {
  if (!window.renderMathInElement) return;
  window.renderMathInElement(root, {
    delimiters: [
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false }
    ],
    throwOnError: false
  });
}

function html(strings, ...values) {
  return strings.reduce((out, part, i) => out + part + (values[i] ?? ""), "");
}

function render(keepScroll) {
  const y = keepScroll ? window.scrollY : 0;
  const app = document.getElementById("app");
  const match = (location.hash || "#/").match(/^#\/unit\/([a-z0-9-]+)$/);
  if (match) {
    const unit = window.UNITS.find((item) => item.id === match[1]);
    app.innerHTML = unit ? unitView(unit) : missingView();
    document.title = unit ? `${unit.title} · 中三數學` : "中三數學自學";
  } else {
    app.innerHTML = homeView();
    document.title = "中三數學自學";
  }
  renderMath(app);
  if (keepScroll) window.scrollTo(0, y);
  else window.scrollTo(0, 0);
}

function homeView() {
  const progress = loadProgress();
  const strands = ["數與代數", "度量、圖形與空間", "數據處理"];
  const groups = strands.map((strand) => {
    const cards = window.UNITS.filter((unit) => unit.strand === strand).map((unit) => {
      const stat = unitProgress(unit, progress);
      const globalIndex = String(window.UNITS.indexOf(unit) + 1).padStart(2, "0");
      const badge = unit.featured ? `<span class="badge">完整單元</span>` : "";
      const status = stat.done
        ? `已核對 ${stat.correct}/${stat.total}`
        : `${stat.total} 題練習`;
      return html`<a class="card" href="#/unit/${unit.id}">
        <span class="card-no">${globalIndex} ${badge}</span>
        <h3>${unit.title}</h3>
        <p>${unit.blurb}</p>
        <span class="card-meta"><span>${status}</span><span>開始</span></span>
      </a>`;
    }).join("");
    return html`<section class="strand"><h2>${strand}</h2><div class="grid">${cards}</div></section>`;
  }).join("");

  return html`<section class="hero">
    <h1>在家先把這一課學懂。</h1>
    <p class="lede">每一課有基本概念、公式、例題和可以即時核對的練習。這一版給一班自學用，還沒有收集姓名、班別或學號。</p>
    <div class="notice">
      <p>網頁上的對錯只存在這部瀏覽器。重新整理不會失去紀錄，但換一部裝置、或清除瀏覽資料，紀錄就會消失。老師收不到這些分數，請不要把它當平時分。</p>
    </div>
  </section>
  ${groups}
  <details>
    <summary>老師之後怎樣收平時分</summary>
    <p>教材繼續放在這個網頁就夠，不必自建伺服器。到要計分時，每一課加一個 Google 表單（開測驗模式）或學校的 Microsoft Form 連結。學生填班別、學號、姓名後交卷，分數進入只有你能看的試算表。學生改不了那張表；你下載一份 Excel，就是備份。</p>
    <p>網頁裡這些練習仍然留給自學。平時分只用表單那一份，因為瀏覽器裡的分數可以由學生改畫面造出來。</p>
    <p><button class="btn ghost" type="button" data-action="reset-all">清除這部裝置的練習紀錄</button></p>
  </details>`;
}

function missingView() {
  return html`<p>找不到這一課。</p><a class="back" href="#/">返回課題列表</a>`;
}

function unitView(unit) {
  const progress = loadProgress();
  const stat = unitProgress(unit, progress);
  const jumps = [
    ["sec-concepts", "概念"],
    unit.table ? ["sec-table", "表"] : null,
    ["sec-formulas", "公式"],
    unit.mistakes ? ["sec-mistakes", "常見錯誤"] : null,
    ["sec-examples", "例題"],
    ["sec-practice", "練習"]
  ].filter(Boolean).map(([id, label]) =>
    html`<button type="button" data-action="jump" data-target="${id}">${label}</button>`
  ).join("");

  const concepts = unit.concepts.map((block) => html`<div class="block">
    <h3>${block.title}</h3>
    ${block.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
  </div>`).join("");

  const table = unit.table ? html`<section class="sheet" id="sec-table">
    <h2>${unit.table.caption}</h2>
    <div class="table-wrap"><table>
      <thead><tr>${unit.table.headers.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead>
      <tbody>${unit.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>
  </section>` : "";

  const formulas = unit.formulas.map((item) => html`<li>
    <div>\\[${item.latex}\\]</div>
    <p class="formula-note">${item.note}</p>
  </li>`).join("");

  const mistakes = unit.mistakes ? html`<section class="sheet" id="sec-mistakes">
    <h2>常見錯誤</h2>
    <ul class="mistakes">${unit.mistakes.map((item) => `<li>${item}</li>`).join("")}</ul>
  </section>` : "";

  const examples = unit.examples.map((example, index) => html`<article class="example">
    <h3>例 ${index + 1}　${example.title}</h3>
    <p>${example.prompt}</p>
    <ol class="steps">${example.steps.map((step) => `<li>${step}</li>`).join("")}</ol>
  </article>`).join("");

  const questions = unit.practice.map((question, index) => questionView(unit, question, index, progress)).join("");

  return html`<article class="unit-head">
    <a class="back" href="#/">全部課題</a>
    <p class="kicker">${unit.strand}${unit.featured ? " · 完整單元" : ""}</p>
    <h1>${unit.title}</h1>
    <p class="objective">${unit.objective}</p>
    <div class="jumps">${jumps}</div>
  </article>
  <section class="sheet" id="sec-concepts"><h2>基本概念</h2>${concepts}</section>
  ${table}
  <section class="sheet" id="sec-formulas"><h2>公式</h2><ul class="formulas">${formulas}</ul></section>
  ${mistakes}
  <section class="sheet" id="sec-examples"><h2>例題</h2>${examples}</section>
  <section class="sheet" id="sec-practice">
    <div class="practice-bar">
      <h2>練習</h2>
      <p class="score">已核對 ${stat.done} 題，答對 ${stat.correct}／${stat.total}</p>
    </div>
    <p class="muted">做完才核對。這個分數留在這部瀏覽器，老師看不到。</p>
    ${questions}
    <p><button class="btn ghost" type="button" data-action="reset-unit" data-unit="${unit.id}">重做這一課</button></p>
  </section>`;
}

function questionView(unit, question, index, progress) {
  const saved = (progress[unit.id] || {})[question.id];
  const picked = pending[unit.id]?.[question.id];
  let body = "";
  if (question.type === "mc") {
    body = `<div class="choices">${question.choices.map((choice, choiceIndex) => {
      const pressed = !saved && String(picked) === String(choiceIndex);
      const classes = [
        "choice",
        saved && choiceIndex === question.answer ? "is-right" : "",
        saved && !saved.ok && String(saved.value) === String(choiceIndex) ? "is-wrong" : ""
      ].filter(Boolean).join(" ");
      const disabled = saved ? "disabled" : "";
      return `<button type="button" class="${classes}" aria-pressed="${pressed ? "true" : "false"}" ${disabled} data-action="choose" data-unit="${unit.id}" data-qid="${question.id}" data-index="${choiceIndex}">${choice}</button>`;
    }).join("")}</div>`;
  } else if (saved) {
    body = `<p>你的答案：${escapeText(saved.value)}</p>`;
  } else {
    body = html`<div class="answer-row">
      <input type="text" inputmode="text" autocomplete="off" placeholder="${question.placeholder || "輸入答案"}" data-input="${unit.id}:${question.id}" aria-label="第 ${index + 1} 題答案">
      <button class="btn" type="button" data-action="check" data-unit="${unit.id}" data-qid="${question.id}">核對</button>
    </div>`;
  }

  const check = question.type === "mc" && !saved
    ? `<button class="btn" type="button" data-action="check" data-unit="${unit.id}" data-qid="${question.id}">核對</button>`
    : "";
  const result = saved
    ? `<p class="result-line ${saved.ok ? "ok" : "bad"}">${saved.ok ? "答對了。" : "還未對。"}</p><div class="explain">${saved.ok ? "" : `<p>參考答案：${question.solution}</p>`}<p>${question.explanation}</p></div>`
    : "";

  return html`<article class="q">
    <p class="q-no">第 ${index + 1} 題</p>
    <p>${question.prompt}</p>
    ${body}
    ${check}
    ${result}
  </article>`;
}

function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function onClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, unit, qid, index, target: jump } = target.dataset;
  if (action === "jump") {
    document.getElementById(jump)?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (action === "choose") {
    pending[unit] = pending[unit] || {};
    pending[unit][qid] = index;
    const group = target.parentElement;
    for (const button of group.querySelectorAll(".choice")) {
      button.setAttribute("aria-pressed", button === target ? "true" : "false");
    }
  } else if (action === "check") {
    checkAnswer(unit, qid);
  } else if (action === "reset-unit") {
    if (confirm("清除這一課在這部裝置上的練習紀錄？")) {
      const progress = loadProgress();
      delete progress[unit];
      delete pending[unit];
      saveProgress(progress);
      render(true);
    }
  } else if (action === "reset-all") {
    if (confirm("清除這部裝置上全部練習紀錄？")) {
      saveProgress({});
      for (const key of Object.keys(pending)) delete pending[key];
      render(true);
    }
  }
}

function checkAnswer(unitId, qid) {
  const unit = window.UNITS.find((item) => item.id === unitId);
  const question = unit.practice.find((item) => item.id === qid);
  let value;
  if (question.type === "mc") {
    value = pending[unitId]?.[qid];
    if (value == null) {
      toast("請先選一個答案");
      return;
    }
  } else {
    const input = document.querySelector(`[data-input="${unitId}:${qid}"]`);
    value = input.value;
    if (!norm(value)) {
      toast("請先填寫答案");
      return;
    }
  }
  const ok = question.type === "mc"
    ? Number(value) === question.answer
    : matches(value, question.accept);
  const progress = loadProgress();
  progress[unitId] = progress[unitId] || {};
  progress[unitId][qid] = { ok, value: String(value) };
  saveProgress(progress);
  render(true);
}

function onKey(event) {
  if (event.key !== "Enter") return;
  const input = event.target.closest("[data-input]");
  if (!input) return;
  const [unit, qid] = input.dataset.input.split(":");
  checkAnswer(unit, qid);
}

document.getElementById("app").addEventListener("click", onClick);
document.getElementById("app").addEventListener("keydown", onKey);
window.addEventListener("hashchange", () => render(false));
render(false);
