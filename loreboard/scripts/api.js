/**
 * Public module API, exposed as `game.modules.get("loreboard").api`.
 *
 * The board engine ships as classic scripts (see the "scripts" array in
 * module.json) and publishes its entry points on globalThis. Macros, world
 * scripts and other modules should go through this API rather than calling
 * the lb* globals directly — the globals are internal and may move.
 */
export function buildApi() {
  return {
    /** Active edition: "lite" or "deluxe". */
    get edition() {
      return globalThis.lbEdition?.() ?? 'deluxe';
    },

    /** Whether a gated feature (e.g. "jukebox", "premium-boards") is available. */
    hasFeature(feature) {
      return globalThis.lbHasFeature?.(feature) ?? true;
    },

    /** True while the fullscreen board UI is open for this client. */
    isBoardOpen() {
      return !!document.getElementById('lb-app-root');
    },

    /** Open the board for the current scene (players need a live GM board). */
    async openBoard() {
      return globalThis.lbOpenSceneBoard?.();
    },

    /** Close the board UI and flush pending persistence. */
    async closeBoard() {
      return globalThis.lbCloseBoardMode?.();
    },

    /** Open the Loreboard start menu (GM) or the scene board (player). */
    async openStartMenu() {
      return globalThis.lbStartButtonPrimaryClick?.();
    }
  };
}
