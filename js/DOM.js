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