"use strict";

var GAMES = {
  queens:  { id: "card-queens",  label: "Queens" },
  zip:     { id: "card-zip",     label: "Zip" },
  tango:   { id: "card-tango",   label: "Tango" },
  patches: { id: "card-patches", label: "Patches" }
};

var statusDot = document.getElementById("status-dot");
var statusText = document.getElementById("status-text");

function setStatus(state, message) {
  statusDot.className = "status-dot";
  if (state) statusDot.classList.add(state);
  statusText.textContent = message;
}

function detectGame(url) {
  try {
    var parsed = new URL(url);

    if (parsed.hostname.includes("linkedin.com")) {
      var linkedinGames = ["queens", "zip", "tango", "patches"];
      for (var i = 0; i < linkedinGames.length; i++) {
        if (parsed.pathname.includes("/games/" + linkedinGames[i])) {
          return { game: linkedinGames[i], site: "linkedin" };
        }
      }
    }

    if (parsed.hostname.includes("archivedqueens.com")) {
      return { game: "queens", site: "archived" };
    }
  } catch (e) {}

  return null;
}

async function init() {
  var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  var tab = tabs[0];
  if (!tab || !tab.url) return;

  var detected = detectGame(tab.url);

  if (!detected) {
    setStatus("", "Navigate to a LinkedIn game to begin");
    return;
  }

  var gameKey = detected.game;
  var gameInfo = GAMES[gameKey];
  if (!gameInfo) return;

  var card = document.getElementById(gameInfo.id);
  var statusSpan = card.querySelector(".card-status");
  var solveBtn = card.querySelector(".solve-btn");

  // Activate card
  card.classList.add("active");
  statusSpan.textContent = "READY";

  var siteLabel = detected.site === "archived" ? " (Archived)" : "";
  setStatus("active", gameInfo.label + siteLabel + " detected — ready to solve");

  solveBtn.addEventListener("click", function() {
    solveBtn.disabled = true;
    solveBtn.classList.add("solving");
    statusSpan.textContent = "SOLVING";
    setStatus("solving", "Solving " + gameInfo.label + "...");

    chrome.tabs.sendMessage(tab.id, { type: "SOLVE", game: gameKey }, function(response) {
      solveBtn.classList.remove("solving");

      if (response && response.success) {
        card.classList.remove("active");
        card.classList.add("solved");
        statusSpan.textContent = "SOLVED";
        setStatus("solved", gameInfo.label + " solved successfully!");
        solveBtn.style.display = "none";
      } else {
        var errMsg = response ? response.error : "no response";
        statusSpan.textContent = "ERROR";
        setStatus("error", "Error: " + errMsg);
        solveBtn.disabled = false;
      }
    });
  });
}

init();
