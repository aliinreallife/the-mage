import type { HeroId } from "../game/heroes";
import farzanScene from "../assets/cinematic/farzan-scene.webp";
import farzanPortrait from "../assets/cinematic/farzan-portrait.webp";
import farzanGround from "../assets/cinematic/farzan-ground.webp";
import azarScene from "../assets/cinematic/azar-scene.webp";
import azarPortrait from "../assets/cinematic/azar-portrait.webp";
import azarGround from "../assets/cinematic/azar-ground.webp";
import bahmanScene from "../assets/cinematic/bahman-scene.webp";
import bahmanPortrait from "../assets/cinematic/bahman-portrait.webp";
import bahmanGround from "../assets/cinematic/bahman-ground.webp";
import tishtarScene from "../assets/cinematic/tishtar-scene.webp";
import tishtarPortrait from "../assets/cinematic/tishtar-portrait.webp";
import tishtarGround from "../assets/cinematic/tishtar-ground.webp";

/**
 * Distinct menu scenery for each persistent HeroId.
 * Each cropped artwork intentionally excludes the concept's rendered buttons,
 * titles, selection states and currency so UI data remains genuinely live.
 * The fourth concept uses a crowned, celestial mage for Tishtar; do not rename
 * or migrate the saved HeroId or change the gameplay abilities.
 */
export interface HeroMenuArt {
  scene: string;
  portrait: string;
  ground: string;
}

export const HERO_MENU_ART: Readonly<Record<HeroId, Readonly<HeroMenuArt>>> = {
  farzan: { scene: farzanScene, portrait: farzanPortrait, ground: farzanGround },
  azar: { scene: azarScene, portrait: azarPortrait, ground: azarGround },
  bahman: { scene: bahmanScene, portrait: bahmanPortrait, ground: bahmanGround },
  tishtar: { scene: tishtarScene, portrait: tishtarPortrait, ground: tishtarGround },
};
