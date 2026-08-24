// This stuff is for local testing
if (!window.chrome || !chrome.runtime || !chrome.runtime.id) {
  window.chrome = {
    tabs: {
      query: (obj, cb) => cb([{}])
    },
    storage: {
      local: {
        get: (keys, cb) => cb({}),
        set: (obj, cb) => {
          if (cb) cb();
        }
      }
    }
  };
}
//------------------------------------

const globalToggle = document.getElementById("globalToggle");
const threeToggle = document.getElementById("threeToggle");
const silliesToggle = document.getElementById("silliesToggle");
const siteToggle = document.getElementById("siteToggle");
const toggleSettingsBtn = document.getElementById("toggleSettingsBtn");
const toggleSilliesSettingsBtn = document.getElementById("toggleSilliesSettingsBtn");
const toggleSitesBtn = document.getElementById("toggleSitesBtn");
const settingsPanel = document.getElementById("settingsPanel");
const silliesSettingsPanel = document.getElementById("silliesSettingsPanel");
const sitesPanel = document.getElementById("sitesPanel");
const listContainer = document.getElementById("emojiListContainer");
const newKey = document.getElementById("newKey");
const newValue = document.getElementById("newValue");
const addBtn = document.getElementById("addBtn");
const warningMsg = document.getElementById("emptyWarning");
const sillyListContainer = document.getElementById("sillyListContainer");
const newSillyKey = document.getElementById("newSillyKey");
const newSillyValue = document.getElementById("newSillyValue");
const addSillyBtn = document.getElementById("addSillyBtn");
const sillyWarningMsg = document.getElementById("sillyEmptyWarning");
const disabledSitesContainer = document.getElementById("disabledSitesContainer");
const noDisabledSitesMsg = document.getElementById("noDisabledSites");

const modalOverlay = document.getElementById("modalOverlay");
const modalMessage = document.getElementById("modalMessage");
const modalMergeBtn = document.getElementById("modalMergeBtn");
const modalReplaceBtn = document.getElementById("modalReplaceBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");

const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const loadPresetBtn = document.getElementById("loadPresetBtn");
const importFileInput = document.getElementById("importFileInput");

const exportSillyBtn = document.getElementById("exportSillyBtn");
const importSillyBtn = document.getElementById("importSillyBtn");
const loadSillyPresetBtn = document.getElementById("loadSillyPresetBtn");
const importSillyFileInput = document.getElementById("importSillyFileInput");

let rules = {};
let sillyRules = {};
let disabledSites = [];
let currentHost = "";
let pendingAction = null;

const presetReplacements = {
  ":)": ":3",
  ": )": ":3",
  ":-)": ":3",
  "=)": ":3",
  ":]": ":3",
  "=]": ":3",
  ":>": ":3",
  ":D": ":3",
  ";)": ";3",
  "; )": ";3",
  ";-)": ";3",
  ";]": ";3",
  ";>": ";3",
  ";D": ";3",
  ":(": "3:",
  ": (": "3:",
  ":-(": "3:",
  "=(": "3:",
  ":[": "3:",
  "=[": "3:",
  "D:": "3:",
  XD: "X3"
};

const sillyPresetReplacements = {
  cookie: "biscuit",
  coffee: "beans",
  incognito: "sketchy"
};

function notifyTabUpdate() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "update" }, () => {
        if (chrome.runtime.lastError) {
          // Ignored if current page does not run content script
        }
      });
    }
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    try {
      const url = new URL(tabs[0].url);
      currentHost = url.hostname;
    } catch (e) {
      siteToggle.disabled = true;
    }
  }

  chrome.storage.local.get(
    ["globalEnabled", "threeEnabled", "silliesEnabled", "disabledSites", "replacements", "sillyReplacements"],
    (data) => {
      globalToggle.checked = data.globalEnabled !== false;
      threeToggle.checked = data.threeEnabled !== false;
      silliesToggle.checked = data.silliesEnabled !== false;
      disabledSites = data.disabledSites || [];

      if (currentHost && disabledSites.includes(currentHost)) {
        siteToggle.checked = false;
      } else {
        siteToggle.checked = true;
      }
      if (data.replacements === undefined) {
        rules = { ...presetReplacements };
        chrome.storage.local.set({ replacements: rules });
      } else {
        rules = data.replacements;
      }
      if (data.sillyReplacements === undefined) {
        sillyRules = { ...sillyPresetReplacements };
        chrome.storage.local.set({ sillyReplacements: sillyRules });
      } else {
        sillyRules = data.sillyReplacements;
      }
      renderRules();
      renderSillyRules();
      renderDisabledSites();
    }
  );
});

