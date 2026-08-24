// 1. Memory Cache for State & Original Text
const originalTexts = new WeakMap();
let isRunning = false;
let activeReplacements = {};

function shouldIgnore(node) {
  const tag = node.parentElement?.tagName;
  return (
    ["INPUT", "TEXTAREA", "SCRIPT", "STYLE", "NOSCRIPT"].includes(tag) ||
    node.parentElement?.isContentEditable
  );
}

// Helper to escape special regex characters in keys (e.g., emoticons, brackets)
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Matches the casing of the original text onto the replacement text
function matchCase(original, replacement) {
  const hasLetters = /[a-zA-Z]/.test(original);
  if (!hasLetters) return replacement;

  // ALL CAPS -> ALL CAPS (e.g., COFFEE -> BEANS)
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  // Title Case -> Title Case (e.g., Coffee -> Beans)
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  // lowercase or default (e.g., coffee -> beans)
  return replacement;
}

function applyRules(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (shouldIgnore(node)) return;

    // Cache the original text the very first time this node is processed
    let original = originalTexts.get(node);
    if (original === undefined) {
      original = node.nodeValue;
      originalTexts.set(node, original);
    }

    // If extension is disabled, restore original text instantly
    if (!isRunning) {
      if (node.nodeValue !== original) node.nodeValue = original;
      return;
    }

    let text = original;
    let modified = false;

    // Apply case-insensitive replacements while mirroring original case
    for (const [key, val] of Object.entries(activeReplacements)) {
      const regex = new RegExp(escapeRegExp(key), "gi");

      const newText = text.replace(regex, (match) => {
        modified = true;
        return matchCase(match, val);
      });

      text = newText;
    }

    // Only update the DOM if text actually changed
    if (modified && node.nodeValue !== text) {
      node.nodeValue = text;
    } else if (!modified && node.nodeValue !== original) {
      node.nodeValue = original; // Revert if modified state cleared
    }
  } else {
    node.childNodes.forEach((child) => applyRules(child));
  }
}

// 2. Fetch config once and store in memory
function updateConfigAndRun() {
  if (!chrome.runtime?.id || !chrome.storage?.local) return;

  chrome.storage.local.get(
    [
      "globalEnabled",
      "threeEnabled",
      "silliesEnabled",
      "disabledSites",
      "replacements",
      "sillyReplacements"
    ],
    (data) => {
      if (chrome.runtime.lastError) return;

      const globalEnabled = data.globalEnabled !== false;
      const disabledSites = data.disabledSites || [];
      const currentHost = window.location.hostname;

      isRunning = globalEnabled && !disabledSites.includes(currentHost);
      activeReplacements = {};

      if (isRunning) {
        if (data.threeEnabled !== false && data.replacements) {
          Object.assign(activeReplacements, data.replacements);
        }
        if (data.silliesEnabled !== false && data.sillyReplacements) {
          Object.assign(activeReplacements, data.sillyReplacements);
        }
      }

      // Apply changes or reverts across the document
      applyRules(document.body);
    }
  );
}

// 3. Listen for messages to update or stop without reloads
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "stop") {
    isRunning = false;
    applyRules(document.body); // Instantly reverts all cached text nodes
    sendResponse({ status: "reverted" });
  } else if (request.action === "start" || request.action === "update") {
    updateConfigAndRun();
    sendResponse({ status: "updated" });
  }
  return true;
});

// 4. MutationObserver relying on cached memory state
const observer = new MutationObserver((mutations) => {
  if (!isRunning || Object.keys(activeReplacements).length === 0) return;

  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => applyRules(node));
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial execution
updateConfigAndRun();