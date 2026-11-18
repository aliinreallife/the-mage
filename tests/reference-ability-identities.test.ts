import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Game } from "../src/game/engine";
import {
  SOURCE_ABILITY_IDENTITIES, getSourceAbilityIdentity, sourceAbilityCount,
} from "../src/game/reference/source-ability-identities";
import {
  LOCAL_SOURCE_LINKS, getLocalSourceLink, isAuditedEarlyPrimaryPassiveBlocked,
} from "../src/game/reference/local-source-links";

describe("0.9941 stored source identities and conservative local crosswalk", () => {
  it("stores all 121 abilities in four distinct source categories with unique IDs", () => {
    expect(SOURCE_ABILITY_IDENTITIES).toHaveLength(121);
    expect(sourceAbilityCount("magic")).toBe(21);
    expect(sourceAbilityCount("passive")).toBe(10);
    expect(sourceAbilityCount("special_passive")).toBe(24);
    expect(sourceAbilityCount("trait")).toBe(66);
    expect(new Set(SOURCE_ABILITY_IDENTITIES.map(a => a.sourceId)).size).toBe(121);
    expect(getSourceAbilityIdentity(1)).toMatchObject({
      sourceId: 1, nameEn: "Magic Bolt", kind: "magic", maxLevel: 7, evidence: "stored",
    });
    expect(getSourceAbilityIdentity(6)).toMatchObject({ nameEn: "Shield", kind: "magic", maxLevel: 5 });
    expect(getSourceAbilityIdentity(14)).toMatchObject({ nameEn: "Armageddon", requiredLevel: 6 });
    expect(getSourceAbilityIdentity(30)).toMatchObject({ nameEn: "Advanced Magic", kind: "passive", requiredLevel: 1 });
    expect(getSourceAbilityIdentity(31)).toMatchObject({ nameEn: "Intelligence", maxLevel: 5 });
    expect(getSourceAbilityIdentity(34)).toMatchObject({ nameEn: "Haste", maxLevel: 2 });
    expect(getSourceAbilityIdentity(38)).toMatchObject({ nameEn: "Explorer", maxLevel: 3 });
    expect(getSourceAbilityIdentity(301)).toMatchObject({ nameEn: "Lord of Fire", kind: "special_passive", maxLevel: 1 });
    expect(getSourceAbilityIdentity(324)).toMatchObject({ nameEn: "Florist", kind: "special_passive", maxLevel: 1 });
    expect(getSourceAbilityIdentity(389)).toMatchObject({ nameEn: "Anti-Gravity", kind: "trait", parentMagicId: 4 });
    expect(getSourceAbilityIdentity(463)).toMatchObject({ nameEn: "Void", kind: "trait", parentMagicId: 12 });
    expect(getSourceAbilityIdentity(499)).toMatchObject({ nameEn: "Flare", kind: "trait", parentMagicId: 16 });
    expect(getSourceAbilityIdentity(542)).toMatchObject({ nameEn: "Wipeout", kind: "trait", parentMagicId: 21 });
    expect(getSourceAbilityIdentity(9031)).toBeNull(); // generated additional-choice ID, not catalog entity
    expect(getSourceAbilityIdentity(32.5)).toBeNull();
    expect(SOURCE_ABILITY_IDENTITIES.every(a => Object.isFrozen(a))).toBe(true);
  });

  it.each([
    ["magic", "828e910fda8a66c09a28e402949064935f2d7ef7281310829e884da1c3a0c6eb"],
    ["passive", "14d1ca06992e8b2eae7f79d71ae30a1b04052f0e6256bb9add627ae1c5f3d3c2"],
    ["special_passive", "86f8a541376bda5e4a9973309b20395ca3b46e3e6a4f7c24c6696f3d4be3d211"],
    ["trait", "9291315ca9e22c8e552796693f79e7e494baa38e391cfa5be3855aa5278e47f7"],
  ] as const)("%s identity category matches its source digest", (category, expected) => {
    const rows = SOURCE_ABILITY_IDENTITIES.filter(a => a.kind === category).map(a =>
      [a.kind, a.sourceId, a.nameEn, a.maxLevel, a.requiredLevel, a.parentMagicId ?? 0].join("|"),
    ).join("\n");
    expect(createHash("sha256").update(rows).digest("hex")).toBe(expected);
  });

  it("matches the complete stored catalog's source identity checksum", () => {
    // SHA-256 over all 121 source rows in canonical reference_layer order:
    // category|reference_id|internal_name|max_level|required_level|derived_ability_id
    // Established from the uploaded 02-catalog-and-identities.json, not invented.
    const canonical = SOURCE_ABILITY_IDENTITIES.map(a =>
      [a.kind, a.sourceId, a.nameEn, a.maxLevel, a.requiredLevel, a.parentMagicId ?? 0].join("|"),
    ).join("\n");
    expect(createHash("sha256").update(canonical).digest("hex")).toBe(
      "336a3ef13d2bfd1527bb8f3d94e831637932018b06753a4775f8faa63a213e6c",
    );
  });

  it("separates source role identities from numerical and parent mismatches", () => {
    expect(LOCAL_SOURCE_LINKS).toHaveLength(19);
    expect(getLocalSourceLink("passive", "might")).toMatchObject({
      sourceId: 31, status: "supported_correspondence",
    });
    expect(getLocalSourceLink("passive", "haste")?.sourceId).toBe(32);
    expect(getLocalSourceLink("passive", "vital")?.sourceId).toBe(33);
    expect(getLocalSourceLink("passive", "snipe")?.sourceId).toBe(37);
    expect(getLocalSourceLink("passive", "swift")).toMatchObject({
      sourceId: 34, status: "analogy_only",
    });
    expect(getLocalSourceLink("passive", "magnet")).toMatchObject({
      sourceId: 38, status: "analogy_only",
    });
    expect(getLocalSourceLink("spell", "flash")?.sourceId).toBe(7); // Thunderstorm, NOT Flash Shock
    expect(getLocalSourceLink("spell", "fire")?.sourceId).toBe(2);
    expect(getSourceAbilityIdentity(2)?.maxLevel).toBe(7); // local Fireball max is 6
    expect(getLocalSourceLink("talent", "doppel")?.sourceId).toBe(367);
    expect(getLocalSourceLink("talent", "antigrav")?.sourceId).toBe(389);
    expect(getLocalSourceLink("talent", "void")?.sourceId).toBe(463);
    // Matching English trait names do not override incompatible parent magic.
    expect(getLocalSourceLink("talent", "flare")).toBeNull();
    expect(getLocalSourceLink("talent", "wipeout")).toBeNull();
    // Original Shield is an ACTIVE magic; our 'shield' is a PASSIVE.
    expect(getLocalSourceLink("passive", "shield")).toBeNull();
    expect(getLocalSourceLink("spell", "zap")).toBeNull();
    expect(getLocalSourceLink("passive", "wisdom")).toBeNull();
    expect(getLocalSourceLink("talent", "firecracker")).toBeNull();
    expect(getLocalSourceLink("spell", "not-real")).toBeNull();
  });

  it("projects only four audited source IDs onto early level passive exclusions", () => {
    for (const id of ["might", "haste", "vital", "snipe"] as const) {
      for (const level of [1, 2, 3]) expect(isAuditedEarlyPrimaryPassiveBlocked(level, id)).toBe(true);
      expect(isAuditedEarlyPrimaryPassiveBlocked(4, id)).toBe(false);
      expect(isAuditedEarlyPrimaryPassiveBlocked(99, id)).toBe(false);
    }
    // Analogy-only mapping must not be promoted to a source eligibility rule.
    for (const id of ["swift", "magnet", "regen", "armor", "wisdom", "shield"] as const)
      expect(isAuditedEarlyPrimaryPassiveBlocked(1, id)).toBe(false);
    expect(() => isAuditedEarlyPrimaryPassiveBlocked(0, "might")).toThrow(/source level/);
  });

  it("uses the vetted early exclusion in DEV game rolls without changing normal game rolls", () => {
    const blocked = new Set(["might", "haste", "vital", "snipe"]);
    let normalSawBlocked = false;
    for (let seed = 100; seed < 135; seed++) {
      const normal = new Game(() => {}, seed);
      if (normal.rollChoices().some(c => blocked.has(c.id))) normalSawBlocked = true;
      const experimental = new Game(() => {}, seed);
      experimental.enableReferenceLevelingV1({ limitRatio: 0.0035 }); // explicit fixture ratio
      for (const c of experimental.rollChoices())
        expect(blocked.has(c.id)).toBe(false);
    }
    expect(normalSawBlocked).toBe(true);
  });

  it("ends early suppression once the explicitly accepted reference level reaches 4", () => {
    const g = new Game(() => {}, 804);
    g.enableReferenceLevelingV1({ limitRatio: 0.0035 });
    expect(g.devReferenceManaGainV1(2000)).toBe(true);
    for (let level = 2; level <= 4; level++) {
      expect(g.applyChoice({ id: "heal", next: 1 })).toBe(true);
      expect(g.level).toBe(level);
      if (level < 4) expect(g.devReferenceManaGainV1(0)).toBe(true);
    }
    expect(isAuditedEarlyPrimaryPassiveBlocked(g.level, "might")).toBe(false);
    const previouslyBlocked = new Set(["might", "haste", "vital", "snipe"]);
    let appears = false;
    for (let n = 0; n < 120; n++)
      if (g.rollChoices().some(c => previouslyBlocked.has(c.id))) appears = true;
    expect(appears).toBe(true);
  });
});