let isAnimating = false;
const ANIMATION_DURATION = 100;

function openPanel(panelToOpen) {
  if (isAnimating) return;
  const currentlyActive = [settingsPanel, silliesSettingsPanel, sitesPanel].find((panel) =>
    panel.classList.contains("active")
  );
  if (currentlyActive === panelToOpen) {
    isAnimating = true;
    panelToOpen.classList.remove("active");
    setTimeout(() => {
      isAnimating = false;
    }, ANIMATION_DURATION);
    return;
  }

  if (currentlyActive) {
    isAnimating = true;
    currentlyActive.classList.remove("active");
    setTimeout(() => {
      panelToOpen.classList.add("active");
      setTimeout(() => {
        isAnimating = false;
      }, ANIMATION_DURATION);
    }, ANIMATION_DURATION);
    return;
  }
  isAnimating = true;
  panelToOpen.classList.add("active");
  setTimeout(() => {
    isAnimating = false;
  }, ANIMATION_DURATION);
}

toggleSettingsBtn.addEventListener("click", () => openPanel(settingsPanel));
toggleSilliesSettingsBtn.addEventListener("click", () => openPanel(silliesSettingsPanel));
toggleSitesBtn.addEventListener("click", () => openPanel(sitesPanel));

function renderRules() {
  listContainer.textContent = "";
  const keys = Object.entries(rules);

  warningMsg.style.display = keys.length === 0 ? "block" : "none";

  keys.forEach(([key, val]) => {
    const row = document.createElement("div");
    row.className = "rule-row";
    const contentSpan = document.createElement("span");
    contentSpan.appendChild(document.createTextNode(key));

    const arrowSpan = document.createElement("span");
    arrowSpan.textContent = " → ";
    contentSpan.appendChild(arrowSpan);

    contentSpan.appendChild(document.createTextNode(val));
    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.setAttribute("data-key", key);

    const closeSpan = document.createElement("span");
    closeSpan.textContent = "×";
    delBtn.appendChild(closeSpan);

    row.appendChild(contentSpan);
    row.appendChild(delBtn);
    listContainer.appendChild(row);
  });
}

function renderSillyRules() {
  sillyListContainer.textContent = "";
  const keys = Object.entries(sillyRules);

  sillyWarningMsg.style.display = keys.length === 0 ? "block" : "none";

  keys.forEach(([key, val]) => {
    const row = document.createElement("div");
    row.className = "rule-row";
    const contentSpan = document.createElement("span");
    contentSpan.appendChild(document.createTextNode(key));

    const arrowSpan = document.createElement("span");
    arrowSpan.textContent = " → ";
    contentSpan.appendChild(arrowSpan);

    contentSpan.appendChild(document.createTextNode(val));
    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.setAttribute("data-key", key);

    const closeSpan = document.createElement("span");
    closeSpan.textContent = "×";
    delBtn.appendChild(closeSpan);

    row.appendChild(contentSpan);
    row.appendChild(delBtn);
    sillyListContainer.appendChild(row);
  });
}

