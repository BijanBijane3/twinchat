chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({
    url: ["https://chatgpt.com/*", "https://chat.openai.com/*", "https://gemini.google.com/*"]
  });
  for (const tab of tabs) {
    if (tab.id) {
      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }).catch(() => {});
    }
  }
});

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "API") {
    fetch(`http://127.0.0.1:5000${req.endpoint}`, {
      method: req.method || "POST",
      headers: { "Content-Type": "application/json" },
      body: req.body ? JSON.stringify(req.body) : undefined
    })
      .then(r => r.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});
