"use strict";

var statusEl = document.getElementById("status");
var controlsEl = document.getElementById("controls");
var gameNameEl = document.getElementById("game-name");
var solveBtn = document.getElementById("solve-btn");

function detectGame(url) {
  try {
    var parsed = new URL(url);

    // LinkedIn games
    if (parsed.hostname.includes("linkedin.com")) {
      var linkedinGames = ["queens", "zip", "tango", "patches"];
      for (var i = 0; i < linkedinGames.length; i++) {
        if (parsed.pathname.includes("/games/" + linkedinGames[i])) {
          return { game: linkedinGames[i], site: "linkedin" };
        }
      }
    }

    // Archived Queens
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

  if (detected) {
    var label = detected.game.charAt(0).toUpperCase() + detected.game.slice(1);
    if (detected.site === "archived") label += " (Archived)";
    statusEl.textContent = "Game detected!";
    gameNameEl.textContent = label;
    controlsEl.classList.remove("hidden");

    solveBtn.addEventListener("click", function() {
      solveBtn.disabled = true;
      statusEl.textContent = "Solving...";
      chrome.tabs.sendMessage(tab.id, { type: "SOLVE", game: detected.game }, function(response) {
        if (response && response.success) {
          statusEl.textContent = "Solved!";
        } else {
          statusEl.textContent = "Error: " + (response ? response.error : "no response");
          solveBtn.disabled = false;
        }
      });
    });
  }
}

init();
