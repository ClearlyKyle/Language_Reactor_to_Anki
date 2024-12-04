(function ()
{
    console.log("----- [content_script.js] LOADED");

    //
    // DEBUG MODE
    //
    const CONSOLE_LOGGING = true;
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

    // Listen for messages from the background script
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
        console.log(`Adding Observer for: '${element}'`);
        const observer = new MutationObserver((mutations, observer) =>
        {
            const search_element = document.getElementsByClassName(element)[0];
            if (search_element)
            {
                callback(search_element);
                observer.disconnect(); // Stop observing once the element is found
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

                    const anki_button = list_of_dicts.getElementsByClassName('anki-btn');
                    if (anki_button.length === 0)
                    {
                        Add_Anki_Button();
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
                console.log("Element found:", element);

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
                console.log("Element found:", element);

                element.style.border = "2px solid blue";
            });

            VIDEO_PAGE_OBSERVER_SET = true;
        }
    }

    /* create Anki Button */
    const anki_div = document.createElement("div");
    anki_div.className = "anki-btn lln-external-dict-btn tippy";
    anki_div.innerHTML = "Anki";
    anki_div.setAttribute("data-tippy-content", "Send to Anki");
    anki_div.onclick = Handle_Side_Bar_Dictionary;

    function Add_Anki_Button()
    {
        const btn_location = document.getElementsByClassName('lln-external-dicts-container')[0];
        if (btn_location)
        {
            if (document.getElementsByClassName('anki-btn')[0])
            {
                console.log("Anki button alreay exists so dont add another")
            }
            else
            {
                btn_location.appendChild(anki_div);
            }
        }
    }

    function Observe_Dictionary()
    {
        const observer = new MutationObserver(function (mutationsList, observer)
        {
            console.log("DICTIONARY OBSERVER CALLED")
            const sentence_wrap_elements = document.querySelectorAll('.sentence-wrap');

            sentence_wrap_elements.forEach(function (element)
            {
                if (!element.hasAttribute('data-click-listener'))
                {
                    element.addEventListener('click', function (event)
                    {
                        CLICKED_SENTENCE_ELEMENT = event.target.parentElement.parentElement.parentElement.parentElement.parentElement;
                        console.log('CLICKED_SENTENCE_ELEMENT:', CLICKED_SENTENCE_ELEMENT);

                    });
                    element.setAttribute('data-click-listener', 'true');
                }
            });

            for (const mutation of mutationsList)
            {
                if (mutation.target.className === 'lln-full-dict')
                {
                    const list_of_dicts = document.getElementsByClassName('lln-external-dicts-container')[0];

                    const anki_button = list_of_dicts.getElementsByClassName('anki-btn');
                    if (anki_button.length === 0)
                    {
                        Add_Anki_Button();
                    }


                    console.log("break")
                    break;
                }
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    //function _generate_random_string(length)
    //{
    //    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    //    let result = '';

    //    for (let i = 0; i < length; i++)
    //    {
    //        const random_index = Math.floor(Math.random() * characters.length);
    //        result += characters.charAt(random_index);
    //    }
    //    return result;
    //}

    async function Capture_Video_Screenshot(video_element)
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

    //async function Get_Screen_Shot_If_We_Are_On_A_Video_Page()
    //{
    //    const currentPage = window.location.pathname;

    //    if (currentPage === '/player')
    //    {
    //        console.log("Video Player");
    //        let video_element = document.querySelector('#plyr_video');
    //    }
    //    else if (currentPage.includes('/video'))
    //    {
    //        console.log("TutleTube")
    //        let video_element = document.querySelector('video');
    //    }
    //    else
    //    {
    //        return null;
    //    }

    //    return Capture_Video_Screenshot(video_element);
    //}

    function Handle_Side_Bar_Dictionary()
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

                let card_data = {};
                let image_data = {};

                //if (ankiScreenshot)
                //{
                //    const screenshot = await Get_Screen_Shot_If_We_Are_On_A_Video_Page();

                //    let video_element;
                //    const currentPage = window.location.pathname;
                //    if (currentPage === '/player')
                //    {
                //        video_element = document.querySelector('#plyr_video');
                //    }
                //    else if (currentPage.includes('/video'))
                //    {
                //        video_element = document.querySelector('video');
                //    }

                //    if (video_element)
                //    {
                //        console.log("Fill ankiScreenshot");

                //        const [image_filename, image_data] = Capture_Video_Screenshot(video_element);

                //        image_data['data'] = image_data;
                //        image_data['filename'] = image_filename;

                //        card_data[ankiScreenshot] = '<img src="' + image_filename + '" />';
                //    }
                //}

                const root_dictionary = document.getElementsByClassName('lln-full-dict');
                //const dict_context = document.getElementsByClassName('lln-dict-contextual');

                let selected_word = "";
                if (root_dictionary.length)
                {
                    /* Get word selected */
                    selected_word = root_dictionary[0].children[0].children[0].innerText;

                    if (ankiFieldWord)
                    {
                        console.log("Fill ankiFieldWord");

                        card_data[ankiFieldWord] = selected_word;
                    }

                    if (ankiBasicTranslation)
                    {
                        console.log("Fill ankiBasicTranslation");

                        const basic_translation = root_dictionary[0].children[0].children[2].innerText;

                        card_data[ankiBasicTranslation] = basic_translation;
                    }

                    if (ankiExtraTranslation)
                    {
                        console.log("Fill ankiExtraTranslation");

                        const extra_definitions = root_dictionary[0].children[5].innerText.replaceAll('\n', '<br>');

                        card_data[ankiExtraTranslation] = extra_definitions;
                    }
                }

                //const anki_word_location = CLICKED_SENTENCE_ELEMENT;
                //if (anki_word_location)
                //{
                //    if (ankiSentence)
                //    {
                //        console.log("Fill ankiSentence");

                //        const sentence_element = anki_word_location.children[0];
                //        if (sentence_element)
                //        {
                //            sentence = sentence_element.innerText;
                //            sentence = sentence.replace(/(\r\n|\n|\r)/gm, ""); // Remove the newlines

                //            // this regex might not word for all languages :(
                //            // make the word we are saving appear BOLD and lowercase in the sentence
                //            sentence = sentence.replace(new RegExp(`(?<![\u0400-\u04ff])${word}(?![\u0400-\u04ff])`, 'gi'), "<b>" + selected_word + "</b>");

                //            card_data[ankiSentence] = sentence;

                //            console.log(sentence);
                //        }
                //    }

                //    //if (ankiSentenceTranslation)
                //    //{
                //    //    console.log("Fill ankiSentenceTranslation");

                //    //    const translated_sentence_element = anki_word_location.children[1];
                //    //    if (translated_sentence_element)
                //    //    {
                //    //        sentence_translation = translated_sentence_element.innerText;

                //    //        card_data[ankiSentenceTranslation] = sentence_translation;
                //    //    }
                //    //}
                //}

                //if (ankiExampleSentence)
                //{
                //    console.log("Fill ankiExampleSentence");

                //    // TODO : Add option to switch between Current Text examples and Tatoeba Examples
                //    const example_sentences_element = document.getElementsByClassName('lln-word-examples');
                //    if (example_sentences_element.length > 1)
                //    {
                //        let example_sentences = "";
                //        const tatoeba_examples = example_sentences_element[1].children;
                //        for (let index = 1; index < example_sentences_element[1].children.length; index++)
                //        {
                //            const example = tatoeba_examples[index];

                //            for (let e of example.childNodes)
                //            {
                //                example_sentences = example_sentences + e.innerText.replaceAll('\n', '') + "<br>";
                //            }
                //        }

                //        card_data[ankiExampleSentence] = example_sentences;
                //    }
                //}

                console.log("Card data to send to Anki : ", card_data);

                const anki_settings = {
                    "deck": ankiDeckNameSelected,
                    "note": ankiNoteNameSelected,
                    "url": ankiConnectUrl || 'http://localhost:8765',
                }

                //LLW_Send_Data_To_Anki(anki_settings, card_data, image_data);
            }
        );
    }

    //function Send_data_to_ANKI(data)
    //{
    //    send_message_to_background("[Send_data_to_ANKI] Sending to Anki...")
    //    send_message_to_background({ data })

    //    let add_image = false;
    //    if (data["screenshot"])
    //        add_image = true;

    //    chrome.storage.local.get(
    //        ['ankiDeckNameSelected', 'ankiNoteNameSelected', 'ankiFieldWord', 'ankiSentence', 'ankiScreenshot', 'ankiSentenceTranslation', 'ankiExampleSentence', 'ankiBasicTranslation', 'ankiExtraTranslation', 'ankiConnectUrl'],
    //        ({ ankiDeckNameSelected, ankiNoteNameSelected, ankiFieldWord, ankiSentence, ankiScreenshot, ankiSentenceTranslation, ankiExampleSentence, ankiBasicTranslation, ankiExtraTranslation, ankiConnectUrl }) =>
    //        {
    //            url = ankiConnectUrl || 'http://localhost:8765';
    //            model = ankiNoteNameSelected || 'Basic';
    //            deck = ankiDeckNameSelected || 'Default';

    //            console.log(
    //                {
    //                    ankiDeckNameSelected, ankiNoteNameSelected, ankiFieldWord, ankiSentence, ankiScreenshot, ankiSentenceTranslation, ankiExampleSentence, ankiBasicTranslation, ankiExtraTranslation, ankiConnectUrl
    //                }
    //            )

    //            console.log("Deck Name: ", model)
    //            console.log("Model Name: ", deck)

    //            if (add_image)
    //            {
    //                const image_filename = data['screenshot']['filename'];
    //                const image_data = data['screenshot']['data'];

    //                let fields = {
    //                    [ankiFieldWord]: data['word'],
    //                    [ankiSentence]: data['sentence'],
    //                    [ankiSentenceTranslation]: data['sentence-translation'],
    //                    [ankiBasicTranslation]: data['basic-translation'],
    //                    [ankiExtraTranslation]: data['extra-translation'],
    //                    [ankiExampleSentence]: data['example-sentences'],
    //                    [ankiScreenshot]: '<img src="' + image_filename + '" />',
    //                };

    //                let body = {
    //                    "action": "multi",
    //                    "params": {
    //                        "actions": [
    //                            {
    //                                "action": "storeMediaFile",
    //                                "version": 6,
    //                                "params": {
    //                                    "filename": image_filename,
    //                                    "data": image_data
    //                                }
    //                            },
    //                            {
    //                                "action": "addNote",
    //                                "params": {
    //                                    "note": {
    //                                        "modelName": model,
    //                                        "deckName": deck,
    //                                        "fields": fields,
    //                                        "tags": ["languagereactor_anki"],
    //                                        "options": {
    //                                            "allowDuplicate": true,
    //                                        }
    //                                    },

    //                                }
    //                            },
    //                        ]
    //                    }
    //                };
    //            }
    //            else
    //            {
    //                let fields = {
    //                    [ankiFieldWord]: data['word'],
    //                    [ankiSentence]: data['sentence'],
    //                    [ankiSentenceTranslation]: data['sentence-translation'],
    //                    [ankiBasicTranslation]: data['basic-translation'],
    //                    [ankiExtraTranslation]: data['extra-translation'],
    //                    [ankiExampleSentence]: data['example-sentences'],
    //                    [ankiScreenshot]: '',
    //                };

    //                let body = {
    //                    "action": "multi",
    //                    "params": {
    //                        "actions": [
    //                            {
    //                                "action": "addNote",
    //                                "params": {
    //                                    "note": {
    //                                        "modelName": model,
    //                                        "deckName": deck,
    //                                        "fields": fields,
    //                                        "tags": ["languagereactor_anki"],
    //                                        "options": {
    //                                            "allowDuplicate": true,
    //                                        }
    //                                    },
    //                                }
    //                            }
    //                        ]
    //                    }
    //                };
    //            }

    //            console.log("Sending field data", { fields })

    //            const permission_data = {
    //                "action": "requestPermission",
    //                "version": 6,
    //            };

    //            fetch(url, {
    //                method: "POST",
    //                body: JSON.stringify(permission_data),
    //            })
    //                .then((res) => res.json())
    //                .then((data) =>
    //                {
    //                    console.log(data);
    //                    fetch(url, {
    //                        method: "POST",
    //                        body: JSON.stringify(body),
    //                    })
    //                        .then((res) => res.json())
    //                        .then((data) =>
    //                        {
    //                            console.log("Fetch Return from anki-connect:", data)
    //                            if (data[0].error)
    //                            {
    //                                ShowErrorMessage(data[0].error)
    //                            } else
    //                            {
    //                                ShowSucessMessage("Sucessfully added to ANKI"); /* show sucess message */
    //                            }
    //                        })
    //                        .catch((error) =>
    //                        {
    //                            ShowErrorMessage("Error! " + error); /* show error message */
    //                        })
    //                }).catch((error) =>
    //                {
    //                    ShowErrorMessage("Error! " + error); /* show error message */
    //                });
    //            send_message_to_background("[LLW_Send_Data_To_Anki] Send to ANKI complete!");
    //        }
    //    );
    //}

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

