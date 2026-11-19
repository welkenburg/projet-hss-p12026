var CONFIG = {
  scriptUrl: "https://script.google.com/macros/s/AKfycby9_TeTfUjyj_ByR3K650CyNXhj8TFNizVU3lOaCH81zGwMzWiGZBSU-VRi3uqbrVGhaQ/exec",
  levels: [1, 2, 3],      // Block order: 1 physical, 2 name, 3 rule
  trialsPerBlock: 48,
  practiceTrials: 6,
  fixationMs: 600,          // Fixation cross
  feedbackMs: 900           // Feedback (reaction time + correctness) after each trial
};

var VOWELS = ["A", "E", "I"];
var CONSONANTS = ["B", "C", "H"];
var LETTERS = VOWELS.concat(CONSONANTS);