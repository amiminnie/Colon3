
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

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchCase(original, replacement) {
  const hasLetters = /[a-zA-Z]/.test(original);
  if (!hasLetters) return replacement;

  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function applyRules(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (shouldIgnore(node)) return;
    let original = originalTexts.get(node);
    if (original === undefined) {
      original = node.nodeValue;
      originalTexts.set(node, original);
    }
    if (!isRunning) {
      if (node.nodeValue !== original) node.nodeValue = original;
      return;
    }

    let text = original;
    let modified = false;
    for (const [key, val] of Object.entries(activeReplacements)) {
      const regex = new RegExp(escapeRegExp(key), "gi");

      const newText = text.replace(regex, (match) => {
        modified = true;
        return matchCase(match, val);
      });

      text = newText;
    }

    if (modified && node.nodeValue !== text) {
      node.nodeValue = text;
    } else if (!modified && node.nodeValue !== original) {
      node.nodeValue = original; 
    }
  } else {
    node.childNodes.forEach((child) => applyRules(child));
  }
}

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
      applyRules(document.body);
    }
  );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "stop") {
    isRunning = false;
    applyRules(document.body); 
    sendResponse({ status: "reverted" });
  } else if (request.action === "start" || request.action === "update") {
    updateConfigAndRun();
    sendResponse({ status: "updated" });
  }
  return true;
});
const observer = new MutationObserver((mutations) => {
  if (!isRunning || Object.keys(activeReplacements).length === 0) return;

  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => applyRules(node));
  }
});

observer.observe(document.body, { childList: true, subtree: true });

updateConfigAndRun();