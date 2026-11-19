/* ---------- Instructions ---------- */
var LEVEL_INFO = {
  1: {
    name: "Physical Identity",
    rule: "Answer <b>SAME</b> only if both letters are <b>strictly identical</b> (same letter, upper/lower case included). Otherwise, answer <b>DIFFERENT</b>.",
    examples: [["A&nbsp;&nbsp;A", "SAME"], ["b&nbsp;&nbsp;b", "SAME"], ["A&nbsp;&nbsp;a", "DIFFERENT"], ["B&nbsp;&nbsp;H", "DIFFERENT"]]
  },
  2: {
    name: "Name Identity",
    rule: "Answer <b>SAME</b> if both letters have the <b>same name</b>, independently of their case (A and a are both considered like the letter \"a\"). Otherwise, answer <b>DIFFERENT</b>.",
    examples: [["A&nbsp;&nbsp;A", "SAME"], ["A&nbsp;&nbsp;a", "SAME"], ["b&nbsp;&nbsp;B", "SAME"], ["A&nbsp;&nbsp;B", "DIFFERENT"], ["c&nbsp;&nbsp;E", "DIFFERENT"]]
  },
  3: {
    name: "Rule Identity",
    rule: "Answer <b>SAME</b> if letters are <b>both vowels</b> (A, E, I) <b>or both consonants</b> (B, C, H). If one is a vowel and the other one is a consonant, answer <b>DIFFERENT</b>.",
    examples: [["A&nbsp;&nbsp;E", "SAME"], ["b&nbsp;&nbsp;c", "SAME"], ["A&nbsp;&nbsp;B", "DIFFERENT"], ["e&nbsp;&nbsp;C", "DIFFERENT"]]
  }
};


/* =====================================================================
   SCREENS
   ===================================================================== */
function showWelcome() {
    S.phase = "welcome";
    renderScreen(
    '<div class="card">' +
    '<h1>Letter Matching Task</h1>' +
    '<p class="sub">Cognitive psychology experiment \u00b7 duration: 8 to 10 minutes</p>' +
    '<p>On each trial, <b>two letters</b> will appear. Respond as <b>quickly as possible</b> while avoiding errors:</p>' +
    '<p><kbd>F</kbd> or the green button \u2192 <b>SAME</b> &nbsp;&nbsp;\u00b7&nbsp;&nbsp; <kbd>J</kbd> or the red button \u2192 <b>DIFFERENT</b></p>' +
    '<p>The experiment consists of <b>3 blocks</b> with different instructions, each preceded by a short practice. After each response, you will see your reaction time and whether your answer was correct.</p>' +
    '<form id="startForm">' +
    '<label class="opt" for="age">Age (optional)</label>' +
    '<input id="age" type="number" min="7" max="99" inputmode="numeric">' +
    '<div class="consent"><input type="checkbox" id="consent">' +
    '<span>I voluntarily agree to participate. My responses and reaction times will be recorded <b>anonymously</b> (no personal data will be collected). I can stop at any time.</span></div>' +
    '<button class="btn" id="goBtn" type="button" disabled>Start</button>' +
    '<p class="keyhint">Tip: stay focused and do not switch tabs during the blocks.</p>' +
    '</form>' +
    '</div>'
    );
    var consent = document.getElementById("consent");
    var go = document.getElementById("goBtn");
    consent.addEventListener("change", function () { go.disabled = !consent.checked; });
    advance = function () {
        if (!consent.checked) return;
        S.age = (document.getElementById("age").value || "").toString();
        S.participantId = "P-" + Date.now().toString(36).toUpperCase() + "-" + rand(46656).toString(36);
        S.levelIdx = 0;
        S.levelOrder = shuffle(CONFIG.levels.slice());
        S.allData = [];
        S.sendOk = [];
        showInstructions();
    };
    }

    function showInstructions() {
  S.phase = "instr";
  var lvl = currentLevel();
  var info = LEVEL_INFO[lvl];
  var rows = info.examples.map(function (ex) {
    return '<tr><td class="exl">' + ex[0] + '</td><td><b>' + ex[1] + '</b></td></tr>';
  }).join("");
  var n = CONFIG.levels.length;
  renderScreen(
    '<div class="card">' +
    '<p class="sub">Block ' + (S.levelIdx + 1) + ' of ' + n + '</p>' +
    '<h2>Instructions: ' + info.name + '</h2>' +
    '<div class="rule">' + info.rule + '</div>' +
    '<table class="ex"><tr><th>Example</th><th>Correct answer</th></tr>' + rows + '</table>' +
    '<p>Respond <b>as quickly as possible</b> while minimizing errors.</p>' +
    '<button class="btn" id="goBtn" type="button">Start practice (' + CONFIG.practiceTrials + ' trials)</button>' +
    '<p class="keyhint"><kbd>F</kbd> = SAME &nbsp;\u00b7&nbsp; <kbd>J</kbd> = DIFFERENT (or use the on-screen buttons)</p>' +
    '</div>'
  );
  advance = function () { startTrials(true); };
}

function showPracticeDone() {
  S.phase = "ready";
  renderScreen(
    '<div class="card">' +
    '<h2>Practice complete \u2713</h2>' +
    '<p>The block starts now: <b>' + CONFIG.trialsPerBlock + ' trials</b> with the same instructions.</p>' +
    '<button class="btn" id="goBtn" type="button">Start block</button>' +
    '</div>'
  );
  advance = function () { startTrials(false); };
}

function showBlockDone() {
  S.phase = "between";
  renderScreen(
    '<div class="card">' +
    '<h2>Block complete \u2713</h2>' +
    '<p>Take a short break! When you are ready, continue to the next block.</p>' +
    '<button class="btn" id="goBtn" type="button">Next block</button>' +
    '</div>'
  );
  advance = function () { S.levelIdx++; showInstructions(); };
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
    ["1", "SAME - physical identity (AA)", meanAndErr(lv(1, sameExp))],
    ["1", "DIFFERENT (other pairs)", meanAndErr(lv(1, diffExp))],
    ["2", "SAME - physical (AA)", meanAndErr(lv(2, function (r) { return sameExp(r) && r.trial_type === "pi"; }))],
    ["2", "SAME - name (Aa)", meanAndErr(lv(2, function (r) { return sameExp(r) && r.trial_type === "ni"; }))],
    ["2", "DIFFERENT (different names)", meanAndErr(lv(2, diffExp))],
    ["3", "SAME - rule (vowels or consonants)", meanAndErr(lv(3, sameExp))],
    ["3", "DIFFERENT (vowel + consonant)", meanAndErr(lv(3, diffExp))]
  ];
  var trs = rows.map(function (r) {
    return "<tr><td>N" + r[0] + "</td><td>" + r[1] + "</td><td>" + fmt(r[2].rt, " ms") + "</td><td>" + fmt(r[2].err, " %") + "</td></tr>";
  }).join("");

  // Estimate the name-identity processing time (node 2 - node 1, SAME-SAME method)
  var pi = meanAndErr(lv(2, function (r) { return sameExp(r) && r.trial_type === "pi"; })).rt;
  var ni = meanAndErr(lv(2, function (r) { return sameExp(r) && r.trial_type === "ni"; })).rt;
  var estimate = (pi !== null && ni !== null)
    ? '<p class="small">Name-identity processing time (RT<sub>name</sub> \u2212 RT<sub>physical</sub>) \u2248 <b>' + (ni - pi) + ' ms</b></p>'
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