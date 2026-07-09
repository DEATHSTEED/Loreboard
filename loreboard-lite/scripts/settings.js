import { MODULE_ID, SETTINGS } from './constants.js';

export function registerSettings() {
  // World-scoped archive of saved board snapshots. Managed entirely through
  // the in-board archive UI, so it stays out of the settings sheet.
  game.settings.register(MODULE_ID, SETTINGS.HIDDEN_SNAPS, {
    name: 'LOREBOARD.Settings.SavedBoards.Name',
    hint: 'LOREBOARD.Settings.SavedBoards.Hint',
    scope: 'world',
    config: false,
    type: Object,
    default: { boards: [] }
  });
}
