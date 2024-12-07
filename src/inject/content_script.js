(function ()
{
    console.log("----- [content_script.js] LOADED");

    //
    // DEBUG MODE
    //
    const CONSOLE_LOGGING = false;
    if (!CONSOLE_LOGGING)
    {
        console.log = function () { };
    }

    //
    // STARTUP
    //
    if (document.readyState === "loading")
    {
        document.addEventListener("DOMContentLoaded", () => init());
    }
    else
    {
        init();
    }

    chrome.runtime.onMessage.addListener((message, sender, send_response) =>
    {
        if (message.type === "url-changed")
        {
            console.log("Received URL change notification:", message.url);
            init();
        }
    });

    //
    // GLOBALS
    //
    let DICTIONARY_OBSERVER_SET = false;
    let TEXT_PAGE_OBSERVER_SET = false;
    let VIDEO_PAGE_OBSERVER_SET = false;
    let CLICKED_SENTENCE_ELEMENT = null;

    function wait_for_element(element, callback)
    {
        const observer = new MutationObserver((mutations, observer) =>
        {
            const search_element = document.getElementsByClassName(element)[0];
            if (search_element)
            {
                callback(search_element);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    //https://www.languagereactor.com/m/um_zh-TW_-
    //https://www.languagereactor.com/m/um_ru_-/t_cdb10e1fa01b

    //lri-MediaPlayer_TEXT-wrap
    //lri-VideoView-wrap

    function init()
    {
        if (!DICTIONARY_OBSERVER_SET)
        {
            const observer = new MutationObserver((mutations, observer) =>
            {
                const search_element = document.getElementsByClassName("lln-full-dict")[0];
                if (search_element)
                {
                    console.log("Dictionary is open");

                    const list_of_dicts = document.getElementsByClassName('lln-external-dicts-container')[0];

                    if (list_of_dicts)
                    {
                        const anki_button = list_of_dicts.getElementsByClassName('anki-btn');
                        if (anki_button.length === 0)
                        {
                            add_anki_button();
                        }
                    }
                }
            });
            // TODO : change from body to better element...
            observer.observe(document.body, { childList: true, subtree: true });

            DICTIONARY_OBSERVER_SET = true;
        }

        if (!TEXT_PAGE_OBSERVER_SET)
        {
            wait_for_element("lri-MediaPlayer_TEXT-wrap", (element) =>
            {
                TEXT_PAGE_OBSERVER_SET = false;

                element.style.border = "2px solid red";

                let sentence_list_element_wait = setInterval(() =>
                {
                    const list_element = document.querySelector('[data-test-id="virtuoso-item-list"]');
                    if (list_element)
                    {
                        clearInterval(sentence_list_element_wait);

                        list_element.addEventListener('click', (event) =>
                        {
                            const clicked_element = event.target.closest('.sentence-wrap');
                            if (clicked_element && list_element.contains(clicked_element))
                            {
                                CLICKED_SENTENCE_ELEMENT = clicked_element;
                            }
                        });
                    }
                }, 100);
            });

            TEXT_PAGE_OBSERVER_SET = true;
        }

        if (!VIDEO_PAGE_OBSERVER_SET)
        {
            wait_for_element("lri-VideoView-wrap", (element) =>
            {
                VIDEO_PAGE_OBSERVER_SET = false;

                element.style.border = "2px solid blue";

                // Add the onclick event for subtitles to the right of the video
                let sentence_list_element_wait = setInterval(() =>
                {
                    const list_element = document.querySelector('[data-test-id="virtuoso-item-list"]');

                    if (list_element)
                    {
                        clearInterval(sentence_list_element_wait);

                        list_element.addEventListener('click', (event) =>
                        {
                            const clicked_element = event.target.closest('.sentence-wrap');
                            if (clicked_element && list_element.contains(clicked_element))
                            {
                                CLICKED_SENTENCE_ELEMENT = clicked_element;
                            }
                        });
                    }
                }, 100);
            });

            // Add the onclick event for the subtitles under the video and fullscreen mode
            let under_video_sub_element_wait = setInterval(() =>
            {
                const under_video_sub_element = document.getElementsByClassName('bottom-panel')[1]; // under video
                if (under_video_sub_element)
                {
                    clearInterval(under_video_sub_element_wait);

                    const observer = new MutationObserver((mutationsList) =>
                    {
                        mutation_found = false;
                        for (const mutation of mutationsList)
                        {
                            if (mutation.addedNodes.length)
                            {
                                // If we let the subtitles play, then the element could be unloaded, then reloaded
                                if (mutation.addedNodes[0].className === "main-translation-wrap")
                                {
                                    mutation_found = true;
                                }
                            }

                            // Checks for changes in the transaltion part of the subtitles, this will fire multiple times
                            // due to each word of the subtitle having its own element
                            if (mutation.target.className === "sentence-view")
                            {
                                if (mutation.target.parentElement)
                                {
                                    mutation_found = true;
                                }
                            }

                            if (mutation_found)
                            {
                                const list_element = document.querySelector('[data-test-id="virtuoso-item-list"]');
                                const play_button_element = list_element.getElementsByClassName('lr-play-btn always-visible')[0];

                                if (play_button_element)
                                {
                                    CLICKED_SENTENCE_ELEMENT = play_button_element.parentElement.parentElement;
                                    break;
                                }
                            }
                        }
                    });
                    observer.observe(under_video_sub_element, { childList: true, subtree: true });
                }
            }, 100);

            VIDEO_PAGE_OBSERVER_SET = true;
        }
    }

    /* create Anki Button */
    const anki_div = document.createElement("div");
    anki_div.className = "anki-btn lln-external-dict-btn tippy";
    anki_div.innerHTML = "Anki";
    anki_div.setAttribute("data-tippy-content", "Send to Anki");
    anki_div.onclick = handle_side_bar_dictionary;

    function add_anki_button()
    {
        if (!document.getElementsByClassName('anki-btn')[0])
        {
            const btn_location = document.getElementsByClassName('lln-external-dicts-container')[0];
            btn_location.appendChild(anki_div);
        }
    }

    async function capture_video_screenshot(video_element)
    {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = video_element.videoWidth;
        canvas.height = video_element.videoHeight;
        context.drawImage(video_element, 0, 0, canvas.width, canvas.height);

        let image_data = canvas.toDataURL('image/png');
        image_data = image_data.replace(/^data:image\/(png|jpg);base64,/, "")

        const video_current_time = video_element.currentTime;

        const image_filename = `Reactor2Anki_${video_current_time}.png`;

        return Promise.resolve([image_filename, image_data]);
    }

    function handle_side_bar_dictionary()
    {
        chrome.storage.local.get(
            [
                "ankiDeckNameSelected",
                "ankiNoteNameSelected",
                "ankiFieldWord",
                "ankiSentence",
                "ankiScreenshot",
                "ankiSentenceTranslation",
                "ankiExampleSentence",
                "ankiBasicTranslation",
                "ankiExtraTranslation",
                "ankiConnectUrl"
            ],
            async ({
                ankiDeckNameSelected,
                ankiNoteNameSelected,
                ankiFieldWord,
                ankiSentence,
                ankiScreenshot,
                ankiSentenceTranslation,
                ankiExampleSentence,
                ankiBasicTranslation,
                ankiExtraTranslation,
                ankiConnectUrl }) =>
            {
                /*
                root_dictionary     - the actual dictionary panel on the right
                word                - top of the dictionary 
                basic_translation   - this is under the word at the top
                extra_translation   - this is all the other tranlations in the box bellow
                sentence            - sentence the word is from Tatoeba
                */

                console.log("[Handle_Subtitle_Dictionary] Get Sidebar Dictionary Information...");

                let fields = {};
                let screenshot_data = {};

                //console.log("TEXT_PAGE_OBSERVER_SET", TEXT_PAGE_OBSERVER_SET);
                //console.log("VIDEO_PAGE_OBSERVER_SET", VIDEO_PAGE_OBSERVER_SET);
                //console.log("ankiScreenshot", ankiScreenshot);

                // Dont do this on a text page
                if (ankiScreenshot && TEXT_PAGE_OBSERVER_SET)
                {
                    // TODO : This only works for the "video-file" mode, and not "youtube" mode
                    let video_element = null;
                    if (!VIDEO_PAGE_OBSERVER_SET)
                    {
                        video_element = document.getElementsByTagName('video')[0];
                    }

                    console.log("video_element", video_element);

                    if (video_element)
                    {
                        console.log("Fill ankiScreenshot");

                        const [image_filename, image_data] = await capture_video_screenshot(video_element);

                        screenshot_data['data'] = image_data;
                        screenshot_data['filename'] = image_filename;

                        //console.log("screenshot_data :", screenshot_data);

                        fields[ankiScreenshot] = '<img src="' + image_filename + '" />';
                    }
                }

                const root_dictionary = document.getElementsByClassName('lln-full-dict');

                let selected_word = "";
                if (root_dictionary.length)
                {
                    /* Get word selected */
                    selected_word = root_dictionary[0].children[0].children[0].innerText;

                    if (ankiFieldWord)
                    {
                        console.log("Fill ankiFieldWord");

                        fields[ankiFieldWord] = selected_word;
                    }

                    if (ankiBasicTranslation)
                    {
                        console.log("Fill ankiBasicTranslation");

                        const basic_translation = root_dictionary[0].children[0].children[2].innerText;

                        fields[ankiBasicTranslation] = basic_translation;
                    }

                    if (ankiExtraTranslation)
                    {
                        console.log("Fill ankiExtraTranslation");

                        const extra_definitions = root_dictionary[0].children[5].innerText.replaceAll('\n', '<br>');

                        fields[ankiExtraTranslation] = extra_definitions;
                    }
                }

                if (CLICKED_SENTENCE_ELEMENT)
                {
                    if (ankiSentence)
                    {
                        console.log("CLICKED_SENTENCE_ELEMENT", CLICKED_SENTENCE_ELEMENT);
                        const sentence_element = CLICKED_SENTENCE_ELEMENT.children[1];
                        if (sentence_element)
                        {
                            if (ankiSentence)
                            {
                                console.log("Fill ankiSentence");

                                let sentence = sentence_element.children[0].innerText;
                                sentence = sentence.replace(/(\r\n|\n|\r)/gm, ""); // Remove the newlines

                                if (selected_word)
                                {
                                    // this regex might not word for all languages :(
                                    // make the word we are saving appear BOLD and lowercase in the sentence
                                    sentence = sentence.replace(new RegExp(`(?<![\u0400-\u04ff])${selected_word}(?![\u0400-\u04ff])`, 'gi'), "<b>" + selected_word + "</b>");
                                }

                                fields[ankiSentence] = sentence;
                            }

                            if (ankiSentenceTranslation)
                            {
                                console.log("Fill ankiSentenceTranslation");

                                const sentence_translation = sentence_element.children[1].innerText;

                                fields[ankiSentenceTranslation] = sentence_translation;
                            }
                        }
                    }
                }

                if (ankiExampleSentence)
                {
                    console.log("Fill ankiExampleSentence");

                    // We are only gathering examples from "Tatoeba",
                    // when on the video player page, it will have "current" examples that are from the 
                    // video being watched, we dont want to save them so have to skip over this element
                    // Possible example order:
                    //  X   Tatoeba > Saved Items
                    //  X   Tatoeba
                    //  X   Current text > Tatoeba > Saved Items
                    //  X   Current text > Tatoeba
                    //  X   Current text

                    const example_sentences_element = document.getElementsByClassName('lln-word-examples');

                    const tatoeba_element = Array.from(example_sentences_element).find(div =>
                        div.querySelector('a[target="_blank"]')
                    );

                    if (tatoeba_element)
                    {
                        const tatoeba_element_sentences = tatoeba_element.getElementsByClassName('lln-word-example');

                        let example_sentences = "";
                        for (let index = 0; index < tatoeba_element_sentences.length; index++)
                        {
                            const example_element = tatoeba_element_sentences[index].children[1];
                            example_sentences = example_sentences + example_element.innerText.replaceAll('\n', '') + "<br>";
                        }
                        fields[ankiExampleSentence] = example_sentences;
                    }
                }

                console.log("Card fields to send to Anki : ", fields);

                const anki_settings = {
                    "deck": ankiDeckNameSelected,
                    "note": ankiNoteNameSelected,
                    "url": ankiConnectUrl || 'http://localhost:8765',
                }

                send_data_to_anki(anki_settings, fields, screenshot_data);
            }
        );
    }

    function send_data_to_anki(anki_settings, fields, screenshot_data)
    {
        console.log("destination : ", anki_settings);

        if (Object.keys(fields).length === 0)
        {
            show_error_message("No fields were set, please set a field in the settings");
            return;
        }

        console.log("fields : ", fields);

        let actions = [];

        if (screenshot_data.data)
        {
            console.log("adding image to note :", screenshot_data);
            actions.push({
                "action": "storeMediaFile",
                "params": {
                    "filename": screenshot_data.filename,
                    "data": screenshot_data.data
                }
            });
        }

        actions.push({
            "action": "addNote",
            "params": {
                "note": {
                    "modelName": anki_settings.note,
                    "deckName": anki_settings.deck,
                    "fields": fields,
                    "tags": ["LLW_to_Anki"],
                    "options": {
                        "allowDuplicate": true,
                    }
                }
            }
        });

        console.log("actions : ", actions);

        const body = {
            "action": "multi",
            "params": {
                "actions": actions
            }
        };

        console.log("body : ", body);

        const permission_data = '{"action":"requestPermission","version":6}';

        fetch(anki_settings.url, {
            method: "POST",
            body: permission_data,
        })
            .then((res) => res.json())
            .then((data) =>
            {
                console.log("Permission fetch return : ", data);
                fetch(anki_settings.url, {
                    method: "POST",
                    body: JSON.stringify(body),
                })
                    .then((res) => res.json())
                    .then((data) =>
                    {
                        let has_error = false;
                        data.forEach((response, index) =>
                        {
                            if (response.result === null)
                            {
                                show_error_message(`Error in response ${index + 1}: ${response.error}`);
                                has_error = true;
                            }
                        });

                        if (!has_error)
                        {
                            show_success_message(`Successfully added to ANKI`);
                        }
                    })
                    .catch((error) =>
                    {
                        show_error_message("Anki Post Error! " + error);
                    })
            }).catch((error) =>
            {
                show_error_message("Permission Error, extension doesnt have permission to connect to Anki, check AnkiConnect config 'webCorsOriginList', " + error);
            });
    }

    function show_success_message(message)
    {
        Toastify({
            text: message,
            duration: 3000,
            style: {
                background: "light blue",
            }
        }).showToast();
        console.log(message);
    }

    function show_error_message(message)
    {
        Toastify({
            text: message,
            duration: 3000,
            style: {
                background: "red",
            }
        }).showToast();
        console.log(message);
    }

})();