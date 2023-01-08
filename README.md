# Language Reactor to Anki

Adds the ability to make flashcards from sentences in the `Text` mode (https://www.languagereactor.com/text)

Currently only tested with Russian texts.

## Setup

1) Must install [AnkiConnect](https://ankiweb.net/shared/info/2055492159) plugin.
2) Must leave the Anki desktop application open in order to connect to it.
3) Install unpacked extension.
4) Setup the URL (default is `http://localhost:8765`), deck and model

## Usage

Click a word to bring up the definition popup on the right hand side of the screen.
Clicking the `Anki` button, this will send the relevant data to the fields set in settings to Anki and create a new card.

![reading-mode-screenshot](https://github.com/ClearlyKyle/Language_Reactor_to_Anki/master/screenshots/reading_example.png)

## Settings

Exported data fields:

 1) `Word` - currently clicked word
 2) `Sentence` - sentence in which the currently clicked word is in
 3) `Sentence Translation` - translation of the sentence which is normally on the right
 4) `Example Sentences` - examples given by Tatoeba in the dictionary panel
 5) `Basic Translation` - simple translation of the word
 6) `Extra Translation` - more translation of the current word
 7) `(URL)` - URL of current video with the current timestamp

Settings allow you to choose which fields are filled with what data. A blank options means that data is skipped

![settings-screenshot](https://github.com/ClearlyKyle/Language_Reactor_to_Anki/master/screenshots/settings.png)

## Example card

Front of card
![card-front-screenshot](https://github.com/ClearlyKyle/Language_Reactor_to_Anki/master/screenshots/example_card_front.png)

Back of card
![card-back-screenshot](https://github.com/ClearlyKyle/Language_Reactor_to_Anki/master/screenshots/example_card_back.png)
