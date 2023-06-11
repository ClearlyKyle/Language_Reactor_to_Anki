/*
These are the element IDs of the drop downs that relate to 
field names
*/
const DROPDOWN_ELEMENT_IDS = [
    "ankiFieldWord",
    "ankiSentence",
    "ankiSentenceTranslation",
    "ankiExampleSentence",
    "ankiBasicTranslation",
    "ankiExtraTranslation",
];

function Fetch_From_Anki(action, params = {})
{
    const url = 'http://127.0.0.1:8765' || document.getElementById('ankiConnectUrl').value;
    const version = 6;
    const permission_data = {
        "action": "requestPermission",
        "version": 6,
    };

    return new Promise((resolve, reject) =>
    {
        fetch(url, {
            method: "POST",
            body: JSON.stringify(permission_data),
        })
            .then((res) =>
            {
                // Handle the response from "requestPermission"
                if (!res.ok)
                    throw new Error('Request failed');
                return res.json();
            })
            .catch(error =>
            {
                reject(error); // Reject any error from the first fetch
            })
            .then(() =>
            {
                fetch(url, {
                    method: 'POST',
                    body: JSON.stringify({ action, version, params }),
                })
                    .then(response => response.json())
                    .then(data =>
                    {
                        resolve(data.result); // Resolve the final data
                        // This is accessed through the .then()
                    })
                    .catch(error => reject(error));
            });
    });
}

function Add_Options_To_Dropdown(element_id, data)
{
    const dropdown = document.getElementById(element_id);
    dropdown.length = 0; // Reset dropdown
    data.forEach((item) =>
    {
        const option = document.createElement('option');
        option.value = item;
        option.text = item;
        dropdown.appendChild(option);
    });
}

/*
Here we are loading the list of data (deck names, field names, model names) into a
dropdown box. Passing in an array of elements saves us doing multiple fetches
for each field

element_id: can be a single value or an array of element_id's
*/
async function Load_ElementID_With_Anki_Data(element_id, action, params = {})
{
    return Fetch_From_Anki(action, params)
        .then((data) =>
        {
            if (Array.isArray(element_id))
            {
                element_id.forEach((id) => Add_Options_To_Dropdown(id, data));
            } else
            {
                Add_Options_To_Dropdown(element_id, data);
            }

        })
        .catch(error => console.error(error)); // Handle any errors
}

function Set_Selected_Option(element_id, selectedValue)
{
    return new Promise((resolve, reject) =>
    {
        const dropdown = document.getElementById(element_id);

        let wait_for_dropdown = setInterval(() => // I dont like this timer...
        {
            if (dropdown.options.length > 0)
            {
                clearInterval(wait_for_dropdown);

                for (let i = 0; i < dropdown.options.length; i++)
                {
                    const option = dropdown.options[i];
                    if (option.value === selectedValue)
                    {
                        option.selected = true; // Set the option as selected
                        return;
                    }
                }
            }
        });
        resolve();
    });
}

async function Load_Field_Names()
{
    const model_name_dropdown = document.getElementById("ankiNoteNameSelected");

    // We will load all the field options with one fetch call, saving doing a fetch for each field
    if (model_name_dropdown.value)
        Load_ElementID_With_Anki_Data(DROPDOWN_ELEMENT_IDS, "modelFieldNames", { "modelName": model_name_dropdown.value });
}

/*
Load the Deck and Model names to the dropdown boxes
*/
async function Setup_Loading_Data_From_Anki()
{
    const model_name_dropdown = document.getElementById("ankiNoteNameSelected");
    model_name_dropdown.addEventListener('change', Load_Field_Names);

    await Load_ElementID_With_Anki_Data("ankiDeckNameSelected", "deckNames");
    await Load_ElementID_With_Anki_Data("ankiNoteNameSelected", "modelNames");
}

const readLocalStorage = async (key) =>
{
    return new Promise((resolve, reject) =>
    {
        chrome.storage.local.get([key], function (result)
        {
            if (result[key] === undefined)
                reject();
            else
                resolve(result[key]);
        });
    });
};

/*
Using the saved settings for the Deck and Card options, we load the relavant
Field types and then set the current active dropdown values to the saved Field

If there are no saved values then the fields will be blank until a note type is
selected
*/
async function Update_Selections_With_Saved_Values()
{
    Setup_Loading_Data_From_Anki();

    const deck_name = await readLocalStorage("ankiDeckNameSelected");
    const card_name = await readLocalStorage("ankiNoteNameSelected");
    console.log(deck_name);
    console.log(card_name);

    if (deck_name && card_name)
    {
        Set_Selected_Option("ankiDeckNameSelected", deck_name);
        Set_Selected_Option("ankiNoteNameSelected", card_name);

        await Load_ElementID_With_Anki_Data(DROPDOWN_ELEMENT_IDS, "modelFieldNames", { "modelName": card_name });

        DROPDOWN_ELEMENT_IDS.forEach((element_id) =>
        {
            readLocalStorage(element_id).then((item) =>
            {
                if (item)
                    Set_Selected_Option(element_id, item);
            });
        });
    }
}

function Save_Dropdown_Option(element_id)
{
    const element = document.getElementById(element_id);
    chrome.storage.local.set({ [element_id]: element.value });

    console.log("Saving :", element_id, element.value);
}

function Setup_Submit_Button()
{
    const submit_button = document.getElementById('saveAnkiBtn');
    submit_button.addEventListener('click', (e) =>
    {
        //e.preventDefault(); // Prevent default form submission behavior

        console.log("Submit is clicked!")
        Promise.all([
            Save_Dropdown_Option('ankiDeckNameSelected'),
            Save_Dropdown_Option('ankiNoteNameSelected'),

            Save_Dropdown_Option('ankiFieldWord'),
            Save_Dropdown_Option('ankiSentence'),
            Save_Dropdown_Option('ankiSentenceTranslation'),
            Save_Dropdown_Option('ankiExampleSentence'),
            Save_Dropdown_Option('ankiBasicTranslation'),
            Save_Dropdown_Option('ankiExtraTranslation'),
        ])
            .then(() => alert(`Options saved!`))
            .catch(error => alert(`Cannot save options: ${error}`))
    });

    console.log("Setup_Submit_Button")
}

document.addEventListener('DOMContentLoaded', function ()
{
    Setup_Submit_Button();
    Update_Selections_With_Saved_Values();
});
