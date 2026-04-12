import type { ClickCellMessage, ClickCellResponse } from "../types";

/**
 * Background service worker.
 * Uses the Chrome Debugger API to dispatch trusted mouse events.
 * LinkedIn checks event.isTrusted, so we need the debugger protocol
 * to produce events that pass that check.
 */

/** Track which tabs have the debugger attached */
const attachedTabs = new Set<number>();

async function ensureAttached(tabId: number): Promise<void> {
  if (!attachedTabs.has(tabId)) {
    await chrome.debugger.attach({ tabId }, "1.3");
    attachedTabs.add(tabId);
  }
}

async function ensureDetached(tabId: number): Promise<void> {
  if (attachedTabs.has(tabId)) {
    await chrome.debugger.detach({ tabId });
    attachedTabs.delete(tabId);
  }
}

/** Dispatch a single mouse event via the debugger */
async function dispatchMouseEvent(
  tabId: number,
  type: string,
  x: number,
  y: number
): Promise<void> {
  await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
    type,
    x,
    y,
    button: "left",
    clickCount: type === "mouseMoved" ? 0 : 1,
  });
}

chrome.runtime.onMessage.addListener(
  (message: ClickCellMessage & { eventType?: string }, sender, sendResponse: (response: ClickCellResponse) => void) => {
    if (!sender.tab?.id) return undefined;
    const tabId = sender.tab.id;

    // Original click handler (Queens): attach, press+release, detach
    if (message.type === "CLICK_CELL") {
      clickOnce(tabId, message.x, message.y)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((err: unknown) => {
          console.error("[LinkedIn Solver BG] Error:", err);
          sendResponse({ success: false, error: String(err) });
        });
      return true;
    }

    // Drag handler (Zip): individual mouse events with persistent debugger
    if (message.type === "MOUSE_EVENT" && message.eventType) {
      const eventType = message.eventType;

      ensureAttached(tabId)
        .then(() => dispatchMouseEvent(tabId, eventType, message.x, message.y))
        .then(async () => {
          // Detach after mouseReleased (end of drag)
          if (eventType === "mouseReleased") {
            await ensureDetached(tabId);
          }
          sendResponse({ success: true });
        })
        .catch(async (err: unknown) => {
          console.error("[LinkedIn Solver BG] Error:", err);
          await ensureDetached(tabId).catch(() => {});
          sendResponse({ success: false, error: String(err) });
        });
      return true;
    }

    return undefined;
  }
);

async function clickOnce(tabId: number, x: number, y: number): Promise<void> {
  await chrome.debugger.attach({ tabId }, "1.3");
  try {
    await dispatchMouseEvent(tabId, "mousePressed", x, y);
    await dispatchMouseEvent(tabId, "mouseReleased", x, y);
  } finally {
    await chrome.debugger.detach({ tabId });
    attachedTabs.delete(tabId);
  }
}
