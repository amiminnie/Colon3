function shouldIgnore(node) {
  const tag = node.parentElement?.tagName;
  return ["INPUT", "TEXTAREA", "SCRIPT", "STYLE"].includes(tag) || node.parentElement?.isContentEditable;
}

function applyRules(node, replacements) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (shouldIgnore(node)) return;
    let text = node.nodeValue;
    let modified = false;

    for (const [key, val] of Object.entries(replacements)) {
      if (text.includes(key)) {
        text = text.split(key).join(val);
        modified = true;
      }
    }
    if (modified) node.nodeValue = text;
  } else {
    node.childNodes.forEach((child) => applyRules(child, replacements));
  }
}

function run() {
  if (!chrome.runtime?.id || !chrome.storage?.local) return;

  chrome.storage.local.get(["globalEnabled", "threeEnabled", "silliesEnabled", "disabledSites", "replacements", "sillyReplacements"], (data) => {
    if (chrome.runtime.lastError) return; 

    const globalEnabled = data.globalEnabled !== false;
    const threeEnabled = data.threeEnabled !== false;
    const silliesEnabled = data.silliesEnabled !== false;
    const disabledSites = data.disabledSites || [];
    const currentHost = window.location.hostname;

    const isRunning = globalEnabled && !disabledSites.includes(currentHost);

    if (isRunning) {
      let combinedReplacements = {};
      
      if (threeEnabled && data.replacements) {
        combinedReplacements = { ...combinedReplacements, ...data.replacements };
      }
      if (silliesEnabled && data.sillyReplacements) {
        combinedReplacements = { ...combinedReplacements, ...data.sillyReplacements };
      }

      if (Object.keys(combinedReplacements).length > 0) {
        applyRules(document.body, combinedReplacements);
      }
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "stop") {
    location.reload();
    sendResponse({ status: "reloaded" });
  } else if (request.action === "start" || request.action === "update") {
    run();
    sendResponse({ status: "updated" });
  }
  return true; 
});

run();

const observer = new MutationObserver((mutations) => {
  if (!chrome.runtime?.id || !chrome.storage?.local) return;

  chrome.storage.local.get(["globalEnabled", "threeEnabled", "silliesEnabled", "disabledSites", "replacements", "sillyReplacements"], (data) => {
    if (chrome.runtime.lastError) return;

    const globalEnabled = data.globalEnabled !== false;
    const threeEnabled = data.threeEnabled !== false;
    const silliesEnabled = data.silliesEnabled !== false;
    const disabledSites = data.disabledSites || [];
    const currentHost = window.location.hostname;

    const isRunning = globalEnabled && !disabledSites.includes(currentHost);

    if (isRunning) {
      let combinedReplacements = {};
      if (threeEnabled && data.replacements) combinedReplacements = { ...combinedReplacements, ...data.replacements };
      if (silliesEnabled && data.sillyReplacements) combinedReplacements = { ...combinedReplacements, ...data.sillyReplacements };

      if (Object.keys(combinedReplacements).length > 0) {
        for (const mutation of mutations) {
          mutation.addedNodes.forEach((node) => applyRules(node, combinedReplacements));
        }
      }
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });