import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Game } from "../src/game/engine";
import {
  SOURCE_MAGIC_EFFECT_SLOTS, getSourceMagicEffectSlot, evaluateSourceMagicEffectSlot,
} from "../src/game/reference/source-magic-effects";

describe("Magic Survival 0.9941 stored magic effects and native dispatcher", () => {
  it("preserves all 21 x 9 raw source effect slots byte-for-byte via compact SHA256", () => {
    expect(SOURCE_MAGIC_EFFECT_SLOTS).toHaveLength(189);
    for (let magicId = 1; magicId <= 21; magicId++) {
      const rows = SOURCE_MAGIC_EFFECT_SLOTS.filter(s => s.magicId === magicId);
      expect(rows.map(s => s.slot)).toEqual([1,2,3,4,5,6,7,8,9]);
      expect(rows[0]).toMatchObject({ effectId: -magicId, value: 1, operation: "increase_magic_level" });
      expect(rows.every(Object.isFrozen)).toBe(true);
    }
    const serialized = Array.from({ length: 21 }, (_, i) => {
      const magicId = i + 1;
      const cells = Array.from({ length: 9 }, (_, s) => getSourceMagicEffectSlot(magicId, s+1)!);
      return magicId + "|" + cells.map(c => c.effectId + "," + c.value).join(";");
    }).join("\n");
    expect(createHash("sha256").update(serialized).digest("hex")).toBe(
      "df5c2c1b021cdec64aef834652e57a01fdd7ca8a425bf9a1d246835a041805d2",
    );
    expect(getSourceMagicEffectSlot(21,9)).toMatchObject({ effectId:609,value:5 });
  });

  it("keeps sparse no-op cells, including trait gaps, distinct from chronological rank-up effects", () => {
    expect(getSourceMagicEffectSlot(1,4)).toMatchObject({ effectId:1,value:0,operation:"no_effect" });
    expect(getSourceMagicEffectSlot(1,5)).toMatchObject({
      effectId:153,value:1,operation:"add",statVariable:"AllyUnitVar_MagicBulletNum",
    });
    expect(getSourceMagicEffectSlot(3,4)).toMatchObject({ effectId:1,value:0,operation:"no_effect" });
    expect(getSourceMagicEffectSlot(6,9)).toMatchObject({ effectId:1,value:0,operation:"no_effect" });
    expect(evaluateSourceMagicEffectSlot(1,4,123.5).after).toBe(123.5);
    // The raw nine slots are NOT simply spell level one through nine.
  });

  it("matches native dispatch cases for source Magic Bolt, Fireball, Spirit and Arcane Ray", () => {
    expect(getSourceMagicEffectSlot(1,2)).toMatchObject({
      effectId:153,statVariable:"AllyUnitVar_MagicBulletNum",operation:"add",
    });
    expect(getSourceMagicEffectSlot(1,3)).toMatchObject({
      effectId:151,statVariable:"AllyUnitVar_MagicBulletDamageRatioU",operation:"add",
    });
    expect(getSourceMagicEffectSlot(1,9)).toMatchObject({
      effectId:158,statVariable:"AllyUnitVar_MagicBulletPSpeedRatioU",operation:"ratio_down",
    });
    expect(getSourceMagicEffectSlot(2,3)).toMatchObject({
      effectId:181,statVariable:"AllyUnitVar_FireballDamageRatioU",operation:"add",
    });
    expect(getSourceMagicEffectSlot(2,4)).toMatchObject({
      effectId:187,statVariable:"AllyUnitVar_FireballAreaU",operation:"add",
    });
    expect(getSourceMagicEffectSlot(3,2)).toMatchObject({
      effectId:271,statVariable:"AllyUnitVar_SpiritDamageRatioU",operation:"add",
    });
    expect(getSourceMagicEffectSlot(18,9)).toMatchObject({
      effectId:542,statVariable:"AllyUnitVar_ArcaneRayPSpeedRatioU",operation:"ratio_down",
    });
    const positive = SOURCE_MAGIC_EFFECT_SLOTS.filter(s=>s.effectId > 1);
    expect(positive.every(s => s.evidence === "confirmed_static_code" && s.statVariable !== null)).toBe(true);
    expect(new Set(positive.map(s=>s.effectId)).size).toBe(58);
  });

  it("applies recovered numeric operations to explicitly supplied source stat values (float32)", () => {
    expect(evaluateSourceMagicEffectSlot(1,1,0).after).toBe(1);
    expect(evaluateSourceMagicEffectSlot(1,2,1).after).toBe(2);
    expect(evaluateSourceMagicEffectSlot(1,3,0).after).toBe(50);
    expect(evaluateSourceMagicEffectSlot(1,3,50).after).toBe(100);
    expect(evaluateSourceMagicEffectSlot(1,9,100).after).toBeCloseTo(95,5);
    expect(evaluateSourceMagicEffectSlot(6,2,100).after).toBeCloseTo(90,5);
    expect(evaluateSourceMagicEffectSlot(2,4,100).after).toBe(120);
    expect(evaluateSourceMagicEffectSlot(12,4,0).after).toBe(30);
  });

  it("refuses unknown source slots and missing current values; never makes a silent zero assumption", () => {
    expect(getSourceMagicEffectSlot(1,0)).toBeNull();
    expect(getSourceMagicEffectSlot(22,1)).toBeNull();
    expect(getSourceMagicEffectSlot(1,10)).toBeNull();
    expect(getSourceMagicEffectSlot(1.5,1)).toBeNull();
    expect(()=>evaluateSourceMagicEffectSlot(1,10,1)).toThrow(/Unknown/);
    expect(()=>evaluateSourceMagicEffectSlot(1,9,Number.NaN)).toThrow(/finite/);
    expect(()=>evaluateSourceMagicEffectSlot(1,9,Infinity)).toThrow(/finite/);
  });

  it("allows isolated dev inspection but cannot apply source effect slots to normal game state", () => {
    const normal = new Game(()=>{},713);
    expect(()=>normal.devReferenceMagicEffectSlotV1(1,2,1)).toThrow(/reference session/);
    const experimental = new Game(()=>{},714);
    experimental.enableReferenceLevelingV1({limitRatio:0.0035});
    const before = experimental.snapshot();
    const evaluated = experimental.devReferenceMagicEffectSlotV1(1,2,1);
    expect(evaluated.after).toBe(2);
    expect(evaluated.effect.statVariable).toBe("AllyUnitVar_MagicBulletNum");
    expect(experimental.snapshot()).toEqual(before);
    expect(experimental.referenceLevelingV1State()?.pending).toBeNull();
  });
});
