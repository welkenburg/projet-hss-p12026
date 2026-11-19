var GENS = { pi: piPair, ni: niPair, ra: raPair, vowel: vowelPair, cons: consPair, mixed: mixedPair };

// Trial deck per level with 50% SAME / DIFFERENT responses at each level
var SPECS_MAIN = {
  1: [["pi", 24], ["ni", 12], ["ra", 12]],
  2: [["pi", 12], ["ni", 12], ["ra", 24]],
  3: [["vowel", 12], ["cons", 12], ["mixed", 24]]
};
var SPECS_PRACTICE = {
  1: [["pi", 2], ["ni", 2], ["ra", 2]],
  2: [["pi", 2], ["ni", 2], ["ra", 2]],
  3: [["vowel", 2], ["cons", 2], ["mixed", 2]]
};

// Test specs
// var SPECS_MAIN = {
//   1: [["pi", 2], ["ni", 1], ["ra", 1]],
//   2: [["pi", 1], ["ni", 1], ["ra", 2]],
//   3: [["vowel", 1], ["cons", 1], ["mixed", 2]]
// };
// var SPECS_PRACTICE = {
//   1: [["pi", 1], ["ni", 1], ["ra", 1]],
//   2: [["pi", 1], ["ni", 1], ["ra", 1]],
//   3: [["vowel", 1], ["cons", 1], ["mixed", 1]]
// };

function makeTrials(level, practice) {
  var specs = practice ? SPECS_PRACTICE[level] : SPECS_MAIN[level];
  var list = [];
  for (var s = 0; s < specs.length; s++)
    for (var i = 0; i < specs[s][1]; i++) list.push(GENS[specs[s][0]]());
  return shuffle(list);
}

/* ---------- Trial classification and expected response ---------- */
function classify(pair) {
  var a = pair[0], b = pair[1];
  var type = (a === b) ? "pi" : (a.toUpperCase() === b.toUpperCase() ? "ni" : "ra");
  var av = VOWELS.indexOf(a.toUpperCase()) !== -1;
  var bv = VOWELS.indexOf(b.toUpperCase()) !== -1;
  var rule = (av && bv) ? "vowel_vowel" : ((!av && !bv) ? "consonant_consonant" : "mixed");
  return { type: type, rule: rule };
}

function expectedResponse(level, cls) {
  if (level === 1) return cls.type === "pi" ? "same" : "diff";
  if (level === 2) return cls.type !== "ra" ? "same" : "diff";
  return cls.rule !== "mixed" ? "same" : "diff";
}

/* ---------- State ---------- */
var S = {
  participantId: "",
  age: "",
  levelIdx: 0,
  levelOrder: [],
  phase: "welcome",   // welcome | instr | ready | fixation | trial | feedback | between | done
  isPractice: false,
  trials: [],
  trialIdx: 0,
  current: null,
  onset: 0,
  responded: false,
  blockData: [],
  allData: [],
  sendOk: [],
  timeouts: []
};
var advance = null;

/* ---------- DOM references ---------- */
var screenEl = document.getElementById("screen");
var taskEl = document.getElementById("task");
var stimEl = document.getElementById("stim");
var feedbackEl = document.getElementById("feedback");
var taskLabel = document.getElementById("taskLabel");
var taskProgress = document.getElementById("taskProgress");
var barFill = document.getElementById("barFill");
var btnSame = document.getElementById("btnSame");
var btnDiff = document.getElementById("btnDiff");

function currentLevel() { return S.levelOrder[S.levelIdx]; }

/* ---------- Screen navigation ---------- */
function fireAdvance() { var f = advance; advance = null; if (f) f(); }

function renderScreen(html) {
  taskEl.hidden = true;
  screenEl.style.display = "block";
  screenEl.innerHTML = html;
  var go = document.getElementById("goBtn");
  if (go) go.addEventListener("click", fireAdvance);
}

document.addEventListener("keydown", function (e) {
  if (e.repeat) return;
  var k = e.key.toLowerCase();
  var ae = document.activeElement;
  var aeTag = ae ? ae.tagName : "";
  if (S.phase === "trial") {
    if (k === "f") { e.preventDefault(); respond("same"); }
    else if (k === "j") { e.preventDefault(); respond("diff"); }
  } else if (k === " " || k === "enter") {
    if (aeTag === "INPUT" || aeTag === "BUTTON") return; // Preserve native behavior
    if (advance) { e.preventDefault(); fireAdvance(); }
  }
});
btnSame.addEventListener("pointerdown", function (e) { e.preventDefault(); respond("same"); });
btnDiff.addEventListener("pointerdown", function (e) { e.preventDefault(); respond("diff"); });

