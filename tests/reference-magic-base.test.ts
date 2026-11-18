import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  SOURCE_MAGIC_BASE_PARAMETERS,
  getSourceMagicBaseParameters,
  getSourceMagicBaseParameter,
} from "../src/game/reference/source-magic-base";

describe("Magic Survival 0.9941 native initializer: 131 magic base parameters", () => {
  it("preserves every stored field and its exact underlying float32/int bits", () => {
    expect(SOURCE_MAGIC_BASE_PARAMETERS).toHaveLength(131);
    const canonical = Array.from({ length: 21 }, (_, n) => {
      const id = n + 1;
      const row = getSourceMagicBaseParameters(id);
      expect(row).not.toBeNull();
      expect(row!.length).toBeGreaterThan(0);
      expect(row!.every(r=>r.magicId===id && r.field.startsWith("UnitBase_"))).toBe(true);
      expect(row!.every(Object.isFrozen)).toBe(true);
      return id + "|" + row!.map(r=>r.field+"="+r.encoded).join(";");
    }).join("\n");
    expect(createHash("sha256").update(canonical).digest("hex")).toBe(
      "5d39650f24a23c057a7767feace3975b72ac373e2fa016f40d80cffd2cd81bc3",
    );
    expect(getSourceMagicBaseParameters(22)).toBeNull();
    expect(getSourceMagicBaseParameters(2.5)).toBeNull();
  });

  it("stores Magic Bolt and Fireball base values, not approximate local damage", () => {
    expect(getSourceMagicBaseParameter(1,"UnitBase_MagicBulletDamage")).toMatchObject({
      value:5,type:"float",encoded:"f0000a040",evidence:"confirmed_behavior",
    });
    expect(getSourceMagicBaseParameter(1,"UnitBase_MagicBulletNum")?.value).toBe(1);
    expect(getSourceMagicBaseParameter(1,"UnitBase_MagicBulletPSpeed")?.value).toBe(0.75);
    expect(getSourceMagicBaseParameter(1,"UnitBase_MagicBulletDSpeed")?.value).toBe(Math.fround(0.2));
    expect(getSourceMagicBaseParameter(2,"UnitBase_FireballDamage")?.value).toBe(7);
    expect(getSourceMagicBaseParameter(2,"UnitBase_FireballNum")?.value).toBe(1);
    expect(getSourceMagicBaseParameter(2,"UnitBase_FireballPSpeed")?.value).toBe(1.5);
    expect(getSourceMagicBaseParameter(2,"UnitBase_FireballArea")?.value).toBe(100);
  });

  it("does not interpret source Shield and Arcane Ray integer stores as float bytes", () => {
    expect(getSourceMagicBaseParameter(6,"UnitBase_ShieldMaxNum")).toMatchObject({
      value:2,type:"int",encoded:"i2",
    });
    expect(getSourceMagicBaseParameter(6,"UnitBase_ShieldProductNum")).toMatchObject({
      value:1,type:"int",encoded:"i1",
    });
    expect(getSourceMagicBaseParameter(13,"UnitBase_ElectricAttackNum")).toMatchObject({value:1,type:"int"});
    expect(getSourceMagicBaseParameter(13,"UnitBase_ElectricNum")).toMatchObject({value:2,type:"int"});
    expect(getSourceMagicBaseParameter(18,"UnitBase_ArcaneRayNum")).toMatchObject({value:1,type:"int"});
    expect(getSourceMagicBaseParameter(19,"UnitBase_MagicCircleManaBallCreateNum")).toMatchObject({value:0,type:"int"});
    expect(SOURCE_MAGIC_BASE_PARAMETERS.filter(p=>p.type==="int")).toHaveLength(6);
    expect(SOURCE_MAGIC_BASE_PARAMETERS.filter(p=>p.type==="float")).toHaveLength(125);
    expect(getSourceMagicBaseParameter(1,"UnitBase_MeteorDamage")).toBeNull();
    expect(getSourceMagicBaseParameter(22,"UnitBase_MagicBulletDamage")).toBeNull();
  });

  it("keeps per-group source base stores immutable and out of the local combat globals", () => {
    const a = getSourceMagicBaseParameters(1);
    const b = getSourceMagicBaseParameters(1);
    expect(a).toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(SOURCE_MAGIC_BASE_PARAMETERS)).toBe(true);
    const baseValue = getSourceMagicBaseParameter(4,"UnitBase_SatelliteNum");
    expect(baseValue?.value).toBe(0); // local orbit rendering does not change this source initializer
    expect(baseValue?.evidence).toBe("confirmed_behavior");
  });
});