function renderDisabledSites() {
  disabledSitesContainer.textContent = "";
  noDisabledSitesMsg.style.display = disabledSites.length === 0 ? "block" : "none";

  disabledSites.forEach((site) => {
    const row = document.createElement("div");
    row.className = "rule-row";
    const siteSpan = document.createElement("span");
    siteSpan.style.overflow = "hidden";
    siteSpan.style.textOverflow = "ellipsis";
    siteSpan.style.whiteSpace = "nowrap";
    siteSpan.style.maxWidth = "150px";
    siteSpan.textContent = site;
    const delBtn = document.createElement("button");
    delBtn.className = "del-site-btn del-btn";
    delBtn.setAttribute("data-site", site);

    const closeSpan = document.createElement("span");
    closeSpan.textContent = "×";
    delBtn.appendChild(closeSpan);

    row.appendChild(siteSpan);
    row.appendChild(delBtn);
    disabledSitesContainer.appendChild(row);
  });
}

// Event Delegation for Deletions
listContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".del-btn");
  if (!btn) return;
  const keyToDelete = btn.getAttribute("data-key");
  if (keyToDelete && rules[keyToDelete] !== undefined) {
    delete rules[keyToDelete];
    renderRules();
    chrome.storage.local.set({ replacements: rules }, () => notifyTabUpdate());
  }
});

sillyListContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".del-btn");
  if (!btn) return;
  const keyToDelete = btn.getAttribute("data-key");
  if (keyToDelete && sillyRules[keyToDelete] !== undefined) {
    delete sillyRules[keyToDelete];
    renderSillyRules();
    chrome.storage.local.set({ sillyReplacements: sillyRules }, () => notifyTabUpdate());
  }
});

disabledSitesContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".del-site-btn");
  if (!btn) return;
  const siteToEnable = btn.getAttribute("data-site");
  if (siteToEnable) {
    disabledSites = disabledSites.filter((s) => s !== siteToEnable);
    if (siteToEnable === currentHost) siteToggle.checked = true;
    saveDisabledSites(true);
  }
});

function updateExtensionState() {
  chrome.storage.local.set(
    {
      globalEnabled: globalToggle.checked,
      threeEnabled: threeToggle.checked,
      silliesEnabled: silliesToggle.checked
    },
    () => {
      saveDisabledSites(true);
    }
  );
}

function saveDisabledSites(shouldUpdate = false) {
  chrome.storage.local.set({ disabledSites: disabledSites }, () => {
    renderDisabledSites();
    if (shouldUpdate) {
      notifyTabUpdate();
    }
  });
}

globalToggle.addEventListener("change", updateExtensionState);
threeToggle.addEventListener("change", updateExtensionState);
silliesToggle.addEventListener("change", updateExtensionState);

siteToggle.addEventListener("change", () => {
  if (!currentHost) return;
  if (!siteToggle.checked && !disabledSites.includes(currentHost)) {
    disabledSites.push(currentHost);
  } else if (siteToggle.checked) {
    disabledSites = disabledSites.filter((s) => s !== currentHost);
  }
  updateExtensionState();
});

addBtn.addEventListener("click", () => {
  const k = newKey.value.trim();
  const v = newValue.value.trim();
  if (k && v) {
    rules[k] = v;
    newKey.value = "";
    newValue.value = "";
    renderRules();
    chrome.storage.local.set({ replacements: rules }, () => notifyTabUpdate());
  }
});

addSillyBtn.addEventListener("click", () => {
  const k = newSillyKey.value.trim();
  const v = newSillyValue.value.trim();
  if (k && v) {
    sillyRules[k] = v;
    newSillyKey.value = "";
    newSillyValue.value = "";
    renderSillyRules();
    chrome.storage.local.set({ sillyReplacements: sillyRules }, () => notifyTabUpdate());
  }
});

// Modal Logic
function showModal(message, onMerge, onReplace) {
  modalMessage.textContent = message;
  modalOverlay.classList.add("active");
  pendingAction = { onMerge, onReplace };
}

function closeModal() {
  modalOverlay.classList.remove("active");
  pendingAction = null;
}

modalMergeBtn.addEventListener("click", () => {
  if (pendingAction && pendingAction.onMerge) pendingAction.onMerge();
  closeModal();
});

modalReplaceBtn.addEventListener("click", () => {
  if (pendingAction && pendingAction.onReplace) pendingAction.onReplace();
  closeModal();
});

