// background.js
// Placeholder for Chrome extension background service worker logic. 

// Open the comparison UI in a new tab when the extension icon is clicked.

let lastComparedTabId = null;

chrome.action.onClicked.addListener((tab) => {
  if (!tab.url) return;
  // Store the tabId for later use
  lastComparedTabId = tab.id;
  // Pass the current tab's URL as a query parameter for comparison
  const compareUrl = chrome.runtime.getURL('index.html') + '?url=' + encodeURIComponent(tab.url) + `&tabId=${tab.id}`;
  chrome.tabs.create({
    url: compareUrl
  });
});

// Listen for messages from the comparison UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'REQUEST_RENDERED_DOM') {
    const tabId = message.tabId || lastComparedTabId;
    if (!tabId) {
      console.error('No tabId provided for REQUEST_RENDERED_DOM');
      sendResponse({ error: 'No tabId provided' });
      return;
    }
    console.log('[background] Injecting content script into tab', tabId);
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('[background] Error injecting content script:', chrome.runtime.lastError.message);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      console.log('[background] Content script injected, sending GET_RENDERED_DOM message');
      chrome.tabs.sendMessage(tabId, { type: 'GET_RENDERED_DOM' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[background] Error sending message to content script:', chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          console.log('[background] Received response from content script:', response);
          sendResponse({ dom: response?.dom });
        }
      });
    });
    // Indicate async response
    return true;
  }
}); 