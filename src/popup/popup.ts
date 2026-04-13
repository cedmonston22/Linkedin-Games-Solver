import type { SolveResponse } from "../types";

interface GameConfig {
  id: string;
  label: string;
}

interface DetectedGame {
  game: string;
  site: "linkedin" | "archived";
}

const GAMES: Record<string, GameConfig> = {
  queens:  { id: "card-queens",  label: "Queens" },
  zip:     { id: "card-zip",     label: "Zip" },
  tango:   { id: "card-tango",   label: "Tango" },
  patches: { id: "card-patches", label: "Patches" },
};

const LINKEDIN_GAMES = ["queens", "zip", "tango", "patches"];

const statusDot = document.getElementById("status-dot")!;
const statusText = document.getElementById("status-text")!;

function setStatus(state: string, message: string): void {
  statusDot.className = "status-dot";
  if (state) statusDot.classList.add(state);
  statusText.textContent = message;
}

function detectGame(url: string): DetectedGame | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("linkedin.com")) {
      for (const game of LINKEDIN_GAMES) {
        if (parsed.pathname.includes(`/games/${game}`)) {
          return { game, site: "linkedin" };
        }
      }
    }

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

  if (!detected) {
    setStatus("", "Navigate to a LinkedIn game to begin");
    return;
  }

  const gameKey = detected.game;
  const gameInfo = GAMES[gameKey];
  if (!gameInfo) return;

  const card = document.getElementById(gameInfo.id)!;
  const statusSpan = card.querySelector(".card-status")!;
  const solveBtn = card.querySelector(".solve-btn")! as HTMLButtonElement;

  // Activate card
  card.classList.add("active");
  statusSpan.textContent = "READY";

  const siteLabel = detected.site === "archived" ? " (Archived)" : "";
  setStatus("active", `${gameInfo.label}${siteLabel} detected — ready to solve`);

  solveBtn.addEventListener("click", () => {
    solveBtn.disabled = true;
    solveBtn.classList.add("solving");
    statusSpan.textContent = "SOLVING";
    setStatus("solving", `Solving ${gameInfo.label}...`);

    chrome.tabs.sendMessage(
      tab.id!,
      { type: "SOLVE", game: gameKey },
      (response: SolveResponse | undefined) => {
        solveBtn.classList.remove("solving");

        if (response?.success) {
          card.classList.remove("active");
          card.classList.add("solved");
          statusSpan.textContent = "SOLVED";
          setStatus("solved", `${gameInfo.label} solved successfully!`);
          solveBtn.style.display = "none";
        } else {
          const errMsg = response?.error ?? "no response";
          statusSpan.textContent = "ERROR";
          setStatus("error", `Error: ${errMsg}`);
          solveBtn.disabled = false;
        }
      }
    );
  });
}

init();
