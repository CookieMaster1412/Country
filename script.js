let data = [];
let currentQuestion = {};

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTRhAkRLMaWpUhCVV93l1naufzK0WC6tSCsxKRNxg6gNEx54OHFahpAsFr7cpQ2Lp6CRdoUohwJ0WUo/pub?output=csv";

async function loadCSV() {
  const res = await fetch(CSV_URL);
  const text = await res.text();

  data = parseCSV(text);
  nextQuestion();
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");

  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const current = lines[i].split(",");

    headers.forEach((header, j) => {
      obj[header.trim()] = current[j]?.trim();
    });

    result.push(obj);
  }

  return result;
}

function nextQuestion() {
  const mode = document.getElementById("mode").value;
  const random = data[Math.floor(Math.random() * data.length)];

  currentQuestion = random;

  const flagImg = document.getElementById("flagge");

  if (mode === "Flagge") {
    document.getElementById("frage").innerText =
      "Zu welchem Land gehört diese Flagge?";

    flagImg.style.display = "block";
    flagImg.src = random.Flagge;
  } else {
    flagImg.style.display = "none";

    document.getElementById("frage").innerText =
      "Was ist die " + mode + " von " + random.Land + "?";
  }

  document.getElementById("antwort").value = "";
  document.getElementById("result").innerText = "";
}

function checkAnswer() {
  const input = document.getElementById("antwort").value.trim().toLowerCase();
  const mode = document.getElementById("mode").value;

  let correct;

  if (mode === "Flagge") {
    correct = currentQuestion.Land.toLowerCase();
  } else {
    correct = currentQuestion[mode].toLowerCase();
  }

  if (input === correct) {
    document.getElementById("result").innerText = "✅ Richtig!";
  } else {
    document.getElementById("result").innerText =
      "❌ Falsch! Richtige Antwort: " + correct;
  }

  setTimeout(nextQuestion, 1500);
}

document.getElementById("mode").addEventListener("change", nextQuestion);

loadCSV();