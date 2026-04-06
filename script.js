let data = [];
let questions = [];
let currentQuestion = {};
let currentLanguageSentence = "";

let questionSetting = localStorage.getItem("questionCount");
let totalQuestions = 0;
let currentIndex = Number(localStorage.getItem("currentQuestionIndex")) || 0;
let score = Number(localStorage.getItem("score")) || 0;

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTRhAkRLMaWpUhCVV93l1naufzK0WC6tSCsxKRNxg6gNEx54OHFahpAsFr7cpQ2Lp6CRdoUohwJ0WUo/pub?output=csv";

async function loadCSV() {
  try {
    const res = await fetch(CSV_URL);
    const text = await res.text();

    data = parseCSV(text);
    console.table(data.map(item => ({
  land: getField(item, ["Land"]),
  kontinent: getField(item, ["Kontinent"]),
  normalized: normalizeText(getField(item, ["Kontinent"]))
})));

    const selectedContinent = localStorage.getItem("continent") || "all";

    if (selectedContinent !== "all") {
      data = data.filter(item => {
        const continentValue = getField(item, ["Kontinent"]);
        const normalizedSelected = normalizeText(selectedContinent);

        const continents = normalizeText(continentValue)
          .split(/[\/,;|]/)
          .map(part => part.trim())
          .filter(Boolean);

        return continents.includes(normalizedSelected);
      });
    }

    if (data.length === 0) {
      const frageEl = document.getElementById("frage");
      if (frageEl) {
        frageEl.innerText = "Keine Daten für diese Auswahl gefunden.";
      }
      return;
    }

    if (questionSetting === "all") {
      totalQuestions = data.length;
    } else {
      totalQuestions = Number(questionSetting) || 5;
    }

    if (totalQuestions > data.length) {
      totalQuestions = data.length;
    }

    let sourceQuestions = [...data];

if (typeof MODE !== "undefined" && MODE === "Sprache") {
  const groupedByLanguage = new Map();

  for (const item of data) {
    const languageRaw = getField(item, ["Sprache"]);
    const languageKey = normalizeText(languageRaw);

    if (!languageKey) continue;

    if (!groupedByLanguage.has(languageKey)) {
      groupedByLanguage.set(languageKey, {
        Sprache: languageRaw,
        entries: []
      });
    }

    groupedByLanguage.get(languageKey).entries.push(item);
  }

  sourceQuestions = Array.from(groupedByLanguage.values());
}

if (questionSetting === "all") {
  totalQuestions = sourceQuestions.length;
} else {
  totalQuestions = Number(questionSetting) || 5;
}

if (totalQuestions > sourceQuestions.length) {
  totalQuestions = sourceQuestions.length;
}

questions = shuffleArray(sourceQuestions).slice(0, totalQuestions);

    nextQuestion();
  } catch (err) {
    console.error("Fehler beim Laden:", err);
    const frageEl = document.getElementById("frage");
    if (frageEl) {
      frageEl.innerText = "Fehler beim Laden!";
    }
  }
}

function parseCSV(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current !== "") {
        rows.push(current);
      }
      current = "";

      if (char === "\r" && nextChar === "\n") {
        i++;
      }
    } else {
      current += char;
    }
  }

  if (current !== "") {
    rows.push(current);
  }

  if (!rows.length) {
    return [];
  }

  const headers = splitCSVLine(rows[0]).map(h =>
    h.replace(/\uFEFF/g, "").trim()
  );

  const result = [];

  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;

    const values = splitCSVLine(rows[i]);
    const obj = {};

    headers.forEach((header, index) => {
      obj[header] = (values[index] || "").trim();
    });

    result.push(obj);
  }

  return result;
}

function splitCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function getField(obj, possibleKeys) {
  for (const key of possibleKeys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }

  const realKeys = Object.keys(obj);

  for (const possibleKey of possibleKeys) {
    const normalizedPossibleKey = normalizeKey(possibleKey);

    for (const realKey of realKeys) {
      if (normalizeKey(realKey) === normalizedPossibleKey) {
        return obj[realKey];
      }
    }
  }

  return "";
}

