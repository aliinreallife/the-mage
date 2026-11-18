/**
 * Magic Survival 0.9941 — native BulletAttack→OnCollisionEnter argument
 * TRANSFER only. NEVER a final damage formula or confirmed Magic Bolt spawn.
 *
 * Source: 08-combat-and-projectiles.json →
 *   bullet-spawn.json / damage-pipeline.json,
 *   C_Battle_AllyBullet.BulletAttack @0x102ca34,
 *   C_Battle_AllyBullet.OnCollisionEnter @0x10372fc,
 *   C_Battle_AllyExplosion.ExplosionAttack @0x1192b20.
 *
 * Callers must provide all original attack/crit/special values. No estimated
 * default, RNG critical roll, per-magic Bullet_Create call or world collision.
 */

export interface SourceEnemyDamageArgs {
  readonly magicId: number;
  readonly damage: number;
  readonly critChance: number;   // raw native CriRan int passed in w4 (not normalized)
  readonly critMultiplier: number; // raw native CriMultiplier (not /100)
  readonly specialVar01: number;
  readonly specialVar02: number;
  readonly specialVar03: number;
  readonly specialVar04: number;
  readonly stunTime: number;
  readonly freezeTime: number;
}

export interface SourceBulletAttackInput extends SourceEnemyDamageArgs {
  readonly bulletId: number;
  readonly explosionId: number;
  readonly pierceNum: number;
}

export interface SourceBulletState {
  readonly bulletId: number;
  readonly bulletHitId: number;
  readonly explosionId: number;
  readonly baseExplosionId: number;
  readonly magicId: number;
  readonly firstAttack: number;  // BulletAttack v6 → bullet +0x1a4
  readonly attack: number;       // BulletAttack v6 → bullet +0x1a8
  readonly critChance: number;
  readonly critMultiplier: number;
  readonly pierceNum: number;
  readonly specialVar01: number;
  readonly specialVar02: number;
  readonly specialVar03: number;
  readonly specialVar04: number;
  readonly stunTime: number;
  readonly freezeTime: number;
}

function validDamageArgs(input: SourceEnemyDamageArgs) {
  if (!input || !Number.isSafeInteger(input.magicId) || input.magicId < 0)
    throw new RangeError("Explicit native magic ID required");
  if (!Number.isSafeInteger(input.critChance))
    throw new RangeError("Native CriRan must be an explicit integer");
  for (const key of ["damage","critMultiplier","specialVar01","specialVar02",
    "specialVar03","specialVar04","stunTime","freezeTime"] as const)
    if (!Number.isFinite(input[key])) throw new RangeError("Missing native damage argument: "+key);
}

/** Mimic only verified field assignments. Float32 represents stored native fields. */
export function recordNativeBulletAttack(input: SourceBulletAttackInput): Readonly<SourceBulletState> {
  validDamageArgs(input);
  for (const id of [input.bulletId,input.explosionId])
    if (!Number.isSafeInteger(id) || id < 0) throw new RangeError("Explicit bullet/explosion IDs required");
  if (!Number.isFinite(input.pierceNum)) throw new RangeError("Explicit native pierce required");
  const f=Math.fround;
  return Object.freeze({
    bulletId:input.bulletId, bulletHitId:input.bulletId,
    explosionId:input.explosionId, baseExplosionId:input.explosionId,
    magicId:input.magicId,
    firstAttack:f(input.damage), attack:f(input.damage),
    critChance:input.critChance, critMultiplier:f(input.critMultiplier),
    pierceNum:f(input.pierceNum),
    specialVar01:f(input.specialVar01), specialVar02:f(input.specialVar02),
    specialVar03:f(input.specialVar03), specialVar04:f(input.specialVar04),
    stunTime:f(input.stunTime), freezeTime:f(input.freezeTime),
  });
}

/**
 * The OnCollisionEnter main direct-bullet lane passes the CURRENT attack
 * at +0x1a8 to EnemyUnit.Unit_Damage; no critical damage is calculated here.
 */
export function nativeBulletMainDamageArgs(bullet: Readonly<SourceBulletState>): Readonly<SourceEnemyDamageArgs> {
  return Object.freeze({
    magicId:bullet.magicId, damage:bullet.attack,
    critChance:bullet.critChance, critMultiplier:bullet.critMultiplier,
    specialVar01:bullet.specialVar01, specialVar02:bullet.specialVar02,
    specialVar03:bullet.specialVar03, specialVar04:bullet.specialVar04,
    stunTime:bullet.stunTime, freezeTime:bullet.freezeTime,
  });
}

/**
 * OnCollisionEnter's special direct-attack lane uses explicitly supplied
 * ApplyDirectAttack +0x21c and ZERO special/stun/freeze args. Only valid >0.
 */
export function nativeBulletDirectDamageArgs(
  bullet: Readonly<SourceBulletState>, directAttack: number,
): Readonly<SourceEnemyDamageArgs> {
  if (!Number.isFinite(directAttack) || directAttack <= 0)
    throw new RangeError("Direct attack path requires explicit positive value");
  return Object.freeze({
    magicId:bullet.magicId,damage:Math.fround(directAttack),
    critChance:bullet.critChance,critMultiplier:bullet.critMultiplier,
    specialVar01:0,specialVar02:0,specialVar03:0,specialVar04:0,stunTime:0,freezeTime:0,
  });
}

/**
 * ExplosionAttack gets the bullet's ORIGINAL FirstAttack +0x1a4,
 * not the current (possibly subsequently scaled) Attack +0x1a8.
 * Does NOT assert explosion creation timing or native hit logic.
 */
export function nativeExplosionDamageArgs(bullet: Readonly<SourceBulletState>): Readonly<SourceEnemyDamageArgs> {
  if (bullet.explosionId === 0) throw new RangeError("No explosion payload in native bullet");
  return Object.freeze({
    magicId:bullet.magicId,damage:bullet.firstAttack,
    critChance:bullet.critChance,critMultiplier:bullet.critMultiplier,
    specialVar01:bullet.specialVar01,specialVar02:bullet.specialVar02,
    specialVar03:bullet.specialVar03,specialVar04:bullet.specialVar04,
    stunTime:bullet.stunTime,freezeTime:bullet.freezeTime,
  });
}

/** Verified OnCollisionEnter rule: ++ApplyBulletHitNum > UnitApply_PierceNum destroys bullet. */
export function nativeBulletDestroyedAfterHit(priorHitCount: number, pierceNum: number): boolean {
  if (!Number.isFinite(priorHitCount) || priorHitCount < 0 ||
      !Number.isFinite(pierceNum)) throw new RangeError("Explicit hit count and pierce required");
  return Math.fround(Math.fround(priorHitCount)+Math.fround(1)) > Math.fround(pierceNum);
}
