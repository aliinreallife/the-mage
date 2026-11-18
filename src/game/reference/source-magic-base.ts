/**
 * Magic Survival 0.9941: 131 CONFIRMED_BEHAVIOR initializer stores,
 * across 21 magic groups. Preserve exact float32 bytes and int cells.
 *
 * 04-magic-and-combinations.json ->
 * datasets["research/analysis/mechanics/magic-stats.json"].data.magics[].base_parameters
 *
 * Native C_Battle_AllyUnit.StartInformation_A @ 0x1043fa0.
 * UnitBase_ fields are INITIALIZER values only, NOT final AllyUnitVar
 * damage, cooldown, projectile count or runtime dynamic modifier values.
 */
import { getSourceAbilityIdentity } from "./source-ability-identities";
export type SourceBaseValueType = "float" | "int";
export interface SourceMagicBaseParameter {
  readonly magicId: number;
  readonly field: string;
  readonly value: number;
  readonly type: SourceBaseValueType;
  readonly encoded: string; // 'f' + raw IEEE754 LE bits, or 'i' + signed int
  readonly evidence: "confirmed_behavior";
}

/** magicId|field=f<little-endian hex32>/i<int>; ... . Source row and column order. */
const RAW_BASE_ROWS = `1|UnitBase_MagicBulletDamage=f0000a040;UnitBase_MagicBulletNum=f0000803f;UnitBase_MagicBulletShotNum=f0000803f;UnitBase_MagicBulletPSpeed=f0000403f;UnitBase_MagicBulletDSpeed=fcdcc4c3e;UnitBase_MagicBulletSize=f0000c842;UnitBase_MagicBulletMSpeed=f00001143;UnitBase_MagicBulletPierceNum=f00000000;UnitBase_MagicBulletAdditionalFireRan=f00000000;UnitBase_MagicBulletRandomRan=f00000000;UnitBase_MagicBulletTargetNum=f0000803f
2|UnitBase_FireballDamage=f0000e040;UnitBase_FireballPierceNum=f00000000;UnitBase_FireballNum=f0000803f;UnitBase_FireballArea=f0000c842;UnitBase_FireballSize=f0000c842;UnitBase_FireballMSpeed=f0000a042;UnitBase_FireballPSpeed=f0000c03f;UnitBase_FireballSubNum=f00000000
3|UnitBase_SpiritDamage=f0000d040;UnitBase_SpiritNum=f00000000;UnitBase_SpiritBulletSize=f0000c842;UnitBase_SpiritBulletMSpeed=f00003443;UnitBase_SpiritPSpeed=f6666663f;UnitBase_SpiritDSpeed=f713d0a3e;UnitBase_SpiritAdditionalFireRan=f00000000
4|UnitBase_SatelliteDamage=f00009040;UnitBase_SatelliteNum=f00000000;UnitBase_SatelliteSpeed=f8fc2f53c;UnitBase_SatelliteSize=f0000b842;UnitBase_SatelliteExplosionArea=f00000000
5|UnitBase_IceNovaDamage=f00004041;UnitBase_IceNovaTime=fcdcc4c3f;UnitBase_IceNovaArea=f0000c842;UnitBase_IceNovaPSpeed=f0000b040;UnitBase_IceNovaFreezeTime=f0000803f
6|UnitBase_ShieldMaxNum=i2;UnitBase_ShieldPSpeed=f00000442;UnitBase_ShieldProductNum=i1;UnitBase_ShieldDTime=f0000a041;UnitBase_ShieldHpRegenRate=f00000000;UnitBase_ShieldAttackNum=f00000000;UnitBase_ShieldChargeDTime=f00000000
7|UnitBase_ThunderDamage=f00007041;UnitBase_ThunderNum=f0000803f;UnitBase_ThunderArea=f0000c842;UnitBase_ThunderPSpeed=f00000040;UnitBase_ThunderDSpeed=f8fc2f53d
8|UnitBase_ElectricZoneDamage=f0000a03f;UnitBase_ElectricZoneArea=f0000c842;UnitBase_ElectricZoneADelay=f0000803e;UnitBase_ElectricZoneDamagePlusRatioNum=f00000000
9|UnitBase_TsunamiDamage=f0000e040;UnitBase_TsunamiNum=f00000041;UnitBase_TsunamiSize=f0000c842;UnitBase_TsunamiPSpeed=f00000841;UnitBase_TsunamiFlowSpeed=f0000c842
10|UnitBase_MeteorDamage=f00007041;UnitBase_MeteorNum=f0000803f;UnitBase_MeteorArea=f0000c842;UnitBase_MeteorPSpeed=f00009040;UnitBase_MeteorLandDamage=f00000000;UnitBase_MeteorLandSize=f00000000;UnitBase_MeteorLandTime=f00000000;UnitBase_MeteorAddCastRan=f00000000
11|UnitBase_GhostTime=f00000040;UnitBase_GhostSpeed=f00007041;UnitBase_GhostPSpeed=f00003442;UnitBase_GhostArea=f00000000
12|UnitBase_TornadoDamage=f0000a040;UnitBase_TornadoNum=f0000803f;UnitBase_TornadoTime=f00000040;UnitBase_TornadoSize=f0000c842;UnitBase_TornadoSizeExpand=f8fc2f53b;UnitBase_TornadoADelay=f9a99993e;UnitBase_TornadoMoveSpeed=f0000f041;UnitBase_TornadoPSpeed=f00006040;UnitBase_TornadoAddCastRan=f00000000
13|UnitBase_ElectricDamage=f0000a040;UnitBase_ElectricAttackNum=i1;UnitBase_ElectricNum=i2;UnitBase_ElectricSize=f0000c842;UnitBase_ElectricPSpeed=f00000040
14|UnitBase_ArmageddonDelay=fc3f5a83e;UnitBase_ArmageddonPSpeed=f0000c842;UnitBase_ArmageddonManaObtain=f00000000;UnitBase_ArmageddonEnemyHpRatioMax=f00000000
15|UnitBase_IncinerateDamage=f0000a040;UnitBase_IncinerateFireNum=f00007041;UnitBase_IncinerateASpeed=f295c8f3d;UnitBase_IncinerateSize=f0000c842;UnitBase_IncineratePSpeed=f00008040;UnitBase_IncinerateBSpeed=f00007842
16|UnitBase_EnergyBulletDamage=f0000f040;UnitBase_EnergyBulletSize=f0000c842;UnitBase_EnergyBulletFireNum=f0000a040;UnitBase_EnergyBulletTime=f9a99193f;UnitBase_EnergyBulletMSpeed=f0000dc42;UnitBase_EnergyBulletPSpeed=f33335340;UnitBase_EnergyBulletADelay=fcdcccc3d;UnitBase_EnergyBulletDSpeed=f295c8f3d;UnitBase_EnergyBulletSplitRan=f00000000
17|UnitBase_BlizzardDamage=f0000e040;UnitBase_BlizzardNum=f0000a041;UnitBase_BlizzardASpeed=fe7fba93d;UnitBase_BlizzardArea=f0000c842;UnitBase_BlizzardPSpeed=f0000c040
18|UnitBase_ArcaneRayDamage=f00001041;UnitBase_ArcaneRayNum=i1;UnitBase_ArcaneRayTime=fcdcc4c3f;UnitBase_ArcaneRaySize=f00004842;UnitBase_ArcaneRaySpeed=f00000000;UnitBase_ArcaneRayPSpeed=f00006040;UnitBase_ArcaneRayASpeed=fcdcc4c3e;UnitBase_ArcaneRayPSpeedResetRan=f00000000;UnitBase_ArcaneRayTimePowerRan=f00000000
19|UnitBase_MagicCircleEffectNum=f0000c841;UnitBase_MagicCircleTime=f0000a040;UnitBase_MagicCirclePSpeed=f0000a041;UnitBase_MagicCirclePSpeedEffectNum=f00000000;UnitBase_MagicCircleManaBallCreateNum=i0
20|UnitBase_LavaFieldDamage=f00002041;UnitBase_LavaFieldNum=f0000803f;UnitBase_LavaFieldTime=f0000c040;UnitBase_LavaFieldSize=f0000c842;UnitBase_LavaFieldPSpeed=f0000a040;UnitBase_LavaFieldHitDamageRatioNum=f00000000
21|UnitBase_FlashShockDamage=f00009041;UnitBase_FlashShockNum=f0000803f;UnitBase_FlashShockSize=f0000c842;UnitBase_FlashShockPSpeed=f00002041`;

