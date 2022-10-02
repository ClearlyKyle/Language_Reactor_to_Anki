(function ()
{
    /* This runs on all "youtube.com/watch" web pages */
    console.log("----- [content_script.js] LOADED");

    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse)
        {
            // listen for messages sent from background.js
            SendMessageToBackGround("[Requested Mode] " + request.mode) // new url is now in content scripts!

            if (request.mode == "text")
            {
                SendMessageToBackGround("We are using the READER");
                Reactor_Reader_Mode();
            }
            else if (request.mode == "player")
            {
                SendMessageToBackGround("We are using the PLAYER");
                Reactor_Player_Mode();
            }
            else if (request.mode == "video")
            {
                SendMessageToBackGround("We are using the VIDEO/TURTLE");

                console.log(window.location.pathname.split('/').length)

                let loop_for_video = setInterval(() =>
                {
                    console.log("Looking for video...")
                    if (document.querySelector('video'))
                    {
                        document.querySelector('video').setAttribute("crossOrigin", "anonymous")
                        clearInterval(loop_for_video)
                    }
                }, 0);

                if (window.location.pathname.split('/').length > 4)
                {
                    Reactor_Video_Mode();
                }
            }

            return true;
        }
    );

    function Reactor_Reader_Mode()
    {
        SendMessageToBackGround("Text reading mode");

        // Wait for the 'main' tag to be ready
        let watch_main = setInterval(() =>
        {
            if (document.getElementsByTagName('main')[0].children.length > 1)
            {
                clearInterval(watch_main)
                console.log("Main is ready!")

                // add an 'onClick' event to the "READ/EDIT" toggle button
                document.getElementsByClassName('MuiSwitch-input')[0].onclick = function ()
                {
                    if (document.getElementsByClassName('MuiSwitch-input')[0].checked)
                    { // READ mode is selected
                        SendMessageToBackGround("[MODE] READ MODE!")

                        OnReadMode();
                    }
                    else
                    { // EDIT mode is selected
                        SendMessageToBackGround("[MODE] EDIT MODE!")
                    }
                }

                console.log("Add onclick to the \"Go to Reader mode\" button...")

                var aTags = document.getElementsByTagName('button');
                var searchText = "Go to Reader mode";
                var found;

                for (var i = 0; i < aTags.length; i++)
                {
                    if (aTags[i].textContent == searchText)
                    {
                        found = aTags[i];
                        break;
                    }
                }
                found.onclick = function ()
                {
                    SendMessageToBackGround("[MODE] SWITCHING TO READ MODE!")
                    console.log("[MODE] SWITCHING TO READ MODE!")
                    OnReadMode();
                }
            }
        }, 100);
    }

    function Reactor_Player_Mode()
    {
        SendMessageToBackGround("Player Mode")
    }

    function Reactor_Video_Mode()
    {
        SendMessageToBackGround("Video/Turtle Mode")

        Add_Dictionary_Observer();
        Add_On_Click_To_All_Words();

        if (document.getElementsByClassName('anki-btn').length == 0)
        {
            SendMessageToBackGround("Add Anki Button")
            Add_Anki_Button();
        }
    }

    function OnReadMode()
    {
        // When switching to READ mode, the page takes some time to load all the text, we set
        //  an interval and wait for this to be complete...
        let wait_for_words_to_be_ready = setInterval(function ()
        {
            if (document.getElementsByClassName('lln-word').length)
            {
                clearInterval(wait_for_words_to_be_ready);
                console.log("WOOHOO WE ARE READY TO READ!!")

                if (typeof document.getElementsByClassName('lln-word')[0].onclick != 'function')
                    Add_On_Click_To_All_Words(); // add an 'onClick' event to every word!

                Add_Dictionary_Observer();
            }
            else
            {
                // wait for words to be ready to READ
                console.log("waiting for words...")
            }
        }, 100);
    }

    function Add_Anki_Button()
    {
        const btn_location = document.getElementsByClassName('lln-external-dicts-container')[0];

        /* create Anki Button */
        let anki_div = document.createElement("div");
        anki_div.className = "anki-btn lln-external-dict-btn tippy";
        anki_div.innerHTML = "Anki";
        anki_div.setAttribute("data-tippy-content", "Send to Anki");

        anki_div.onclick = Handle_Side_Bar_Dictionary;

        btn_location.appendChild(anki_div);
    }

    function Add_Dictionary_Observer()
    {
        var dict_wrap_observer = new MutationObserver(function (mutations)
        {
            // possible loss of Anki button after selecting a word with no transaltion 
            if (document.getElementsByClassName('MuiDrawer-paperAnchorRight')[0].length)
            {
                console.log(document.getElementsByClassName('MuiDrawer-paperAnchorRight')[0].innerText)
            }
            if (document.getElementsByClassName('MuiDrawer-paperAnchorRight')[0].style.visibility != 'hidden')
            {
                SendMessageToBackGround("Dictionary is visible");
                console.log("Dictionary is visible");
                if (document.getElementsByClassName('lln-full-dict-label').length)
                {
                    // 'Word not found.'
                    console.log(document.getElementsByClassName('lln-full-dict-label')[0].innerText)
                    console.log("NO TRANSLATION FOR THIS WORD!!")
                }
                else
                {
                    if (!document.getElementsByClassName('anki-btn').length)
                    {
                        // Currently no Anki button, so we add one
                        // console.log("Add Anki button");
                        Add_Anki_Button();
                    }
                }
            }
            else
            {
                SendMessageToBackGround("Dictionary is hidden");
                console.log("Dictionary is hidden");
            }
        });
        dict_wrap_observer.observe(document.getElementsByClassName('MuiDrawer-paperAnchorRight')[0],
            {
                //attributes: true,
                childList: true,
                subtree: true
            }
        );
    }

    function Handle_Side_Bar_Dictionary()
    {
        SendMessageToBackGround("[Handle_Subtitle_Dictionary] Sending side bar dictionary informaiton to ANKI...")
        /*
        word - top of the dictionary 
        basic_translation - this is under the word at the top
        extra_translation - this is all the other tranlations in the box bellow
        sentence - sentence the word is from
        */
        const word = document.getElementsByClassName('lln-dict-contextual')[0].children[0].innerText;
        const basic_translation = document.getElementsByClassName('lln-dict-contextual')[0].children[2].innerText;
        const extra_definitions = document.getElementsByClassName('dictionary-meanings')[0].innerText;
        const example_sentences = document.getElementsByClassName('lln-word-examples')[1].innerText;

        if (document.getElementsByClassName('anki-word').length)
        {
            // make the word we are saving appear BOLD and lowercase in the sentence
            var sentence = document.getElementsByClassName('anki-word')[0].parentNode.innerText;
            var sentence_translation = document.getElementsByClassName('anki-word')[0].parentNode.parentElement.parentElement.childNodes[1].children[0].innerText;

            // this regex might not word for all languages :(
            sentence = sentence.replace(new RegExp(`(?<![\u0400-\u04ff])${word}(?![\u0400-\u04ff])`, 'gi'), "<b>" + word + "</b>");
        }
        else
        {
            SendMessageToBackGround("[Handle_Side_Bar_Dictionary] Error finding the sentence...")
            console.log("[Handle_Side_Bar_Dictionary] Error finding the sentence...")
        }

        var fields = {
            "word": word,
            "basic-translation": basic_translation,
            "extra-translation": extra_definitions,
            "sentence": sentence,
            "sentence-translation": sentence_translation,
            "example-sentences": example_sentences,
        };

        console.log(fields)
        SendMessageToBackGround(fields);

        Send_data_to_ANKI(fields);
    }

    function Add_On_Click_To_All_Words()
    {
        SendMessageToBackGround("[Add_On_Click_To_All_Words] Adding all onClick events...")
        console.log("[Add_On_Click_To_All_Words] Adding all onClick events...")

        var all_subs = document.querySelectorAll('.lln-word');
        Array.from(all_subs).map((child) =>
        {
            child.onclick = function (event)
            {
                // attach event listener individually
                SendMessageToBackGround("CLICKED WORD : " + event.target.innerText)
                console.log("CLICKED WORD : " + event.target.innerText)

                if (document.getElementsByClassName('anki-word').length)
                {
                    // turn what ever word currently has the "anki-word" class name
                    document.getElementsByClassName('anki-word')[0].classList.toggle("anki-word")

                    // add classname to current word clicked
                    event.target.parentNode.classList.add("anki-word")
                }
                else
                {
                    // if no 'anki-word' exists, then we add it here

                    // Currently no word has this class name so we add it
                    event.target.parentNode.classList.add("anki-word")
                }
            }
        });

        SendMessageToBackGround("[Add_On_Click_To_All_Words] all onClick events have been added!")
    }

    function Send_data_to_ANKI(data)
    {
        console.log("[Send_data_to_ANKI] Sending to Anki...")
        SendMessageToBackGround("[Send_data_to_ANKI] Sending to Anki...")
        console.log(data)

        let add_image = false;
        if (window.location.href.includes("video"))
        {
            // We can add a screenshot of the video!
            var canvas = document.createElement('canvas');
            var video = document.querySelector('video');
            var ctx = canvas.getContext('2d');

            // Change the size here
            canvas.width = 640;
            canvas.height = 360;

            ctx.drawImage(video, 0, 0, 640, 360);

            var dataURL = canvas.toDataURL("image/png");
            dataURL = dataURL.replace(/^data:image\/(png|jpg);base64,/, "")

            var imageFilename = 'Langauge_Reactor_' + canvas.width + 'x' + canvas.height + '_' + Math.random().toString(36).substring(7) + '.png';

            add_image = true;
        }

        chrome.storage.local.get(
            ['ankiDeckNameSelected', 'ankiNoteNameSelected', 'ankiFieldWord', 'ankiSentence', 'ankiSentenceTranslation', 'ankiExampleSentence', 'ankiBasicTranslation', 'ankiExtraTranslation', 'ankiConnectUrl'],
            ({ ankiDeckNameSelected, ankiNoteNameSelected, ankiFieldWord, ankiSentence, ankiSentenceTranslation, ankiExampleSentence, ankiBasicTranslation, ankiExtraTranslation, ankiConnectUrl }) =>
            {
                url = ankiConnectUrl || 'http://localhost:8765';
                model = ankiNoteNameSelected || 'Basic';
                deck = ankiDeckNameSelected || 'Default';

                console.log(
                    {
                        ankiDeckNameSelected, ankiNoteNameSelected, ankiFieldWord, ankiSentence, ankiBasicTranslation, ankiExtraTranslation, ankiConnectUrl
                    }
                )

                console.log("Image File Name: ", data['image-filename'])
                console.log("Deck Name: ", model)
                console.log("Model Name: ", deck)

                console.log(fields)

                if (add_image)
                {
                    var fields = {
                        [ankiFieldWord]: data['word'],
                        [ankiSentence]: data['sentence'],
                        [ankiSentenceTranslation]: data['sentence-translation'],
                        [ankiBasicTranslation]: data['basic-translation'],
                        [ankiExtraTranslation]: data['extra-translation'],
                        [ankiExampleSentence]: data['example-sentences']
                        "Screenshot": '<img src="' + imageFilename + '" />',
                    };

                    var body = {
                        "action": "multi",
                        "params": {
                            "actions": [
                                {
                                    "action": "storeMediaFile",
                                    "params": {
                                        "filename": imageFilename,
                                        "data": dataURL
                                    }
                                },
                                {
                                    "action": "addNote",
                                    "params": {
                                        "note": {
                                            "modelName": model,
                                            "deckName": deck,
                                            "fields": fields,
                                            "tags": ["languagereactor_anki"]
                                        }
                                    }
                                }
                            ]
                        }
                    };
                }
                else
                {
                    var fields = {
                        [ankiFieldWord]: data['word'],
                        [ankiSentence]: data['sentence'],
                        [ankiBasicTranslation]: data['basic-translation'],
                        [ankiExtraTranslation]: data['extra-translation'],
                        "Screenshot": '',
                    };

                    var body = {
                        "action": "multi",
                        "params": {
                            "actions": [
                                {
                                    "action": "addNote",
                                    "params": {
                                        "note": {
                                            "modelName": model,
                                            "deckName": deck,
                                            "fields": fields,
                                            "tags": ["languagereactor_anki"]
                                        }
                                    }
                                }
                            ]
                        }
                    };
                }


                var permission_data = {
                    "action": "requestPermission",
                    "version": 6,
                };

                fetch(url, {
                    method: "POST",
                    body: JSON.stringify(permission_data),
                })
                    .then((res) => res.json())
                    .then((data) =>
                    {
                        console.log(data);
                        fetch(url, {
                            method: "POST",
                            body: JSON.stringify(body),
                        })
                            .then((res) => res.json())
                            .then((data) =>
                            {
                                console.log("Fetch Return:")
                                console.log(data)
                                if (data.result === null)
                                {
                                    // https://jsfiddle.net/2qasgcfd/3/
                                    // https://github.com/apvarun/toastify-js
                                    ShowErrorMessage("Error! " + error);
                                    return
                                }
                                else
                                {
                                    /* show sucess message */
                                    ShowSucessMessage("Sucessfully added to ANKI");
                                }
                            })
                            .catch((error) =>
                            {
                                /* show error message */
                                ShowErrorMessage("Error! " + error);
                            })
                    }).catch((error) =>
                    {
                        /* show error message */
                        ShowErrorMessage("Error! " + error);
                    });
                console.log("Send to ANKI complete!");
                SendMessageToBackGround("[LLW_Send_Data_To_Anki] Send to ANKI complete!");
            }
        );
    }

    function SendMessageToBackGround(text)
    {
        // send sucess message to background
        chrome.runtime.sendMessage({
            message: text
        });
        console.log(text);
    }
    function ShowSucessMessage(message)
    {
        // SUCESS
        Toastify({
            text: message,
            duration: 3000,
            style: {
                background: "light blue",
            }
        }).showToast();
        //console.log(message);
        SendMessageToBackGround(message);
    }
    function ShowErrorMessage(message)
    {
        Toastify({
            text: message,
            duration: 3000,
            style: {
                background: "red",
            }
        }).showToast();
        //console.log(message);
        SendMessageToBackGround(message);
    }
})();

