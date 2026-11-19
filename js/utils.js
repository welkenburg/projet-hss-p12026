function rand(n) {
    return Math.floor(Math.random() * n);
}

function pick(arr) {
    return arr[rand(arr.length)];
}

function randCase(ch) {
    return Math.random() < 0.5 ? ch.toUpperCase() : ch.toLowerCase();
}

function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
        var j = rand(i + 1);
        var t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    return a;
}

// physical identity (AA)
function piPair() {
    var ch = randCase(pick(LETTERS));
    return [ch, ch];
}

// name identity (Aa)
function niPair() {
    var L = pick(LETTERS);
    var u = L.toUpperCase(),
    l = L.toLowerCase();
    return Math.random() < 0.5 ? [u, l] : [l, u];
}

// random (Ab)
function raPair() {
    var i = rand(LETTERS.length), j;
    do {
        j = rand(LETTERS.length);
    } while (j === i);

    return [randCase(LETTERS[i]), randCase(LETTERS[j])];
}

// Two vowels or two consonants (mixing physical identity, name identity, and different letters)
function sameCategoryPair(set) {   
    var r = Math.random();
    if (r < 0.2) {
        var ch = randCase(pick(set));
        return [ch, ch];
    }

    else if (r < 0.5) {
        var L = pick(set);
        var u = L.toUpperCase();
        var l = L.toLowerCase();
        return Math.random() < 0.5 ? [u, l] : [l, u];
    }

    else {
        var i = rand(set.length), j;
        do { 
            j = rand(set.length); 
        } while (j === i);
        return [randCase(set[i]), randCase(set[j])];
    }
}

function vowelPair() {
    return sameCategoryPair(VOWELS);
}

function consPair() {
    return sameCategoryPair(CONSONANTS);
}

function mixedPair() {
    var v = randCase(pick(VOWELS));
    var c = randCase(pick(CONSONANTS));
    return Math.random() < 0.5 ? [v, c] : [c, v];
}