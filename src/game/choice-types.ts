/**
 * Presentation taxonomy for The Mage's current choices, not source ID mapping.
 * Magic Survival 0.9941 stores magic, passive, special_passive, trait and
 * combination entities. Elite is an enemy designation, not card rarity.
 * Special passives and source offer odds remain unimplemented.
 */
import { UPGRADES } from "./data";
import type { Choice } from "./engine";

export type ChoiceType = "active" | "passive" | "trait" | "combination" | "recovery";

export const CHOICE_TYPE_LABEL: Record<ChoiceType, string> = {
  active: "افسون فعال",
  passive: "افسون غیرفعال",
  trait: "ویژگی افسون",
  combination: "ترکیب افسون",
  recovery: "بازیابی",
};

export function choiceTypeFor(c: Choice): ChoiceType {
  if (c.fusion) return "combination";
  if (c.talent || c.mastery) return "trait";
  const kind = UPGRADES[c.id].kind;
  if (kind === "spell") return "active";
  if (kind === "passive") return "passive";
  // The Mage's heal fallback is not an original source magic category.
  return "recovery";
}
