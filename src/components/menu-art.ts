import type { HeroId } from "../game/heroes";
import farzanScene from "../assets/menu/farzan-scene.avif";
import farzanPortrait from "../assets/menu/farzan-portrait.avif";
import azarScene from "../assets/menu/azar-scene.avif";
import azarPortrait from "../assets/menu/azar-portrait.avif";
import bahmanScene from "../assets/menu/bahman-scene.avif";
import bahmanPortrait from "../assets/menu/bahman-portrait.avif";
import tishtarScene from "../assets/menu/tishtar-scene.avif";
import tishtarPortrait from "../assets/menu/tishtar-portrait.avif";

/**
 * The actual selectable heroes are the source of truth.
 * Every hero has independent, higher-resolution menu art; no single fixed
 * painted character remains behind a name change.
 *
 * The selected concept art for Tishtar is depicted as a crowned woman.
 * Gameplay hero IDs, names, powers and saves are intentionally unchanged.
 */
export const HERO_MENU_ART: Readonly<Record<HeroId, Readonly<{ scene: string; portrait: string }>>> = {
  farzan: { scene: farzanScene, portrait: farzanPortrait },
  azar: { scene: azarScene, portrait: azarPortrait },
  bahman: { scene: bahmanScene, portrait: bahmanPortrait },
  tishtar: { scene: tishtarScene, portrait: tishtarPortrait },
};
