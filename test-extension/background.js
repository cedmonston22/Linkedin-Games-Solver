"use strict";

// Background service worker
// Uses the Chrome Debugger API to dispatch trusted mouse events.

var attachedTabs = {};

function ensureAttached(tabId) {
  if (attachedTabs[tabId]) return Promise.resolve();
  return chrome.debugger.attach({ tabId: tabId }, "1.3").then(function() {
    attachedTabs[tabId] = true;
  });
}

function ensureDetached(tabId) {
  if (!attachedTabs[tabId]) return Promise.resolve();
  return chrome.debugger.detach({ tabId: tabId }).then(function() {
    delete attachedTabs[tabId];
  });
}

function dispatchMouseEvent(tabId, type, x, y) {
  return chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchMouseEvent", {
    type: type,
    x: x,
    y: y,
    button: "left",
    clickCount: type === "mouseMoved" ? 0 : 1
  });
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (!sender.tab || sender.tab.id === undefined) return;
  var tabId = sender.tab.id;

  // Original click handler (Queens): attach, press+release, detach
  if (message.type === "CLICK_CELL") {
    clickOnce(tabId, message.x, message.y).then(function() {
      sendResponse({ success: true });
    }).catch(function(err) {
      console.error("[LinkedIn Solver BG] Error:", err);
      sendResponse({ success: false, error: String(err) });
    });
    return true;
  }

  // Drag handler (Zip): individual mouse events with persistent debugger
  if (message.type === "MOUSE_EVENT" && message.eventType) {
    var eventType = message.eventType;

    ensureAttached(tabId)
      .then(function() {
        return dispatchMouseEvent(tabId, eventType, message.x, message.y);
      })
      .then(function() {
        if (eventType === "mouseReleased") {
          return ensureDetached(tabId);
        }
      })
      .then(function() {
        sendResponse({ success: true });
      })
      .catch(function(err) {
        console.error("[LinkedIn Solver BG] Error:", err);
        ensureDetached(tabId).catch(function() {});
        sendResponse({ success: false, error: String(err) });
      });
    return true;
  }
});

async function clickOnce(tabId, x, y) {
  await chrome.debugger.attach({ tabId: tabId }, "1.3");
  try {
    await dispatchMouseEvent(tabId, "mousePressed", x, y);
    await dispatchMouseEvent(tabId, "mouseReleased", x, y);
  } finally {
    await chrome.debugger.detach({ tabId: tabId });
    delete attachedTabs[tabId];
  }
}
