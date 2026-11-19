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

function currentLevel() { return CONFIG.levels[S.levelIdx]; }

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
  return v === null ? "\u2014" : v + (suffix || "");
}

function showEnd() {
  S.phase = "done";
  var main = S.allData.filter(function (r) { return r.phase === "main"; });
  var lv = function (n, f) {
    return main.filter(function (r) { return r.level === n && f(r); });
  };
  var sameExp = function (r) { return r.expected === "same"; };
  var diffExp = function (r) { return r.expected === "diff"; };

  var rows = [
    ["1", "SAME \u2013 physical identity (AA)", meanAndErr(lv(1, sameExp))],
    ["1", "DIFFERENT (other pairs)", meanAndErr(lv(1, diffExp))],
    ["2", "SAME \u2013 physical (AA)", meanAndErr(lv(2, function (r) { return sameExp(r) && r.trial_type === "PI"; }))],
    ["2", "SAME \u2013 name (Aa)", meanAndErr(lv(2, function (r) { return sameExp(r) && r.trial_type === "NI"; }))],
    ["2", "DIFFERENT (different names)", meanAndErr(lv(2, diffExp))],
    ["3", "SAME \u2013 rule (vowels or consonants)", meanAndErr(lv(3, sameExp))],
    ["3", "DIFFERENT (vowel + consonant)", meanAndErr(lv(3, diffExp))]
  ];
  var trs = rows.map(function (r) {
    return "<tr><td>N" + r[0] + "</td><td>" + r[1] + "</td><td>" + fmt(r[2].rt, " ms") + "</td><td>" + fmt(r[2].err, " %") + "</td></tr>";
  }).join("");

  // Estimate the name-identity processing time (node 2 - node 1, SAME-SAME method)
  var pi = meanAndErr(lv(2, function (r) { return sameExp(r) && r.trial_type === "PI"; })).rt;
  var ni = meanAndErr(lv(2, function (r) { return sameExp(r) && r.trial_type === "NI"; })).rt;
  var estimate = (pi !== null && ni !== null)
    ? '<p class="small">Name-identity processing time (RT<sub>name</sub> \u2212 RT<sub>physical</sub>) \u2248 <b>' + (ni - pi) + ' ms</b> \u2014 the classic Posner &amp; Mitchell effect!</p>'
    : "";

  var allSent = S.sendOk.length > 0 && S.sendOk.every(function (x) { return x; });
  var noneConfigured = !CONFIG.scriptUrl;
  var status = noneConfigured
    ? '<p class="sent-ko">Demo mode: results were not sent (no collection URL is configured).</p>'
    : allSent
      ? '<p class="sent-ok">\u2713 Your results have been sent. Thank you!</p>'
      : '<p class="sent-ko">Sending results failed (network error). Your data remain saved in this browser.</p>';

  renderScreen(
    '<div class="card">' +
    '<h1>Thank you for participating!</h1>' +
    status +
    '<p class="sub">Your performance (correct trials, in milliseconds):</p>' +
    '<table class="summary"><tr><th>Block</th><th>Condition</th><th>Mean RT</th><th>Errors</th></tr>' + trs + '</table>' +
    estimate +
    '<p class="small">Experiment adapted from Posner, M. I., &amp; Mitchell, R. F. (1967). Chronometric analysis of classification. <i>Psychological Review, 74</i>(5), 392\u2013409.</p>' +
    '<p class="small">You may close this page.</p>' +
    '</div>'
  );
  advance = null;
}

/* ---------- Start ---------- */
showWelcome();