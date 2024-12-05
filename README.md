# Language Reactor to Anki

Adds the ability to make flashcards from sentences in the `Youtube`, `Books`, `Video File` and `My Texts` modes.

Currently only tested with Russian, and cards made in the Youtube mode do not have screenshots.

## Setup

1) Must install [AnkiConnect](https://ankiweb.net/shared/info/2055492159) plugin.
2) Must leave the Anki desktop application open in order to connect to it.
3) Install unpacked extension.
4) Setup the URL (default is `http://localhost:8765`), deck, card and field options

Make sure the field at position 1 in your Anki note type (Tools > Manage Note Types) is set in the extention, if not, then you will get the error "cannot create note because it is empty"

Switching video files will require a refresh before adding the new video and subs

## Usage

Click a word to bring up the definition popup on the right hand side of the screen.
Clicking the `Anki` button, this will send the relevant data to the fields set in settings to Anki and create a new card.

![reading-mode-screenshot](https://github.com/ClearlyKyle/Language_Reactor_to_Anki/blob/master/screenshots/reading_example.png)

## Settings

Exported data fields:

 1) `Word` - currently clicked word
 2) `Sentence` - sentence in which the currently clicked word is in
 3) `Screenshot` - screenshot is taken at the moment Anki is clicked (only works in 'Video File' mode)
 4) `Sentence Translation` - translation of the sentence which is normally on the right
 5) `Example Sentences` - examples given by Tatoeba in the dictionary panel (not current or saved examples)
 6) `Basic Translation` - simple translation of the word
 7) `Extra Translation` - more translation of the current word

Settings allow you to choose which fields are filled with what data. A blank options means that data is skipped

![settings-screenshot](https://github.com/ClearlyKyle/Language_Reactor_to_Anki/blob/master/screenshots/settings.png)

## Example card

Front of card<br/>
![card-front-screenshot](https://github.com/ClearlyKyle/Language_Reactor_to_Anki/blob/master/screenshots/example_card_front.png)

Back of card<br/>
![card-back-screenshot](https://github.com/ClearlyKyle/Language_Reactor_to_Anki/blob/master/screenshots/example_card_back.png)
