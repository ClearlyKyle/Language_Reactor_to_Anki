(function ()
{
    console.log("----- [content_script.js] LOADED");

    //
    // DEBUG MODE
    //

    const CONSOLE_LOGGING = true;
    if (!CONSOLE_LOGGING) console.log = function () { };

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
    // NOTE : This wont be presist between page loads
    let rta_screenshot_filenames = [];
    let rta_audio_filenames = [];

    let RTA_DICTIONARY_OBSERVER_SET = false;
    let RTA_TEXT_PAGE_OBSERVER_SET = false;
    let RTA_VIDEO_PAGE_OBSERVER_SET = false;
    let RTA_CLICKED_SENTENCE_ELEMENT = null;

    /* create Anki Button */
    const rta_anki_btn = document.createElement("div");
    rta_anki_btn.className = "rta_anki_btn lln-external-dict-btn tippy";
    rta_anki_btn.innerHTML = "Anki";
    rta_anki_btn.setAttribute("data-tippy-content", "Send to Anki");
    rta_anki_btn.onclick = handle_side_bar_dictionary;

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
        if (!RTA_DICTIONARY_OBSERVER_SET)
        {
            const observer = new MutationObserver(() =>
            {
                const list_of_dicts = document.getElementsByClassName('lln-external-dicts-container')[0];
                if (list_of_dicts)
                {
                    if (!document.getElementsByClassName('rta_anki_btn')[0])
                    {
                        const btn_location = document.getElementsByClassName('lln-external-dicts-container')[0];
                        if (btn_location) btn_location.appendChild(rta_anki_btn);
                    }
                }
            });
            // TODO : change from body to better element...
            observer.observe(document.body, { childList: true, subtree: true });

            RTA_DICTIONARY_OBSERVER_SET = true;
        }

        if (!RTA_TEXT_PAGE_OBSERVER_SET)
        {
            wait_for_element("lri-MediaPlayer_TEXT-wrap", (element) =>
            {
                RTA_TEXT_PAGE_OBSERVER_SET = false;

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
                                console.log("RTA_CLICKED_SENTENCE_ELEMENT", RTA_CLICKED_SENTENCE_ELEMENT);
                                RTA_CLICKED_SENTENCE_ELEMENT = clicked_element;
                            }
                        });
                    }
                }, 100);
            });

            RTA_TEXT_PAGE_OBSERVER_SET = true;
        }

        if (!RTA_VIDEO_PAGE_OBSERVER_SET)
        {
            wait_for_element("lri-VideoView-wrap", (element) =>
            {
                RTA_VIDEO_PAGE_OBSERVER_SET = false;

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
                                console.log("RTA_CLICKED_SENTENCE_ELEMENT", RTA_CLICKED_SENTENCE_ELEMENT);
                                RTA_CLICKED_SENTENCE_ELEMENT = clicked_element;
                            }
                        });
                    }
                }, 100);
            });

            // This is the element under the video, it may change in size but from initial testing, it seems
            // to be consistent with only being clickable when subtitle is visible
            let under_video_sub_element_wait = setInterval(() =>
            {
                const under_video_sub_element = document.getElementsByClassName('bottom-panel')[1]; // under video
                if (under_video_sub_element)
                {
                    clearInterval(under_video_sub_element_wait);

                    under_video_sub_element.addEventListener('click', (event) =>
                    {
                        RTA_CLICKED_SENTENCE_ELEMENT = under_video_sub_element;
                    });
                }
            }, 100);

            RTA_VIDEO_PAGE_OBSERVER_SET = true;
        }
    }

    async function capture_video_screenshot(video_element, video_id)
    {
        const video_current_time = video_element.currentTime;

        const image_filename = `Reactor2Anki_${video_id}_${video_current_time}.png`;

        if (rta_screenshot_filenames.includes(image_filename))
        {
            console.log(`${image_filename} is already in the list`);
            return [image_filename, null];
        }

        rta_screenshot_filenames.push(image_filename);
        console.log(`${image_filename} added to screenshot files list`);

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = video_element.videoWidth;
        canvas.height = video_element.videoHeight;
        context.drawImage(video_element, 0, 0, canvas.width, canvas.height);

        let image_data = canvas.toDataURL('image/png');
        image_data = image_data.replace(/^data:image\/(png|jpg);base64,/, "")


        return Promise.resolve([image_filename, image_data]);
    }

    async function capture_video_audio(video_element, video_id)
    {
        // Possible cases to handle:
        // 1 - Subtitle under video is visible on the right side, user clicks to add word
        // 2 - Subttile under video contains word we want and clicked, but subtitles on the right
        //      has been scrolled down so subtitle under video is not visible on the right
        // 3 - Scrolled to find a subtitle, then word is clicked to be sent there

        // if (!video_element) alert("No video element!!");

        // TODO : Only works in 'video-file' mode, not in the youtube mode
        if (window.location.href.includes('video-file'))
        {
            let audio_filename = '';
            let audio_data = null;

            // word was clicked from subtitles on the right
            let element_to_start_search_for_subtitle_index = RTA_CLICKED_SENTENCE_ELEMENT;

            // word was clicked from subtitle under the video
            if (RTA_CLICKED_SENTENCE_ELEMENT.className === 'bottom-panel')
            {
                // word was clicked from subtitle under the video
                const jump_to_current_sub_in_right_list = document.querySelector('[data-testid="VerticalAlignCenterIcon"]');
                if (jump_to_current_sub_in_right_list)
                {
                    jump_to_current_sub_in_right_list.parentElement.click()
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                const sentence_element_in_subtitle_list = document.querySelector('.lri-SubsView-wrap .lr-play-btn.always-visible');
                if (!sentence_element_in_subtitle_list)
                {
                    console.warn("We were unable to get the sentence from where the play button is in the subtitle list")
                }
                element_to_start_search_for_subtitle_index = sentence_element_in_subtitle_list
            }

            let data_index_value = 0;
            let parent_element_to_check = element_to_start_search_for_subtitle_index;
            while (parent_element_to_check !== null)
            {
                if (parent_element_to_check.hasAttribute('data-index'))
                {
                    data_index_value = parent_element_to_check.getAttribute('data-index');
                    console.log('Found data-index:', data_index_value);

                    audio_filename = `Reactor2Anki_${video_id}_${data_index_value}.webm`;

                    if (rta_audio_filenames.includes(data_index_value))
                    {
                        console.log(`${audio_filename} is already in the list`);
                        return [audio_filename, audio_data];
                    }

                    rta_audio_filenames.push(audio_filename);
                    console.log(`${audio_filename} added to audio files list`);

                    break;
                }

                parent_element_to_check = parent_element_to_check.parentElement;
            }

            if (parent_element_to_check === null)
            {
                console.log('No parent with data-index attribute found.');
                return [audio_filename, audio_data];
            }

            const play_button_mouse_event = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window
            });

            let auto_stop_initial_state = false;

            // TODO : Get a better element to select
            const auto_pause_element = document.querySelectorAll('.PrivateSwitchBase-input')[1];
            if (auto_pause_element)
            {
                auto_stop_initial_state = auto_pause_element.checked;
                if (!auto_stop_initial_state)
                {
                    auto_pause_element.click()
                    console.log("Autopause has been turned ON");
                }
            }

            const stream = video_element.captureStream();
            const audioStream = new MediaStream(stream.getAudioTracks());

            const recorder = new MediaRecorder(audioStream);
            const chunks = [];

            recorder.ondataavailable = event => chunks.push(event.data);
            const audio_promise = new Promise((resolve, reject) =>
            {
                recorder.onstop = () =>
                {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = () =>
                    {
                        audio_data = reader.result.split(',')[1];
                        resolve([audio_filename, audio_data]);
                    };
                    reader.readAsDataURL(blob);
                };
            });

            video_element.addEventListener('timeupdate', function onTimeUpdate()
            {
                if (video_element.paused && video_element.readyState === 4)
                {
                    recorder.stop();
                    clearTimeout(audio_recording_timeout);

                    console.log("Audio recording finsihed!");
                    video_element.removeEventListener('timeupdate', onTimeUpdate);

                    if (!auto_stop_initial_state)
                    {
                        auto_pause_element.click()
                        console.log("Autopause has been turned back OFF");
                    }
                    video_element.pause();
                }
            });

            const audio_recording_timeout = setTimeout(() =>
            {
                recorder.stop();
                console.warn("Audio recording stopped after 5 seconds");

                video_element.removeEventListener('timeupdate', onTimeUpdate);

                if (!auto_stop_initial_state)
                {
                    auto_pause_element.click();
                    console.log("Autopause has been turned back OFF");
                }
            }, 16000); // 16 seconds

            console.log("Audio recording started");
            element_to_start_search_for_subtitle_index.dispatchEvent(play_button_mouse_event);
            recorder.start();

            return audio_promise;
        }
    }

    function handle_side_bar_dictionary()
    {
        chrome.storage.local.get(
            [
                "ankiConnectUrl",
                "ankiDeckNameSelected",
                "ankiNoteNameSelected",
                "ankiFieldWord",
                "ankiSentence",
                "ankiScreenshot",
                "ankiSentenceTranslation",
                "ankiExampleSentence",
                "ankiBasicTranslation",
                "ankiExtraTranslation",
                "ankiAudio",
            ],
            async ({
                ankiConnectUrl,
                ankiDeckNameSelected,
                ankiNoteNameSelected,
                ankiFieldWord,
                ankiSentence,
                ankiScreenshot,
                ankiSentenceTranslation,
                ankiExampleSentence,
                ankiBasicTranslation,
                ankiExtraTranslation,
                ankiAudio }) =>
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
                let image_data = {};
                let audio_data = {};

                //console.log("RTA_TEXT_PAGE_OBSERVER_SET", RTA_TEXT_PAGE_OBSERVER_SET);
                //console.log("RTA_VIDEO_PAGE_OBSERVER_SET", RTA_VIDEO_PAGE_OBSERVER_SET);
                //console.log("ankiScreenshot", ankiScreenshot);

                // Dont do this on a text page
                if ((ankiScreenshot || ankiAudio) && RTA_TEXT_PAGE_OBSERVER_SET)
                {
                    // TODO : This only works for the "video-file" mode, and not "youtube" mode
                    let video_element = null;
                    if (!RTA_VIDEO_PAGE_OBSERVER_SET)
                    {
                        video_element = document.getElementsByTagName('video')[0];
                    }

                    console.log("video_element", video_element);

                    // TODO : Find a better video id
                    const src = video_element.src;          // 'blob:https://www.languagereactor.com/f4456bab-fcd6-49af-b3a7-fd528711e275'
                    const video_id = src.split('-').pop();  // fd528711e275

                    if (ankiAudio && video_element)
                    {
                        console.log("Fill ankiAudio");

                        const [filename, data] = await capture_video_audio(video_element, video_id);

                        if (data)
                        {
                            audio_data['data'] = data;
                            audio_data['filename'] = filename;

                            console.log("audio_data :", audio_data);
                        }

                        fields[ankiAudio] = `[sound:'${filename}']`;
                    }

                    if (ankiScreenshot && video_element)
                    {
                        console.log("Fill ankiScreenshot");

                        const [filename, data] = await capture_video_screenshot(video_element, video_id);

                        if (data)
                        {
                            image_data['data'] = data;
                            image_data['filename'] = filename;

                            //console.log("image_data :", image_data);
                        }

                        fields[ankiScreenshot] = `<img src="${filename}'" />`;
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

                if (RTA_CLICKED_SENTENCE_ELEMENT)
                {
                    console.log("RTA_CLICKED_SENTENCE_ELEMENT", RTA_CLICKED_SENTENCE_ELEMENT);

                    // when right side sub
                    //      sentence    = sentence_element.getElementsByClassName('sentence-view')[0].innerText;
                    //      translation = sentence_element.getElementsByClassName('dc-orig')[1].innerText;

                    // when under video
                    //      sentence    = sentence_element.getElementsByClassName('sentence-view');
                    //      translation = sentence_element.getElementsByClassName('main-translation-wrap').innerText;

                    if (ankiSentence)
                    {
                        console.log("Fill ankiSentence");

                        let sentence = '';

                        const sentence_element = RTA_CLICKED_SENTENCE_ELEMENT.getElementsByClassName('sentence-view')[0];
                        if (sentence_element)
                        {
                            sentence = sentence_element.innerText.replace(/(\r\n|\n|\r)/gm, ""); // Remove the newlines

                            if (selected_word)
                            {
                                // this regex might not word for all languages :(
                                // make the word we are saving appear BOLD and lowercase in the sentence
                                sentence = sentence.replace(new RegExp(`(?<![\u0400-\u04ff])${selected_word}(?![\u0400-\u04ff])`, 'gi'), "<b>" + selected_word + "</b>");
                            }
                        }

                        fields[ankiSentence] = sentence;
                    }

                    if (ankiSentenceTranslation)
                    {
                        console.log("Fill ankiSentenceTranslation");

                        let sentence_translation = '';

                        const translation_wrap = RTA_CLICKED_SENTENCE_ELEMENT.getElementsByClassName('main-translation-wrap')[0];

                        if (translation_wrap)
                        {
                            console.log("Getting under video translation");
                            sentence_translation = translation_wrap.innerText;
                        }
                        else
                        {
                            console.log("Getting right side translation");

                            // At the top of the subtitle list, there are 3 modes the subtitles can be viewed in

                            const clicked_sentence_parent_children = RTA_CLICKED_SENTENCE_ELEMENT.parentElement.children;

                            const element_count = clicked_sentence_parent_children.length;
                            if (element_count === 1)
                            {
                                const sentence_elements = clicked_sentence_parent_children[0].children[1].children;
                                if (sentence_elements.length === 2) // 1 - Sub and translation to the right
                                {
                                    sentence_translation = RTA_CLICKED_SENTENCE_ELEMENT.children[1].children[1].innerText
                                }
                                // 2 - Sub only - do nothing 
                            }
                            else if (element_count === 2)  // 3 - Sub and translation underneath 
                            {
                                sentence_translation = clicked_sentence_parent_children[1].innerText
                            }
                        }

                        fields[ankiSentenceTranslation] = sentence_translation;
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