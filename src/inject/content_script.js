(function ()
{
    /* This runs on all "youtube.com/watch" web pages */
    console.log("----- [content_script.js] LOADED");

    function Observe_Dictionary()
    {
        const observer = new MutationObserver(function (mutationsList, observer)
        {
            console.log("DICTIONARY OBSERVER CALLED")
            for (const mutation of mutationsList)
            {
                if (mutation.target.className === 'lln-full-dict')
                {
                    const list_of_dicts = document.getElementsByClassName('lln-external-dicts-container')[0];

                    const anki_button = list_of_dicts.getElementsByClassName('anki-btn');
                    if (anki_button.length === 0)
                        Add_Anki_Button();

                    break;
                }
            }
        });

        // Start observing mutations in the document
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse)
        {
            // listen for messages sent from background.js
            SendMessageToBackGround("[Requested Mode] " + request.mode) // new url is now in content scripts!
            Observe_Dictionary();
        }
    );

    function Capture_Video_Screenshot(video_element)
    {
        if (!video_element)
            return null; // Is this ok?

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Set the canvas dimensions to match the video element
        canvas.width = video_element.videoWidth;
        canvas.height = video_element.videoHeight;

        // Draw the current frame of the video onto the canvas
        context.drawImage(video_element, 0, 0, canvas.width, canvas.height);

        // Get the screenshot as a data URL
        const screenshot_data_url = canvas.toDataURL('image/png');

        //console.log(screenshot_data_url);
        return screenshot_data_url;
    }

    function Get_Screen_Shot_If_We_Are_On_A_Video_Page()
    {
        const currentPage = window.location.pathname;

        if (currentPage === '/player')
        {
            console.log("Video Player");
            var video_element = document.querySelector('#plyr_video');
            // TODO : Send this screenshot to Anki
        } else if (currentPage.includes('/video'))
        {
            var video_element = document.querySelector('video');
            console.log("TutleTube")
        }
        console.log(video_element);
        return Capture_Video_Screenshot(video_element);
    }

    function Add_Anki_Button()
    {
        const btn_location = document.getElementsByClassName('lln-external-dicts-container')[0];

        if (btn_location)
        {
            if (document.getElementsByClassName('anki-btn')[0])
            {
                SendMessageToBackGround("Anki button alreay exists so dont add another")
                return;
            }

            /* create Anki Button */
            let anki_div = document.createElement("div");
            anki_div.className = "anki-btn lln-external-dict-btn tippy";
            anki_div.innerHTML = "Anki";
            anki_div.setAttribute("data-tippy-content", "Send to Anki");

            anki_div.onclick = Handle_Side_Bar_Dictionary;

            btn_location.appendChild(anki_div);
        }
    }

    function Handle_Side_Bar_Dictionary()
    {
        SendMessageToBackGround("[Handle_Subtitle_Dictionary] Get Sidebar Dictionary Information...")

        // TODO : Add screenshot image to Anki cards
        //const screenshot = Get_Screen_Shot_If_We_Are_On_A_Video_Page();
        //console.log(screenshot);

        /*
        root_dictionary - the actual dictionary panel on the right
        word - top of the dictionary 
        basic_translation - this is under the word at the top
        extra_translation - this is all the other tranlations in the box bellow
        sentence - sentence the word is from Tatoeba
        */
        const root_dictionary = document.querySelector('.lln-full-dict');

        const word = document.getElementsByClassName('lln-dict-contextual')[0].children[0].innerText;
        const basic_translation = document.getElementsByClassName('lln-dict-contextual')[0].children[2].innerText;
        const extra_definitions = root_dictionary.childNodes[3].innerText.replaceAll('\n', '<br>');
        const example_sentences_element = document.getElementsByClassName('lln-word-examples');

        var example_sentences = "";
        if (example_sentences_element.length > 1)
        {
            // if example_sentences_element is > 1 then we have both Current Text and Tatoeba Examples
            const tatoeba_examples = example_sentences_element[1].children;
            for (let index = 1; index < example_sentences_element[1].children.length; index++)
            {
                const example = tatoeba_examples[index];

                for (let e of example.childNodes)
                    example_sentences = example_sentences + e.innerText.replaceAll('\n', '') + "<br>";
            }
        }

        var sentence = ""
        var sentence_translation = ""
        const anki_word_location = example_sentences_element[0].childNodes[1];

        if (anki_word_location)
        {
            sentence = anki_word_location.innerText;
            sentence = sentence.replace(/(\r\n|\n|\r)/gm, ""); // Remove the newlines

            // this regex might not word for all languages :(
            // make the word we are saving appear BOLD and lowercase in the sentence
            sentence = sentence.replace(new RegExp(`(?<![\u0400-\u04ff])${word}(?![\u0400-\u04ff])`, 'gi'), "<b>" + word + "</b>");
        }
        else
        {
            SendMessageToBackGround("[Handle_Side_Bar_Dictionary] Error finding the current sentence...")
        }

        var fields = {
            "word": word,
            "basic-translation": basic_translation,
            "extra-translation": extra_definitions,
            "sentence": sentence,
            "sentence-translation": sentence_translation,
            "example-sentences": example_sentences,
        };

        Send_data_to_ANKI(fields);
    }

    function Send_data_to_ANKI(data)
    {
        SendMessageToBackGround("[Send_data_to_ANKI] Sending to Anki...")
        SendMessageToBackGround({ data })

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
                        ankiDeckNameSelected, ankiNoteNameSelected, ankiFieldWord, ankiSentence, ankiSentenceTranslation, ankiExampleSentence, ankiBasicTranslation, ankiExtraTranslation, ankiConnectUrl
                    }
                )

                console.log("Deck Name: ", model)
                console.log("Model Name: ", deck)

                if (add_image)
                {
                    var fields = {
                        [ankiFieldWord]: data['word'],
                        [ankiSentence]: data['sentence'],
                        [ankiSentenceTranslation]: data['sentence-translation'],
                        [ankiBasicTranslation]: data['basic-translation'],
                        [ankiExtraTranslation]: data['extra-translation'],
                        [ankiExampleSentence]: data['example-sentences'],
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
                                            "tags": ["languagereactor_anki"],
                                            "options": {
                                                "allowDuplicate": true,
                                            }
                                        },

                                    }
                                },
                            ]
                        }
                    };
                }
                else
                {
                    var fields = {
                        [ankiFieldWord]: data['word'],
                        [ankiSentence]: data['sentence'],
                        [ankiSentenceTranslation]: data['sentence-translation'],
                        [ankiBasicTranslation]: data['basic-translation'],
                        [ankiExtraTranslation]: data['extra-translation'],
                        [ankiExampleSentence]: data['example-sentences'],
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
                                            "tags": ["languagereactor_anki"],
                                            "options": {
                                                "allowDuplicate": true,
                                            }
                                        },
                                    }
                                }
                            ]
                        }
                    };
                }

                console.log({ fields })

                const permission_data = {
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
                                console.log("Fetch Return from anki-connect:", data)
                                if (data[0].error)
                                {
                                    ShowErrorMessage(data[0].error)
                                } else
                                {
                                    ShowSucessMessage("Sucessfully added to ANKI"); /* show sucess message */
                                }
                            })
                            .catch((error) =>
                            {
                                ShowErrorMessage("Error! " + error); /* show error message */
                            })
                    }).catch((error) =>
                    {
                        ShowErrorMessage("Error! " + error); /* show error message */
                    });
                SendMessageToBackGround("[LLW_Send_Data_To_Anki] Send to ANKI complete!");
            }
        );
    }

    function SendMessageToBackGround(text)
    {
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
        console.log(message);
        SendMessageToBackGround(message);
    }

})();

