console.log("----- [background.js] LOADED");

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) =>
{
    if (changeInfo.url && tab.url.includes("https://www.languagereactor.com/"))
    {
        console.log("URL changed to:", changeInfo.url);

        chrome.tabs.sendMessage(tabId, { type: "url-changed", url: changeInfo.url });
    }
});
