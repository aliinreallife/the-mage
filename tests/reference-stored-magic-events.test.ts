import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Game } from "../src/game/engine";
import { getSourceAbilityIdentity } from "../src/game/reference/source-ability-identities";
import {
  SOURCE_MAGIC_STORED_EVENTS,
  getSourceMagicStoredEvents,
  replaySourceMagicStoredEvents,
} from "../src/game/reference/source-magic-stored-events";

describe("Magic Survival 0.9941 stored per_level_effects != runtime rank schedule", () => {
  it("exactly reproduces all 21 native stored event lists and original order", () => {
    expect(SOURCE_MAGIC_STORED_EVENTS).toHaveLength(126);
    const entries = Array.from({length:21},(_,i)=>{
      const id=i+1, events=getSourceMagicStoredEvents(id)!;
      expect(events).not.toBeNull();
      expect(events.every(Object.isFrozen)).toBe(true);
      expect(events.map(e=>e.ordinal)).toEqual(events.map((_,n)=>n+1));
      expect(events.every(e=>e.rawSlot>=1&&e.rawSlot<=9)).toBe(true);
      return id+"|"+events.map(e=>e.effectId+","+e.value).join(";");
    }).join("\n");
    expect(createHash("sha256").update(entries).digest("hex"))
      .toBe("7357b8a716302f176b7342d8172579dd08ca2e1beb07d9f811488b31eced0dfa");
    expect(getSourceMagicStoredEvents(22)).toBeNull();
  });

  it("records the actual Magic Bolt seven-event stream and its two discarded table gaps", () => {
    const events=getSourceMagicStoredEvents(1)!;
    expect(events.map(e=>[e.ordinal,e.rawSlot,e.effectId,e.value])).toEqual([
      [1,1,-1,1],[2,2,153,1],[3,3,151,50],
      [4,5,153,1],[5,6,151,50],[6,8,151,50],[7,9,158,5],
    ]);
    expect(getSourceAbilityIdentity(1)?.maxLevel).toBe(7);
    // The ordinal is NOT universally a magic rank: Fireball has 8 events, maximum rank 7.
    expect(getSourceMagicStoredEvents(2)).toHaveLength(8);
    expect(getSourceAbilityIdentity(2)?.maxLevel).toBe(7);
    expect(getSourceMagicStoredEvents(6)).toHaveLength(2);
    expect(getSourceAbilityIdentity(6)?.maxLevel).toBe(5);
  });

  const base = {
    magicLevel: 0,
    statValues: {
      AllyUnitVar_MagicBulletNum: 1,
      AllyUnitVar_MagicBulletDamageRatioU: 0,
      AllyUnitVar_MagicBulletPSpeedRatioU: 100,
    },
  };

  it("replays Magic Bolt's verified event OPERATOR order using caller-supplied variables", () => {
    const result = replaySourceMagicStoredEvents(1,7,base);
    expect(result.magicLevel).toBe(1); // not inventing 7 rank increases
    expect(result.statValues).toMatchObject({
      AllyUnitVar_MagicBulletNum: 3,
      AllyUnitVar_MagicBulletDamageRatioU: 150,
      AllyUnitVar_MagicBulletPSpeedRatioU: 95,
    });
    expect(result.steps.map(step=>step.rawSlot)).toEqual([1,2,3,5,6,8,9]);
    expect(result.provenance).toBe("stored_order_explicit_inputs_not_runtime");
    expect(base.statValues.AllyUnitVar_MagicBulletNum).toBe(1);
    expect(Object.isFrozen(result.statValues)).toBe(true);
    expect(Object.isFrozen(result.steps)).toBe(true);
  });

  it("supports a prefix and preserves every untouched caller-supplied stat", () => {
    expect(replaySourceMagicStoredEvents(1,0,base)).toMatchObject({magicLevel:0,appliedEventCount:0});
    expect(replaySourceMagicStoredEvents(1,3,base)).toMatchObject({
      magicLevel:1, appliedEventCount:3,
      statValues:{AllyUnitVar_MagicBulletNum:2,AllyUnitVar_MagicBulletDamageRatioU:50,AllyUnitVar_MagicBulletPSpeedRatioU:100},
    });
    expect(replaySourceMagicStoredEvents(6,2,{
      magicLevel:0,statValues:{AllyUnitVar_ShieldPSpeedRatioU:100},
    }).statValues.AllyUnitVar_ShieldPSpeedRatioU).toBeCloseTo(90,5);
  });

  it("never invents missing native stat seeds, ranks, or allowed ordinals", () => {
    expect(()=>replaySourceMagicStoredEvents(1,8,base)).toThrow(/outside source range/);
    expect(()=>replaySourceMagicStoredEvents(1,-1,base)).toThrow(/outside source range/);
    expect(()=>replaySourceMagicStoredEvents(22,0,base)).toThrow(/Unknown source magic/);
    expect(()=>replaySourceMagicStoredEvents(1,7,{magicLevel:0,statValues:{}}))
      .toThrow(/not explicitly supplied/);
    expect(()=>replaySourceMagicStoredEvents(1,7,{magicLevel:0,statValues:{AllyUnitVar_MagicBulletNum:1}}))
      .toThrow(/not explicitly supplied/);
    expect(()=>replaySourceMagicStoredEvents(1,0,{magicLevel:0.5,statValues:{}}))
      .toThrow(/magicLevel/);
    expect(()=>replaySourceMagicStoredEvents(1,0,{magicLevel:0,statValues:{Arbitrary:0}}))
      .toThrow(/stat key/);
    expect(()=>replaySourceMagicStoredEvents(1,0,{magicLevel:0,statValues:{AllyUnitVar_MagicBulletNum:Infinity}}))
      .toThrow(/stat key/);
  });

  it("is accessible only as a read-only experiment and does not mutate actual gameplay", () => {
    const normal=new Game(()=>{},17);
    expect(()=>normal.devReferenceStoredMagicReplayV1(1,3,base)).toThrow(/reference session/);
    const dev=new Game(()=>{},18);
    dev.enableReferenceLevelingV1({limitRatio:0.0035});
    const snapshot=dev.snapshot();
    const res=dev.devReferenceStoredMagicReplayV1(1,3,base);
    expect(res.statValues.AllyUnitVar_MagicBulletNum).toBe(2);
    expect(dev.snapshot()).toEqual(snapshot);
    expect(dev.referenceLevelingV1State()).toMatchObject({level:1,stock:0,pending:null});
  });
});
