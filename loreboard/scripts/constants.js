// Shared identifiers for the ES module layer. The legacy engine keeps its own
// copies in scripts/config.js (LB_MODULE_ID, PREFIX) — keep the values in sync.
export const MODULE_ID = 'loreboard';
export const SETTING_PREFIX = 'myloreboard_v10_';
export const SETTINGS = {
  HIDDEN_SNAPS: `${SETTING_PREFIX}hiddenSnaps`
};
