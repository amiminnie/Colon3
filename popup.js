const enableToggle = document.getElementById("enableToggle");
const listContainer = document.getElementById("emojiListContainer");
const newKey = document.getElementById("newKey");
const newValue = document.getElementById("newValue");
const addBtn = document.getElementById("addBtn");
const saveBtn = document.getElementById("saveBtn");
const loadPresetBtn = document.getElementById("loadPresetBtn");
const warningMsg = document.getElementById("emptyWarning");

let rules = {};

// The preset data you requested
const presetReplacements = {
  ":)": ":3", ": )": ":3", ":-)": ":3",
  ":(": "3:", ": (": "3:", ":-(": "3:",
  "😀": ":D", "😃": ":D", "😆": "XD",
  "🙂": ":3", "😑": "-_-", "🙁": "3:",
  "😦": "D:", "😺": ":3", "😼": ">:3",
  "😿": "3:"
};

// 1. Initial Load from storage
chrome.storage.local.get(["enabled", "replacements"], (data) => {
    enableToggle.checked = data.enabled !== false;
    rules = data.replacements || {}; 
    renderRules();
});

// 2. Render function to build the list UI
function renderRules() {
    listContainer.innerHTML = "";
    const keys = Object.entries(rules);

    if (keys.length === 0) {
        warningMsg.style.display = "block";
    } else {
        warningMsg.style.display = "none";
        keys.forEach(([key, val]) => {
            const row = document.createElement("div");
            row.className = "rule-row";
            row.style = "display: flex; justify-content: space-between; margin-bottom: 5px; background: white; padding: 3px 8px; border-radius: 5px; font-size: 12px; align-items: center;";
            row.innerHTML = `
                <span>${key} → ${val}</span>
                <button class="del-btn" data-key="${key}" style="color:red; cursor:pointer; border:none; background:none; font-weight:bold; font-size: 16px;">-</button>
            `;
            listContainer.appendChild(row);
        });

        // Add event listeners to delete buttons
        document.querySelectorAll(".del-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const keyToDelete = e.target.getAttribute("data-key");
                delete rules[keyToDelete];
                renderRules();
            });
        });
    }
}

// 3. Load the preset into the current session
loadPresetBtn.addEventListener("click", () => {
    rules = { ...presetReplacements }; 
    renderRules();
});

// 4. Add new rule to the temporary object
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

// 5. Handle the Enable/Disable toggle
enableToggle.addEventListener("change", () => {
    const isEnabled = enableToggle.checked;
    chrome.storage.local.set({ enabled: isEnabled }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: isEnabled ? "start" : "stop" });
            }
        });
    });
});

// 6. Save rules to storage and notify content script
saveBtn.addEventListener("click", () => {
    chrome.storage.local.set({ replacements: rules }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "update" });
                
                // Visual feedback for the save button
                const originalText = saveBtn.innerText;
                saveBtn.innerText = "Saved! :3";
                setTimeout(() => { saveBtn.innerText = originalText; }, 1000);
            }
        });
    });
});