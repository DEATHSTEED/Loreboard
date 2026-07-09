import { MODULE_ID } from './constants.js';
import { registerSettings } from './settings.js';
import { buildApi } from './api.js';

// Every id this module ships under: dev tree plus the two release editions.
// The editions can be installed side by side but only one may run per world.
const EDITION_IDS = ['loreboard', 'loreboard-lite', 'loreboard-deluxe'];

export function registerModuleHooks() {
  Hooks.once('init', () => {
    const module = game.modules.get(MODULE_ID);
    registerSettings();
    globalThis.registerLoreboardFonts?.();
    module.api = buildApi();
    console.log(`LOREBOARD | ${module.title} v${module.version} initialised`);
  });

  Hooks.once('ready', () => {
    const clash = EDITION_IDS.find(id => id !== MODULE_ID && game.modules.get(id)?.active);
    if (clash && game.user.isGM) {
      ui.notifications.error(
        game.i18n.format('LOREBOARD.Notifications.EditionClash', { a: MODULE_ID, b: clash }),
        { permanent: true }
      );
    }
    globalThis.lbInstallForeignFonts?.();
  });
}
