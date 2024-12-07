console.log("----- [background.js] LOADED");

//
// DEBUG MODE
//
const CONSOLE_LOGGING = false;
if (!CONSOLE_LOGGING)
{
    console.log = function () { };
}

//
// GLOBALS
//
let anki_url = 'http://localhost:8765';

const anki_element_names_array = [
    "ankiNoteNameSelected",
    "ankiConnectUrl",

    // Fields bellow
    "ankiDeckNameSelected",
    "ankiFieldWord",
    "ankiSentence",
    "ankiScreenshot",
    "ankiSentenceTranslation",
    "ankiExampleSentence",
    "ankiBasicTranslation",
    "ankiExtraTranslation",
];

let anki_values = Object.fromEntries(anki_element_names_array.map((key) => [key, ""]));
const anki_elements = {};

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

function init()
{
    for (let i = 0; i < anki_element_names_array.length; i++)
    {
        const element_name = anki_element_names_array[i];
        anki_elements[element_name] = document.getElementById(element_name);
    }

    document.getElementById('saveAnkiBtn').addEventListener('click', (e) =>
    {
        console.log(anki_values);

        for (let i = 0; i < anki_element_names_array.length; i++)
        {
            const element_name = anki_element_names_array[i];
            const element = anki_elements[element_name];

            anki_values[element_name] = element.value;
        }

        chrome.storage.local.set(anki_values, () =>
        {
            if (chrome.runtime.lastError)
            {
                alert("Error saving to storage:", chrome.runtime.lastError);
            }
            else
            {
                alert(`Options saved!`);
            }
        });
    });

    chrome.storage.local.get(["ankiConnectUrl"], ({ ankiConnectUrl }) =>
    {
        const url_element = anki_elements.ankiConnectUrl;
        url_element.value = anki_url = (ankiConnectUrl || url_element.value);

        fetch(anki_url, {
            method: "POST",
            body: '{"action":"requestPermission","version":6}',
        })
            .then((res) => res.json())
            .then((data) =>
            {
                if (data.error)
                {
                    reject(data.error);
                }
                else
                {
                    Update_Selections_With_Saved_Values();
                }
            })
            .catch(error => alert(`Failed to connect to Anki ${anki_url}, make sure Anki is open and AnkiConnect is installed : ${error}`));
    });
}


//
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
//
function Fetch_From_Anki(body)
{
    return new Promise((resolve, reject) =>
    {
        fetch(anki_url, {
            method: 'POST',
            body: body,
        })
            .then(res => res.json())
            .then(data =>
            {
                if (data.error)
                    reject(data.error);
                resolve(data);
            })
            .catch(error => alert("Failed with body:", body));
    });
}

function Add_Options_To_Dropdown(dropdown, data)
{
    dropdown.length = 0;

    for (let i = 0; i < data.length; i++)
    {
        const option = document.createElement('option');
        option.value = option.text = data[i];
        dropdown.add(option);
    }
}

function Add_Options_To_Field_Dropdown(element_id, data, saved_value)
{
    const dropdown = anki_elements[element_id];

    dropdown.length = 0;

    for (let i = 0; i < data.length; i++)
    {
        const option = document.createElement('option');
        option.value = option.text = data[i];
        dropdown.add(option);
    }

    const blank = document.createElement("option");
    blank.value = blank.text = "";
    dropdown.add(blank);

    dropdown.value = saved_value;
}

function Update_Selections_With_Saved_Values()
{
    chrome.storage.local.get(anki_element_names_array, res =>
    {
        anki_values = res;

        anki_url = anki_elements.ankiConnectUrl.value = res.ankiConnectUrl || 'http://localhost:8765';

        // Frist we need to get all deck names and note types, 
        // after we get a note type, we can then fetch for all the fields of that note type

        const deck_names_element = anki_elements.ankiDeckNameSelected;
        const note_names_element = anki_elements.ankiNoteNameSelected;

        note_names_element.addEventListener('change', Update_Field_Dropdown);

        Fetch_From_Anki('{"action":"multi","params":{"actions":[{"action":"deckNames"},{"action":"modelNames"}]}}')
            .then((data) =>
            {
                if (data.length === 2)
                {
                    const [deck_names, note_names] = data;

                    Add_Options_To_Dropdown(deck_names_element, deck_names);
                    Add_Options_To_Dropdown(note_names_element, note_names);

                    const ankiDeckNameSelected = res.ankiDeckNameSelected;
                    const ankiNoteNameSelected = res.ankiNoteNameSelected;

                    if (ankiDeckNameSelected)
                        deck_names_element.value = ankiDeckNameSelected;

                    if (ankiNoteNameSelected)
                        note_names_element.value = ankiNoteNameSelected;

                    Update_Field_Dropdown();
                }
            })
            .catch(error => console.error("Unable to get deck and model names", error));
    });
}

function Update_Field_Dropdown()
{
    const note_names_element = anki_elements.ankiNoteNameSelected;

    const note_field_body = `{"action": "modelFieldNames","params":{"modelName":"${note_names_element.value}"}}`;

    Fetch_From_Anki(note_field_body)
        .then((data) =>
        {
            // NOTE : if we switch to another note type that has the same named field, they will not be reset
            if (data.length)
            {
                for (let i = 3; i < anki_element_names_array.length; i++)
                {
                    const field_name = anki_element_names_array[i];
                    console.log(`Dropdown '${field_name}', with set value '${anki_values[field_name]}'`);

                    Add_Options_To_Field_Dropdown(field_name, data, anki_values[field_name]);
                }
            }
        })
        .catch(error => console.error("Unable to model fields", error));
}