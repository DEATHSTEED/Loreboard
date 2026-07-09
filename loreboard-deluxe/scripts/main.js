/**
 * LOREBOARD — module entry point.
 *
 * The board engine predates this file and loads as classic scripts through
 * the manifest "scripts" array (config → permissions → utilities → themes →
 * jukebox → board tweaks → editors → eye → start menu → board → fonts).
 * This ES module layer owns everything Foundry-facing: settings, the module
 * API and lifecycle hooks. New code belongs here, not in the engine globals.
 */
import { registerModuleHooks } from './hooks.js';

registerModuleHooks();
