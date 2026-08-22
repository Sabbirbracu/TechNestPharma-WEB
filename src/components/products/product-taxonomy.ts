import {
  Beaker,
  Box,
  Boxes,
  FlaskConical,
  Leaf,
  Package,
  Pill,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ApplicationType, MaterialType, PackagingType } from "@/types/domain";

/**
 * How a material type presents itself: the label a user reads, and the colour
 * it carries wherever it appears (row icon, category badge, header tile).
 *
 * One map so a category can never be green in the badge and blue in the icon.
 * Colours are classes rather than tokens because each needs three coordinated
 * shades (tint, ring, ink) and Tailwind cannot compose those from a variable.
 */
export type CategoryStyle = {
  label: string;
  icon: LucideIcon;
  /** Badge: tinted pill with an inset ring. */
  badge: string;
  /** Row/tile icon: tinted square. */
  tile: string;
};

const API: CategoryStyle = {
  label: "API",
  icon: FlaskConical,
  badge: "bg-tile-green-bg text-tile-green ring-tile-green/20",
  tile: "bg-tile-green-bg text-tile-green ring-tile-green/15",
};

const EXCIPIENT: CategoryStyle = {
  label: "Excipients",
  icon: Beaker,
  badge: "bg-tile-amber-bg text-tile-amber ring-tile-amber/20",
  tile: "bg-tile-amber-bg text-tile-amber ring-tile-amber/15",
};

const PACKAGING: CategoryStyle = {
  label: "Packaging Materials",
  icon: Package,
  badge: "bg-tile-blue-bg text-tile-blue ring-tile-blue/20",
  tile: "bg-tile-blue-bg text-tile-blue ring-tile-blue/15",
};

const OTHER: CategoryStyle = {
  label: "Other Materials",
  icon: Boxes,
  badge: "bg-tile-purple-bg text-tile-purple ring-tile-purple/20",
  tile: "bg-tile-purple-bg text-tile-purple ring-tile-purple/15",
};

/** Every material type the backend can return, so a row never falls through to
 *  an unstyled badge when a new one is seeded. */
export const CATEGORY_STYLES: Record<MaterialType, CategoryStyle> = {
  api: API,
  excipient: EXCIPIENT,
  packaging_material: PACKAGING,
  intermediate: { ...OTHER, label: "Intermediate", icon: Beaker },
  finished_product: { ...OTHER, label: "Finished Product", icon: Pill },
  semi_finished_product: { ...OTHER, label: "Semi-Finished", icon: Pill },
  vitamin: { ...OTHER, label: "Vitamin", icon: Sparkles },
  amino_acid: { ...OTHER, label: "Amino Acid", icon: Sparkles },
  plant_extract: { ...OTHER, label: "Plant Extract", icon: Leaf },
  food_additive: { ...OTHER, label: "Food Additive", icon: Leaf },
  solvent: { ...OTHER, label: "Solvent", icon: Beaker },
  enzyme: { ...OTHER, label: "Enzyme", icon: Sparkles },
  cosmetic_ingredient: { ...OTHER, label: "Cosmetic Ingredient", icon: Sparkles },
  other: OTHER,
};

export const UNCATEGORISED: CategoryStyle = {
  label: "Uncategorised",
  icon: Box,
  badge: "bg-muted text-muted-foreground ring-border/60",
  tile: "bg-muted text-muted-foreground ring-border/50",
};

/**
 * The one category a row leads with.
 *
 * Precedence, most authoritative first:
 *   1. a packaging spec row, which is what *makes* a product a packaging
 *      material (D14)
 *   2. the rollup across its offers, already ordered by how many suppliers back
 *      each one
 *
 * A substance can be sold as several things at once — that is the point of
 * keeping material type on the offer, not the product — but the row needs one
 * icon and one leading badge.
 */
export function primaryCategory(
  materialTypes: MaterialType[],
  isPackaging: boolean,
): CategoryStyle {
  if (isPackaging) return PACKAGING;
  const [first] = materialTypes;
  return first ? CATEGORY_STYLES[first] ?? UNCATEGORISED : UNCATEGORISED;
}

/** Options for the Category filter — the buckets the header tiles count, in the
 *  same order, so the two controls read as one story. */
export const CATEGORY_FILTER_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: "api", label: "API" },
  { value: "excipient", label: "Excipients" },
  { value: "packaging_material", label: "Packaging Materials" },
  { value: "intermediate", label: "Intermediates" },
  { value: "vitamin", label: "Vitamins" },
  { value: "amino_acid", label: "Amino Acids" },
  { value: "plant_extract", label: "Plant Extracts" },
  { value: "food_additive", label: "Food Additives" },
  { value: "solvent", label: "Solvents" },
  { value: "enzyme", label: "Enzymes" },
  { value: "cosmetic_ingredient", label: "Cosmetic Ingredients" },
  { value: "finished_product", label: "Finished Products" },
  { value: "other", label: "Other" },
];

/** The seven packaging families (D14, `packaging_spec.pkg_type`) — the filter
 *  a "Packaging Materials" product type narrows to, in place of the chemical
 *  material types above. */
export const PACKAGING_TYPE_OPTIONS: { value: PackagingType; label: string }[] = [
  { value: "rubber_stopper", label: "Rubber Stopper" },
  { value: "flip_off_seal", label: "Flip-off Seal" },
  { value: "shrink_film", label: "Shrink Film" },
  { value: "eye_container", label: "Eye Container" },
  { value: "aluminium_foil", label: "Aluminium Foil" },
  { value: "pvc_film", label: "PVC Film" },
  { value: "sterilized_cotton", label: "Sterilized Cotton" },
  { value: "other", label: "Other" },
];

const APPLICATION_LABELS: Record<ApplicationType, string> = {
  oral: "Oral",
  injection: "Injection",
  topical: "Topical",
  inhalation: "Inhalation",
  ophthalmic: "Ophthalmic",
  biological: "Biological",
  general: "General",
};

export function applicationLabel(application: ApplicationType): string {
  return APPLICATION_LABELS[application] ?? application;
}

/**
 * ISO 3166-1 alpha-2 to its flag emoji, by offsetting each letter into the
 * Regional Indicator Symbol block. Beats shipping 200 flag images, and matches
 * how the search results already render supplier origin.
 *
 * Returns null for anything that is not two ASCII letters, so a malformed code
 * degrades to the country name alone rather than to tofu.
 */
export function flagEmoji(iso2: string | null | undefined): string | null {
  if (!iso2 || !/^[A-Za-z]{2}$/.test(iso2)) return null;
  const REGIONAL_INDICATOR_A = 0x1f1e6;
  return String.fromCodePoint(
    ...[...iso2.toUpperCase()].map(
      (letter) => REGIONAL_INDICATOR_A + letter.charCodeAt(0) - 65,
    ),
  );
}
