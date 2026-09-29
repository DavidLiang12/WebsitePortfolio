# DOOM desktop app

`doom.html` isolates the js-dos player in a same-origin iframe. The runtime is
served locally from `vendor/js-dos/` only after Play DOOM is clicked. Closing the
window unloads it; minimizing or hiding the tab pauses emulation. The game has no external runtime download and needs no account. Serve the site
over HTTP(S); browsers block WASM/worker loading from `file://` pages.

## Game bundle

`doom-shareware.jsdos` includes the original DOOM executable and the unmodified
DOOM 1.9 shareware IWAD (Episode 1, E1M1–E1M9 only). It does not contain the
registered DOOM.WAD. Original README, help and ordering notices are retained.
DOOM and its game assets belong to id Software.

Sources:
- Shareware IWAD: https://github.com/actes2/dos-js_doom_shareware/blob/main/doom/DOOM1.WAD
- DOS executable and accompanying notices: https://v8.js-dos.com/bundles/doom.jsdos
- Player API: https://js-dos.com/player-api.html

DOOM1.WAD SHA-256: `1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771`

The DOSBox configuration mounts the bundle and starts DOOM.EXE. DEFAULT.CFG
uses arrow keys for movement, Ctrl to fire, and Space to use doors. Game files
are unchanged; only the emulator configuration and keyboard settings differ.
