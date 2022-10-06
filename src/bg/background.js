console.log("----- [background.js] LOADED");

function Add_onUpdate()
{
    console.log("----- [background.js] Add_onUpdate");

    chrome.tabs.onUpdated.addListener(
        function (tabId, changeInfo, tab)
        {
            if (changeInfo.status == 'complete' && tab.status == 'complete' && tab.url != undefined)
            {
                console.log("Updated tab (" + tabId + ")=>>> " + tab.url);

                if (tab.url.includes("languagereactor.com"))
                {
                    if (tab.url.indexOf("languagereactor") != -1)
                    {
                        if (tab.url.indexOf("player") != -1)
                        {
                            var message = "player";
                        }
                        else if (tab.url.indexOf("text") != -1)
                        {
                            var message = "text";
                        }
                        else if (tab.url.indexOf("video") != -1)
                        {
                            var message = "video";
                        }
                    }
                    console.log("Sending message: " + message)
                    chrome.tabs.sendMessage(tab.id, { mode: message });
                }
            }
            return true;
        }
    );
}

Add_onUpdate()