modalCancelBtn.addEventListener("click", closeModal);

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Main Rules Export / Import / Preset
exportBtn.addEventListener("click", () => downloadJSON(rules, "colon3-rules.json"));

loadPresetBtn.addEventListener("click", () => {
  showModal(
    "Load :3 Presets?",
    () => {
      rules = { ...rules, ...presetReplacements };
      renderRules();
      chrome.storage.local.set({ replacements: rules }, () => notifyTabUpdate());
    },
    () => {
      rules = { ...presetReplacements };
      renderRules();
      chrome.storage.local.set({ replacements: rules }, () => notifyTabUpdate());
    }
  );
});

importBtn.addEventListener("click", () => importFileInput.click());

importFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      showModal(
        "Import Rules?",
        () => {
          rules = { ...rules, ...importedData };
          renderRules();
          chrome.storage.local.set({ replacements: rules }, () => notifyTabUpdate());
        },
        () => {
          rules = { ...importedData };
          renderRules();
          chrome.storage.local.set({ replacements: rules }, () => notifyTabUpdate());
        }
      );
    } catch (err) {
      alert("Invalid JSON file.");
    }
    importFileInput.value = "";
  };
  reader.readAsText(file);
});

// Sillies Rules Export / Import / Preset
exportSillyBtn.addEventListener("click", () => downloadJSON(sillyRules, "colon3-sillies.json"));

loadSillyPresetBtn.addEventListener("click", () => {
  showModal(
    "Load Silly Presets?",
    () => {
      sillyRules = { ...sillyRules, ...sillyPresetReplacements };
      renderSillyRules();
      chrome.storage.local.set({ sillyReplacements: sillyRules }, () => notifyTabUpdate());
    },
    () => {
      sillyRules = { ...sillyPresetReplacements };
      renderSillyRules();
      chrome.storage.local.set({ sillyReplacements: sillyRules }, () => notifyTabUpdate());
    }
  );
});

importSillyBtn.addEventListener("click", () => importSillyFileInput.click());

importSillyFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      showModal(
        "Import Silly Rules?",
        () => {
          sillyRules = { ...sillyRules, ...importedData };
          renderSillyRules();
          chrome.storage.local.set({ sillyReplacements: sillyRules }, () => notifyTabUpdate());
        },
        () => {
          sillyRules = { ...importedData };
          renderSillyRules();
          chrome.storage.local.set({ sillyReplacements: sillyRules }, () => notifyTabUpdate());
        }
      );
    } catch (err) {
      alert("Invalid JSON file.");
    }
    importSillyFileInput.value = "";
  };
  reader.readAsText(file);
});

const container = document.querySelector(".container");

const resizeObserver = new ResizeObserver(() => {
  const height = container.getBoundingClientRect().height;

  document.documentElement.style.height = `${height}px`;
  document.body.style.height = `${height}px`;
});

resizeObserver.observe(container);

document.addEventListener("DOMContentLoaded", function () {
  const currentVersion = "v1.4";

  fetch(`https://api.github.com/repos/amiminnie/colon3/releases/latest`)
    .then((response) => response.json())
    .then((data) => {
      const latestVersion = data.tag_name;
      const releaseUrl = data.html_url;
      const skippedVersion = localStorage.getItem("skipped_version");

      if (latestVersion && latestVersion !== currentVersion && skippedVersion !== latestVersion) {
        const updateContainer = document.getElementById("update-container");
        const updateLabel = document.getElementById("update-label");
        const skipButton = document.getElementById("skip-update");

        if (updateContainer && updateLabel && skipButton) {
          updateLabel.href = releaseUrl;
          updateLabel.textContent = `Version ${latestVersion} available`;
          updateContainer.style.display = "flex";

          skipButton.onclick = function () {
            localStorage.setItem("skipped_version", latestVersion);
            updateContainer.style.display = "none";
          };
        }
      }
    })
    .catch((error) => {
      console.error("Could not check for updates:", error);
    });
});