function decodeFloat32Hex(hex: string): number {
  if (!/^[a-f0-9]{8}$/.test(hex)) throw new TypeError("Invalid stored float32 bytes");
  const bytes = new Uint8Array(4);
  for(let i=0;i<4;i++) bytes[i] = Number.parseInt(hex.slice(i*2,i*2+2),16);
  const v = new DataView(bytes.buffer).getFloat32(0,true);
  if (!Number.isFinite(v)) throw new Error("Source initializer float is non-finite");
  return v;
}

export const SOURCE_MAGIC_BASE_PARAMETERS: readonly SourceMagicBaseParameter[] = Object.freeze(
  RAW_BASE_ROWS.split("\n").flatMap(line => {
    const [id, tail] = line.split("|");
    const magicId = Number(id);
    if(getSourceAbilityIdentity(magicId)?.kind !== "magic") throw new Error("Invalid source base magic group");
    const entries = tail.split(";");
    return entries.map(pair => {
      const [field, encoded] = pair.split("=");
      if (!field?.startsWith("UnitBase_") || !/^(f[0-9a-f]{8}|i-?[0-9]+)$/.test(encoded))
        throw new Error("Invalid source magic base parameter " + pair);
      const type: SourceBaseValueType = encoded[0] === "f" ? "float" : "int";
      const value = type === "float" ? decodeFloat32Hex(encoded.slice(1)) : Number(encoded.slice(1));
      if(!Number.isFinite(value) || (type === "int" && !Number.isSafeInteger(value))) throw new Error("Invalid source stat");
      return Object.freeze({ magicId, field, encoded, value, type, evidence:"confirmed_behavior" as const });
    });
  }),
);
if (SOURCE_MAGIC_BASE_PARAMETERS.length !== 131) throw new Error("Incomplete source initializer");

const perMagic = new Map<number, readonly SourceMagicBaseParameter[]>();
for(let id=1;id<=21;id++) {
 const rows=SOURCE_MAGIC_BASE_PARAMETERS.filter(p=>p.magicId===id);
 if(new Set(rows.map(r=>r.field)).size!==rows.length) throw new Error("Repeated source field");
 perMagic.set(id,Object.freeze(rows));
}
export function getSourceMagicBaseParameters(magicId: number): readonly SourceMagicBaseParameter[] | null {
  if(!Number.isSafeInteger(magicId)) return null;
  return perMagic.get(magicId) ?? null;
}
export function getSourceMagicBaseParameter(magicId: number, field: string): SourceMagicBaseParameter | null {
  return getSourceMagicBaseParameters(magicId)?.find(r=>r.field===field) ?? null;
}
