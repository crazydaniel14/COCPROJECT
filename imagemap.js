/* ── SHARED IMAGE MAP ──────────────────────────────────────────────────────
   Single source of truth for building upgrade image lookups.
   Loaded by: index.html, building.html, schedule.html
   ────────────────────────────────────────────────────────────────────────── */

const HERO_NAMES = [
  "Archer Queen",
  "Barbarian King",
  "Dragon Duke",
  "Grand Warden",
  "Minion Prince",
  "Royal Champion",
  "Longshot",
  "Smasher",
  "Air Bombs"
];

const IMAGE_MAP = {
  "Air Bomb":           ["Lvl 11&12","Lvl 13"],
  "Air Defense":        ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13","Lvl 14","Lvl 15","Lvl 16"],
  "Air Sweeper":        ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7"],
  "Archer Tower":       ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13","Lvl 14","Lvl 15","Lvl 16","Lvl 17","Lvl 18","Lvl 19","Lvl 20","Lvl 21"],
  "Army Camp":          ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13","Lvl 14"],
  "Barracks":           ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13","Lvl 14","Lvl 15","Lvl 16","Lvl 17","Lvl 18","Lvl 19"],
  "Blacksmith":         ["Lvl 1&2","Lvl 3&4","Lvl 5&6","Lvl 7&8","Lvl 9&10"],
  "Bomb":               ["Lvl 11&12","Lvl 13&14"],
  "Bomb Tower":         ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13"],
  "Builder Hut":        ["Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7&8&9"],
  "Cannon":             ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13","Lvl 14","Lvl 15","Lvl 16","Lvl 17","Lvl 18","Lvl 19","Lvl 20","Lvl 21"],
  "Clan Castle":        ["Lvl 14"],
  "Dark Barracks":      ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12"],
  "Dark Elixir Drill":  ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11"],
  "Dark Elixir Storage":["Lvl 12","Lvl 13"],
  "Dark Spell Factory": ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7"],
  "Eagle Artillery":    ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7"],
  "Elixir Collector":   ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13","Lvl 14","Lvl 15","Lvl 16","Lvl 17"],
  "Elixir Storage":     ["Lvl 18","Lvl 19"],
  "Firespitter":        ["Lvl 1","Lvl 2","Lvl 3"],
  "Giant Bomb":         ["Lvl 6","Lvl 7&8","Lvl 9&10","Lvl 11"],
  "Giga Bomb":          ["Lvl 2","Lvl 3","Lvl 4"],
  "Gold Mine":          ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13","Lvl 14","Lvl 15","Lvl 16","Lvl 17"],
  "Gold Storage":       ["Lvl 18","Lvl 19"],
  "Hero Hall":          ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11&12"],
  "Hidden Tesla":       ["Lvl 16","Lvl 17"],
  "Inferno Tower":      ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12"],
  "Laboratory":         ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13","Lvl 14","Lvl 15","Lvl 16"],
  "Monolith":           ["Lvl 1","Lvl 2","Lvl 3","Lvl 4"],
  "Mortar":             ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13","Lvl 14","Lvl 15","Lvl 16","Lvl 17","Lvl 18"],
  "Multi-Archer Tower": ["Lvl 1","Lvl 2","Lvl 3","Lvl 4"],
  "Multi-Gear Tower":   ["Lvl 3"],
  "Pet House":          ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12"],
  "Revenge Tower":      ["Lvl 1","Lvl 2"],
  "Ricochet Cannon":    ["Lvl 1","Lvl 2","Lvl 3","Lvl 4"],
  "Scattershot":        ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6&7&8"],
  "Seeking Air Mine":   ["Lvl 5&6","Lvl 7&8"],
  "Skeleton Trap":      ["Lvl 5"],
  "Spell Factory":      ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9"],
  "Spell Tower":        ["Lvl 2","Lvl 3","Lvl 4"],
  "Spring Trap":        ["Lvl 1&2","Lvl 7&8","Lvl 9&10","Lvl 11&12","Lvl 13"],
  "Super Wizard Tower": ["Lvl 1","Lvl 2"],
  "Town Hall":          ["Lvl 18"],
  "Wizard Tower":       ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13","Lvl 14","Lvl 15","Lvl 16","Lvl 17"],
  "Workshop":           ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9"],
  "X-Bow":              ["Lvl 1","Lvl 2","Lvl 3","Lvl 4","Lvl 5","Lvl 6","Lvl 7","Lvl 8","Lvl 9","Lvl 10","Lvl 11","Lvl 12","Lvl 13"],
};

function getSuperchargeImage(upgradeName) {
  const basePath = "Images/Upgrades/";
  const baseMatch = upgradeName.match(/^(.+?)\s*(?:#\d+)?\s+Lvl\s+\*+$/i);
  if (!baseMatch) return basePath + "PH.png";
  const baseName = baseMatch[1].trim();
  if (!IMAGE_MAP[baseName]) return basePath + "PH.png";
  const entries = IMAGE_MAP[baseName];
  return basePath + baseName + " " + entries[entries.length - 1] + ".png";
}

function getUpgradeImage(name) {
  if (!name) return "Images/Upgrades/PH.png";
  const basePath = "Images/Upgrades/";
  for (const hero of HERO_NAMES) {
    if (name.includes(hero)) return basePath + hero + ".png";
  }
  const m = name.match(/^(.+?)\s*(?:#\d+)?\s+(?:Level|Lvl)\s+(\d+)/i);
  if (!m) return basePath + "PH.png";
  const bn = m[1].trim();
  const lvl = parseInt(m[2]);
  if (!IMAGE_MAP[bn]) return basePath + "PH.png";
  for (const ls of IMAGE_MAP[bn]) {
    const nums = ls.match(/\d+/g)?.map(Number) || [];
    if (nums.includes(lvl)) return basePath + bn + " " + ls + ".png";
  }
  return basePath + "PH.png";
}