function normalizeKey(key) {
  return (key || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function normalizeText(text) {
  return (text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getRandomLanguageSentence(question) {
  if (question.entries && Array.isArray(question.entries)) {
    const randomCountryIndex = Math.floor(Math.random() * question.entries.length);
    const randomCountry = question.entries[randomCountryIndex];

    const possibleSentences = [
      getField(randomCountry, ["Satz1", "Satz 1"]),
      getField(randomCountry, ["Satz2", "Satz 2"]),
      getField(randomCountry, ["Satz3", "Satz 3"])
    ].filter(sentence => sentence && sentence.trim() !== "");

    if (possibleSentences.length === 0) {
      return "Kein Satz vorhanden.";
    }

    const randomSentenceIndex = Math.floor(Math.random() * possibleSentences.length);
    return possibleSentences[randomSentenceIndex];
  }

  const possibleSentences = [
    getField(question, ["Satz1", "Satz 1"]),
    getField(question, ["Satz2", "Satz 2"]),
    getField(question, ["Satz3", "Satz 3"])
  ].filter(sentence => sentence && sentence.trim() !== "");

  if (possibleSentences.length === 0) {
    return "Kein Satz vorhanden.";
  }

  const randomIndex = Math.floor(Math.random() * possibleSentences.length);
  return possibleSentences[randomIndex];
}

function nextQuestion() {
  if (currentIndex >= totalQuestions) {
    showResult();
    return;
  }

  const frageEl = document.getElementById("frage");
  const satzEl = document.getElementById("satz");
  const antwortEl = document.getElementById("antwort");
  const resultEl = document.getElementById("result");
  const flagImg = document.getElementById("flagge");

  const mode = typeof MODE !== "undefined" ? MODE : "Hauptstadt";
  currentQuestion = questions[currentIndex];

  if (!currentQuestion) {
    if (frageEl) {
      frageEl.innerText = "Fehler: Keine Frage gefunden.";
    }
    return;
  }

  const land = getField(currentQuestion, ["Land"]);
  const flagge = getField(currentQuestion, ["Flagge"]);

  if (mode === "Flagge") {
    if (frageEl) {
      frageEl.innerText =
        "(" + (currentIndex + 1) + "/" + totalQuestions + ") " +
        "Zu welchem Land gehört diese Flagge?";
    }

    if (satzEl) {
      satzEl.innerText = "";
    }

    if (flagImg) {
      flagImg.style.display = "block";
      flagImg.src = flagge || "";
      flagImg.alt = "Flagge";
    }

  } else if (mode === "Sprache") {
    currentLanguageSentence = getRandomLanguageSentence(currentQuestion);

    if (frageEl) {
      frageEl.innerText =
        "(" + (currentIndex + 1) + "/" + totalQuestions + ") " +
        "Welche Sprache ist das?";
    }

    if (satzEl) {
      satzEl.innerText = '"' + currentLanguageSentence + '"';
    }

    if (flagImg) {
      flagImg.style.display = "none";
      flagImg.src = "";
    }

  } else if (mode === "Hauptstadt") {
    if (frageEl) {
      frageEl.innerText =
        "(" + (currentIndex + 1) + "/" + totalQuestions + ") " +
        "Was ist die Hauptstadt von " + land + "?";
    }

    if (satzEl) {
      satzEl.innerText = "";
    }

    if (flagImg) {
      flagImg.style.display = "none";
      flagImg.src = "";
    }

  } else {
    if (frageEl) {
      frageEl.innerText =
        "(" + (currentIndex + 1) + "/" + totalQuestions + ") " +
        "Fragetyp nicht erkannt.";
    }

    if (satzEl) {
      satzEl.innerText = "";
    }

    if (flagImg) {
      flagImg.style.display = "none";
      flagImg.src = "";
    }
  }

  if (antwortEl) {
    antwortEl.value = "";
    antwortEl.focus();
  }

  if (resultEl) {
    resultEl.innerText = "";
  }

  updateScoreDisplay();
}

function checkAnswer() {
  const antwortEl = document.getElementById("antwort");
  const resultEl = document.getElementById("result");
  const mode = typeof MODE !== "undefined" ? MODE : "Hauptstadt";

  if (!antwortEl || !resultEl) {
    return;
  }

  const input = normalizeText(antwortEl.value);

  if (!input) {
    return;
  }

  let correct = "";
  let displayCorrect = "";

  if (mode === "Flagge") {
    displayCorrect = getField(currentQuestion, ["Land"]);
    correct = normalizeText(displayCorrect);

  } else if (mode === "Sprache") {
    displayCorrect = currentQuestion.Sprache || getField(currentQuestion, ["Sprache"]);
    correct = normalizeText(displayCorrect);

  } else if (mode === "Hauptstadt") {
    displayCorrect = getField(currentQuestion, ["Hauptstadt"]);
    correct = normalizeText(displayCorrect);
  }

  if (!correct) {
    resultEl.innerText = "Fehler: Richtige Antwort konnte nicht gefunden werden.";
    return;
  }

  if (input === correct) {
    score++;
    resultEl.innerText = "✅ Richtig!";
  } else {
    resultEl.innerText = "❌ Falsch! Richtige Antwort: " + displayCorrect;
  }

  currentIndex++;

  localStorage.setItem("score", score);
  localStorage.setItem("currentQuestionIndex", currentIndex);

  updateScoreDisplay();

  setTimeout(nextQuestion, 1500);
}

function updateScoreDisplay() {
  const scoreDisplay = document.getElementById("scoreDisplay");
  if (scoreDisplay) {
    scoreDisplay.innerText = "Punkte: " + score;
  }
}

function showResult() {
  const percent = totalQuestions > 0
    ? Math.round((score / totalQuestions) * 100)
    : 0;

  document.body.innerHTML = `
    <div class="page-shell">
      <div class="quiz-card">
        <h1>Ergebnis</h1>
        <div class="quiz-box">
          <p class="question-text">Du hast ${score} von ${totalQuestions} richtig!</p>
          <p class="language-sentence">${percent}% korrekt</p>
          <div class="answer-area">
            <button class="primary-button" onclick="goHome()">Zurück zum Menü</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function goHome() {
  localStorage.clear();
  window.location.href = "index.html";
}

const antwortInput = document.getElementById("antwort");
if (antwortInput) {
  antwortInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      checkAnswer();
    }
  });
}

loadCSV();