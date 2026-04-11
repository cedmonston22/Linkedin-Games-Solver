import type { ClickCellMessage, ClickCellResponse } from "../types";

/**
 * Background service worker.
 * Uses the Chrome Debugger API to dispatch trusted click events.
 * LinkedIn checks event.isTrusted, so we need the debugger protocol
 * to produce events that pass that check.
 */
chrome.runtime.onMessage.addListener(
  (message: ClickCellMessage, sender, sendResponse: (response: ClickCellResponse) => void) => {
    if (message.type === "CLICK_CELL" && sender.tab?.id !== undefined) {
      const tabId = sender.tab.id;
      clickOnce(tabId, message.x, message.y)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((err: unknown) => {
          console.error("[LinkedIn Solver BG] Error:", err);
          sendResponse({ success: false, error: String(err) });
        });
      return true; // keep sendResponse alive for async
    }
    return undefined;
  }
);

async function clickOnce(tabId: number, x: number, y: number): Promise<void> {
  await chrome.debugger.attach({ tabId }, "1.3");
  try {
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
  } finally {
    await chrome.debugger.detach({ tabId });
  }
}
