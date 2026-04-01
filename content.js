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
  chrome.storage.local.get(["enabled", "replacements"], (data) => {
    // Only run if enabled AND there are rules in storage
    if (data.enabled !== false && data.replacements) {
      applyRules(document.body, data.replacements);
    }
  });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "stop") {
    location.reload();
  } else if (request.action === "start" || request.action === "update") {
    run();
  }
});

run();

const observer = new MutationObserver((mutations) => {
  chrome.storage.local.get(["enabled", "replacements"], (data) => {
    if (data.enabled !== false && data.replacements) {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => applyRules(node, data.replacements));
      }
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });
