// for localhost testing
if (!window.chrome || !chrome.runtime || !chrome.runtime.id) {
    window.chrome = {
        tabs: { 
            query: (obj, cb) => cb([{}]) 
        },
        storage: {
            local: {
                get: (keys, cb) => cb({}),
                set: (obj, cb) => { if (cb) cb(); }
            }
        }
    };
}

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
const saveBtn = document.getElementById("saveBtn");
const loadPresetBtn = document.getElementById("loadPresetBtn");
const warningMsg = document.getElementById("emptyWarning");
const sillyListContainer = document.getElementById("sillyListContainer");
const newSillyKey = document.getElementById("newSillyKey");
const newSillyValue = document.getElementById("newSillyValue");
const addSillyBtn = document.getElementById("addSillyBtn");
const saveSillyBtn = document.getElementById("saveSillyBtn");
const loadSillyPresetBtn = document.getElementById("loadSillyPresetBtn");
const sillyWarningMsg = document.getElementById("sillyEmptyWarning");

const disabledSitesContainer = document.getElementById("disabledSitesContainer");
const noDisabledSitesMsg = document.getElementById("noDisabledSites");

let rules = {};
let sillyRules = {};
let disabledSites = [];
let currentHost = "";

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
    "XD": "X3"
};

const sillyPresetReplacements = {
    "cookie": "biscuit",
    "Cookie": "Biscuit",
    "coffee": "beans",
    "socks": "thigh highs",
    "incognito": "sketchy"
};

function forceTabRefresh() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.reload(tabs[0].id);
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

            rules = data.replacements || {};
            sillyRules = data.sillyReplacements || {};

            renderRules();
            renderSillyRules();
            renderDisabledSites();
        }
    );
});

function openPanel(panelToOpen) {
    [settingsPanel, silliesSettingsPanel, sitesPanel].forEach((panel) => {
        if (panel === panelToOpen) {
            panel.classList.toggle("active");
        } else {
            panel.classList.remove("active");
        }
    });
}

toggleSettingsBtn.addEventListener("click", () => openPanel(settingsPanel));
toggleSilliesSettingsBtn.addEventListener("click", () => openPanel(silliesSettingsPanel));
toggleSitesBtn.addEventListener("click", () => openPanel(sitesPanel));

function renderRules() {
    listContainer.innerHTML = "";
    const keys = Object.entries(rules);
    warningMsg.style.display = keys.length === 0 ? "block" : "none";
    keys.forEach(([key, val]) => {
        const row = document.createElement("div");
        row.className = "rule-row";
        row.innerHTML = `<span>${key} <span class="material-symbols-outlined">
arrow_forward
</span> ${val}</span><button class="del-btn" data-key="${key}"><span class="material-symbols-outlined">
close
</span></button>`;
        listContainer.appendChild(row);
    });
    document.querySelectorAll("#settingsPanel .del-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            delete rules[e.target.getAttribute("data-key")];
            renderRules();
        });
    });
}

function renderSillyRules() {
    sillyListContainer.innerHTML = "";
    const keys = Object.entries(sillyRules);
    sillyWarningMsg.style.display = keys.length === 0 ? "block" : "none";
    keys.forEach(([key, val]) => {
        const row = document.createElement("div");
        row.className = "rule-row";
        row.innerHTML = `<span>${key} <span class="material-symbols-outlined">
arrow_forward
</span> ${val}</span><button class="del-btn" data-key="${key}"><span class="material-symbols-outlined">
close
</span></button>`;
        sillyListContainer.appendChild(row);
    });
    document.querySelectorAll("#silliesSettingsPanel .del-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            delete sillyRules[e.target.getAttribute("data-key")];
            renderSillyRules();
        });
    });
}

function renderDisabledSites() {
    disabledSitesContainer.innerHTML = "";
    noDisabledSitesMsg.style.display = disabledSites.length === 0 ? "block" : "none";
    disabledSites.forEach((site) => {
        const row = document.createElement("div");
        row.className = "rule-row";
        row.innerHTML = `<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:150px;">${site}</span><button class="del-site-btn del-btn" data-site="${site}"><span class="material-symbols-outlined">
close
</span></button>`;
        disabledSitesContainer.appendChild(row);
    });
    document.querySelectorAll(".del-site-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const siteToEnable = e.target.getAttribute("data-site");
            disabledSites = disabledSites.filter((s) => s !== siteToEnable);
            if (siteToEnable === currentHost) siteToggle.checked = true;
            saveDisabledSites(true); 
        });
    });
}

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

function saveDisabledSites(shouldRefresh = false) {
    chrome.storage.local.set({ disabledSites: disabledSites }, () => {
        renderDisabledSites();
        if (shouldRefresh) {
            forceTabRefresh();
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

loadPresetBtn.addEventListener("click", () => {
    rules = { ...presetReplacements };
    renderRules();
});
addBtn.addEventListener("click", () => {
    const k = newKey.value.trim();
    const v = newValue.value.trim();
    if (k && v) {
        rules[k] = v;
        newKey.value = "";
        newValue.value = "";
        renderRules();
    }
});
saveBtn.addEventListener("click", () => {
    chrome.storage.local.set({ replacements: rules }, () => {
        const text = saveBtn.innerText;
        saveBtn.innerText = "Saved! :3";
        setTimeout(() => {
            saveBtn.innerText = text;
            forceTabRefresh(); 
        }, 1500);
    });
});

loadSillyPresetBtn.addEventListener("click", () => {
    sillyRules = { ...sillyPresetReplacements };
    renderSillyRules();
});
addSillyBtn.addEventListener("click", () => {
    const k = newSillyKey.value.trim();
    const v = newSillyValue.value.trim();
    if (k && v) {
        sillyRules[k] = v;
        newSillyKey.value = "";
        newSillyValue.value = "";
        renderSillyRules();
    }
});
saveSillyBtn.addEventListener("click", () => {
    chrome.storage.local.set({ sillyReplacements: sillyRules }, () => {
        const text = saveSillyBtn.innerText;
        saveSillyBtn.innerText = "Saved! :3";
        setTimeout(() => {
            saveSillyBtn.innerText = text;
            forceTabRefresh();
        }, 1500);
    });
});
