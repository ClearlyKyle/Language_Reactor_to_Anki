console.log("----- [background.js] LOADED");

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse)
{
    console.log(request.message)
});