import type { SolveResponse } from "../types";

const statusEl = document.getElementById("status")!;
const controlsEl = document.getElementById("controls")!;
const gameNameEl = document.getElementById("game-name")!;
const solveBtn = document.getElementById("solve-btn")! as HTMLButtonElement;

interface DetectedGame {
  game: string;
  site: "linkedin" | "archived";
}

const LINKEDIN_GAMES = ["queens", "zip", "tango", "patches"];

function detectGame(url: string): DetectedGame | null {
  try {
    const parsed = new URL(url);

    // LinkedIn games
    if (parsed.hostname.includes("linkedin.com")) {
      for (const game of LINKEDIN_GAMES) {
        if (parsed.pathname.includes(`/games/${game}`)) {
          return { game, site: "linkedin" };
        }
      }
    }

    // Archived Queens
    if (parsed.hostname.includes("archivedqueens.com")) {
      return { game: "queens", site: "archived" };
    }
  } catch {
    // Invalid URL, ignore
  }

  return null;
}

async function init(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.url || !tab.id) return;

  const detected = detectGame(tab.url);

  if (detected) {
    let label = detected.game.charAt(0).toUpperCase() + detected.game.slice(1);
    if (detected.site === "archived") label += " (Archived)";

    statusEl.textContent = "Game detected!";
    gameNameEl.textContent = label;
    controlsEl.classList.remove("hidden");

    solveBtn.addEventListener("click", () => {
      solveBtn.disabled = true;
      statusEl.textContent = "Solving...";

      chrome.tabs.sendMessage(
        tab.id!,
        { type: "SOLVE", game: detected.game },
        (response: SolveResponse | undefined) => {
          if (response?.success) {
            statusEl.textContent = "Solved!";
          } else {
            statusEl.textContent = "Error: " + (response?.error ?? "no response");
            solveBtn.disabled = false;
          }
        }
      );
    });
  }
}

init();
