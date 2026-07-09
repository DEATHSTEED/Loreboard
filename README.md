# Loreboard

Immersive investigation board for [Foundry Virtual Tabletop](https://foundryvtt.com/): pin documents, connect clues with threads, draw on the board, reveal UV-lamp secrets, write in foreign cipher languages, and set the mood with a themed jukebox — all inside cinematic noir, modern, tavern and sci-fi boards.

## Requirements

- Foundry VTT v12 or later (verified on v13).

## Editions

Loreboard is released as two separate, independently installable modules, both built from this single codebase:

| Feature | Loreboard Lite (`loreboard-lite`) | Loreboard Deluxe (`loreboard-deluxe`) |
| --- | --- | --- |
| Classic boards (corkboard, whiteboard, metal, wood, THE Board) | ✔ | ✔ |
| Pins, threads, drawing, secrets, cipher languages, permissions | ✔ | ✔ |
| Immersive themed boards (Noir, Cozy Tavern, Shadowpunk, Slums, Modern, Galactic) | – | ✔ |
| Jukebox & themed ambience | – | ✔ |
| Custom board uploads (premium wallpapers) | – | ✔ |

There is no forked source. Board data is stored in world-scoped scene flags and a config journal, so a world keeps its boards when moving between editions.

The two editions can be **installed** side by side, but only one may be **enabled** in a world at a time — the module warns the GM if both are active.

## Installation

In Foundry go to *Add-on Modules → Install Module* and paste the manifest URL of the edition you want from the [latest release](https://github.com/DEATHSTEED/LOREBOARD/releases/latest):

```text
https://github.com/DEATHSTEED/LOREBOARD/releases/latest/download/module-lite.json
https://github.com/DEATHSTEED/LOREBOARD/releases/latest/download/module-deluxe.json
```

**Manually**: unzip `loreboard-lite.zip` or `loreboard-deluxe.zip` from the release into `Data/modules/`.

## Project structure

```text
loreboard-lite/      Lite edition module
loreboard-deluxe/    Deluxe edition module
  module.json        Foundry manifest
  scripts/
    main.js          ES module entry point (settings, hooks, module API)
    config.js        Engine constants, asset paths, edition/feature gates
    permissions.js   Granular player rights, role presets, GM sync socket
    api.js           Public API
    hooks.js         Foundry lifecycle wiring
    settings.js      game.settings registration
    constants.js     Shared identifiers
    boards/          Board engine: themes, core board logic, visual tweaks
    ui/              Start menu, editors/uploads, floating eye assistant
    features/        Optional feature modules (jukebox)
    utils/           Utilities and font registration
  styles/            loreboard.css + fonts.css, per-feature CSS in components/
  lang/              Localization files
  fonts/             Bundled cipher/rune fonts (TTF)
  assets/graphics/   Board art, pins, papers, effects
  assets/sounds/     Sound effects (MP3)
```

### Public API

```js
const loreboard = game.modules.get('loreboard').api;
loreboard.edition          // "lite" | "deluxe"
loreboard.hasFeature('jukebox')
loreboard.isBoardOpen()
await loreboard.openBoard()
await loreboard.closeBoard()
await loreboard.openStartMenu()
```

## Notes

- Some editor/jukebox UI fonts are fetched from Google Fonts at runtime when online; everything falls back to system fonts offline. The 15 cipher/rune fonts are bundled in `fonts/`.