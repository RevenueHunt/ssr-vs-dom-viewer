// content.js
console.log('[content] Content script loaded');
// Listen for a message to get the rendered DOM and respond with the outer HTML

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'GET_RENDERED_DOM') {
    console.log('[content] Received GET_RENDERED_DOM message');
    sendResponse({
      dom: document.documentElement.outerHTML
    });
    // Return true to indicate async response (not needed here, but for future-proofing)
    return true;
  }
}); 