/* =====================================================================
   TRIAL FLOW
   ===================================================================== */
function startTrials(practice) {
  S.isPractice = practice;
  S.trials = makeTrials(currentLevel(), practice);
  S.trialIdx = 0;
  S.blockData = [];
  screenEl.style.display = "none";
  taskEl.hidden = false;
  runTrial();
}

function updateTopbar() {
  taskLabel.textContent = "Block " + (S.levelIdx + 1) + " \u00b7 " + LEVEL_INFO[currentLevel()].name +
    (S.isPractice ? " \u00b7 practice" : "");
  var total = S.trials.length;
  var n = Math.min(S.trialIdx + 1, total);
  taskProgress.textContent = "Trial " + n + " / " + total;
  barFill.style.width = (100 * S.trialIdx / total) + "%";
}

function runTrial() {
  S.phase = "fixation";
  S.responded = false;
  var pair = S.trials[S.trialIdx];
  S.current = { pair: pair, cls: classify(pair) };
  updateTopbar();
  stimEl.classList.add("fix");
  stimEl.textContent = "+";
  feedbackEl.textContent = "";
  feedbackEl.className = "";
  setTimeout(function () {
    stimEl.classList.remove("fix");
    stimEl.innerHTML = "<span>" + pair[0] + "</span><span>" + pair[1] + "</span>";
    S.onset = performance.now();
    S.phase = "trial";
  }, CONFIG.fixationMs);
}

function respond(resp) {
  if (S.phase !== "trial" || S.responded) return;
  S.responded = true;
  S.phase = "feedback";
  var rt = Math.round(performance.now() - S.onset);
  var exp = expectedResponse(currentLevel(), S.current.cls);
  var correct = resp === exp;
  var rec = {
    participant_id: S.participantId,
    age: S.age,
    timestamp: new Date().toISOString(),
    phase: S.isPractice ? "practice" : "main",
    level: currentLevel(),
    trial_index: S.trialIdx + 1,
    letter1: S.current.pair[0],
    letter2: S.current.pair[1],
    trial_type: S.current.cls.type,
    rule_type: S.current.cls.rule,
    expected: exp,
    response: resp,
    correct: correct,
    rt_ms: rt
  };
  S.blockData.push(rec);
  S.allData.push(rec);
  feedbackEl.className = correct ? "ok" : "ko";
  feedbackEl.textContent = (correct ? "\u2713 " : "\u2717 ") +
    (correct ? "" : "  (expected: " + (exp === "same" ? "SAME" : "DIFFERENT") + ")");
  setTimeout(function () {
    S.trialIdx++;
    if (S.trialIdx < S.trials.length) runTrial();
    else endTrials();
  }, CONFIG.feedbackMs);
}

function endTrials() {
  if (S.isPractice) { showPracticeDone(); return; }
  // Send block results, then show the transition screen
  renderScreen(
    '<div class="card"><h2>Block complete\u2026</h2><p>Sending results\u2026</p></div>'
  );
  S.phase = "between";
  sendData(S.blockData).then(function (ok) {
    S.sendOk.push(ok);
    if (S.levelIdx >= CONFIG.levels.length - 1) showEnd();
    else showBlockDone();
  });
}

/* =====================================================================
   DATA SUBMISSION (Google Sheets via Apps Script)
   ===================================================================== */
function sendData(trials) {
  var payload = {
    participant_id: S.participantId,
    age: S.age,
    device: (navigator.userAgent || "").slice(0, 180),
    trials: trials
  };
  try {
    localStorage.setItem("posner_backup_" + S.participantId, JSON.stringify(payload));
  } catch (e) { /* Storage unavailable (e.g. preview); continue. */ }

  if (!CONFIG.scriptUrl) return Promise.resolve(false);
  return fetch(CONFIG.scriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  }).then(function () { return true; })
    .catch(function () { return false; });
}

/* =====================================================================
   END SCREEN + SUMMARY
   ===================================================================== */
function meanAndErr(rows) {
  var ok = rows.filter(function (r) { return r.correct; });
  var rt = ok.length ? Math.round(ok.reduce(function (s, r) { return s + r.rt_ms; }, 0) / ok.length) : null;
  var err = rows.length ? Math.round(100 * (rows.length - ok.length) / rows.length) : null;
  return { rt: rt, err: err };
}

function fmt(v, suffix) {
  return v === null ? "-" : v + (suffix || "");
}

/* ---------- Start ---------- */
showWelcome();