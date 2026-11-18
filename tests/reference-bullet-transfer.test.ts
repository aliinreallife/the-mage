import { describe, expect, it } from "vitest";
import {
  recordNativeBulletAttack,
  nativeBulletMainDamageArgs,
  nativeBulletDirectDamageArgs,
  nativeExplosionDamageArgs,
  nativeBulletDestroyedAfterHit,
} from "../src/game/reference/source-bullet-transfer";
import { Game } from "../src/game/engine";

const explicit = {
  bulletId: 3, explosionId: 0, magicId: 1,
  damage: 100, critChance: 10, critMultiplier: 200, pierceNum: 0,
  specialVar01: 1.25, specialVar02: 2, specialVar03: 3,
  specialVar04: 4, stunTime: 0.2, freezeTime: 0,
};
describe("native 0.9941 bullet-field → enemy-argument transfer (static-only)", () => {
  it("records BulletAttack v6 twice and passes main lane attack, crit and special arguments unchanged", () => {
    const bullet=recordNativeBulletAttack(explicit);
    expect(bullet).toMatchObject({
      bulletId:3,bulletHitId:3,explosionId:0,baseExplosionId:0,magicId:1,
      firstAttack:100,attack:100,critChance:10,critMultiplier:200,
      specialVar01:1.25,specialVar02:2,specialVar03:3,specialVar04:4,
    });
    expect(nativeBulletMainDamageArgs(bullet)).toMatchObject({
      magicId:1,damage:100,critChance:10,critMultiplier:200,
      specialVar01:1.25,specialVar02:2,specialVar03:3,specialVar04:4,
      stunTime:Math.fround(0.2),freezeTime:0,
    });
    expect(Object.isFrozen(bullet)).toBe(true);
    expect(Object.isFrozen(nativeBulletMainDamageArgs(bullet))).toBe(true);
  });
  it("proves original FirstAttack and current Attack can diverge before collision", () => {
    const bullet=recordNativeBulletAttack({...explicit,explosionId:12});
    // Example of externally modified bullet state. This test does NOT claim
    // a source-confirmed scale factor or timing for that mutation.
    const changed={...bullet,attack:Math.fround(250)};
    expect(nativeBulletMainDamageArgs(changed).damage).toBe(250);
    expect(nativeExplosionDamageArgs(changed).damage).toBe(100);
    expect(nativeExplosionDamageArgs(changed).critChance).toBe(10);
    expect(nativeExplosionDamageArgs(changed).critMultiplier).toBe(200);
    expect(()=>nativeExplosionDamageArgs(recordNativeBulletAttack(explicit))).toThrow(/No explosion payload/);
  });
  it("uses direct damage at +0x21c and zeroed special parameters for the separate direct lane", () => {
    const bullet=recordNativeBulletAttack(explicit);
    expect(nativeBulletDirectDamageArgs(bullet,42)).toEqual({
      magicId:1,damage:42,critChance:10,critMultiplier:200,
      specialVar01:0,specialVar02:0,specialVar03:0,specialVar04:0,stunTime:0,freezeTime:0,
    });
    expect(()=>nativeBulletDirectDamageArgs(bullet,0)).toThrow(/positive/);
    expect(()=>nativeBulletDirectDamageArgs(bullet,-1)).toThrow(/positive/);
  });
  it("preserves native strict > piercing termination, not >=", () => {
    expect(nativeBulletDestroyedAfterHit(0,0)).toBe(true);
    expect(nativeBulletDestroyedAfterHit(0,1)).toBe(false);
    expect(nativeBulletDestroyedAfterHit(1,1)).toBe(true);
    expect(nativeBulletDestroyedAfterHit(998,999)).toBe(false);
    expect(nativeBulletDestroyedAfterHit(999,999)).toBe(true);
  });
  it("rejects missing implicit global values, nonfinite and unverified negative identifiers", () => {
    expect(()=>recordNativeBulletAttack({...explicit,critMultiplier:NaN})).toThrow(/critMultiplier/);
    expect(()=>recordNativeBulletAttack({...explicit,pierceNum:Infinity})).toThrow(/pierce/);
    expect(()=>recordNativeBulletAttack({...explicit,magicId:-1})).toThrow(/magic ID/);
    expect(()=>recordNativeBulletAttack({...explicit,explosionId:-1})).toThrow(/bullet\/explosion/);
    expect(()=>nativeBulletDestroyedAfterHit(0,NaN)).toThrow(/Explicit/);
  });
  it("remains isolated from the playable game and does not change a live snapshot", () => {
    const game=new Game(()=>{},127);
    const before=game.snapshot();
    const packet=recordNativeBulletAttack(explicit);
    const hit=nativeBulletMainDamageArgs(packet);
    expect(hit.damage).toBe(100);
    expect(game.snapshot()).toEqual(before);
  });
});
