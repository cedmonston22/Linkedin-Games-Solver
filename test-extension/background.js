"use strict";

// Background service worker
// Uses the Chrome Debugger API to dispatch trusted click events.

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === "CLICK_CELL" && sender.tab) {
    var tabId = sender.tab.id;
    clickOnce(tabId, message.x, message.y).then(function() {
      sendResponse({ success: true });
    }).catch(function(err) {
      console.error("[LinkedIn Solver BG] Error:", err);
      sendResponse({ success: false, error: String(err) });
    });
    return true;
  }
});

async function clickOnce(tabId, x, y) {
  await chrome.debugger.attach({ tabId: tabId }, "1.3");
  try {
    await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: x,
      y: y,
      button: "left",
      clickCount: 1
    });
    await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: x,
      y: y,
      button: "left",
      clickCount: 1
    });
  } finally {
    await chrome.debugger.detach({ tabId: tabId });
  }
}
