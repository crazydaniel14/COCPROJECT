// gamedata.js — Clash of Clans defense building upgrade data
// Data collected from in-game by Daniel. Last updated: 2026-04.
// Supercharged upgrade rows (*, **, ***) are intentionally excluded.
//
// Each building entry:
//   resource      — "gold" | "de" (dark elixir) | "gems" (Builder Hut Lvl 1 only)
//   buildingId    — integer ID from in-game village JSON (null if unknown)
//   levels        — array of { level, th_required, duration_min, cost }
//   count_at_th   — { thLevel: numberOfBuildings } — how many of this building
//                   exist at each Town Hall level. Use getCountAtTH() to query.

const DEFENSE_GAME_DATA = {

  // ── ARCHER TOWER ─────────────────────────────────────────────────────────────
  // Note: count drops at TH16+ as some Archer Towers convert to Multi-Archer Towers
  "Archer Tower": {
    resource: "gold",
    buildingId: 1000009,
    levels: [
      { level: 1,  th_required: 2,  duration_min: 0.25,  cost: 1000 },
      { level: 2,  th_required: 2,  duration_min: 2,     cost: 2000 },
      { level: 3,  th_required: 3,  duration_min: 20,    cost: 5000 },
      { level: 4,  th_required: 4,  duration_min: 60,    cost: 20000 },
      { level: 5,  th_required: 5,  duration_min: 60,    cost: 70000 },
      { level: 6,  th_required: 5,  duration_min: 120,   cost: 80000 },
      { level: 7,  th_required: 6,  duration_min: 180,   cost: 150000 },
      { level: 8,  th_required: 7,  duration_min: 240,   cost: 200000 },
      { level: 9,  th_required: 8,  duration_min: 300,   cost: 400000 },
      { level: 10, th_required: 8,  duration_min: 360,   cost: 460000 },
      { level: 11, th_required: 9,  duration_min: 420,   cost: 600000 },
      { level: 12, th_required: 10, duration_min: 480,   cost: 700000 },
      { level: 13, th_required: 10, duration_min: 600,   cost: 1000000 },
      { level: 14, th_required: 11, duration_min: 660,   cost: 1100000 },
      { level: 15, th_required: 11, duration_min: 720,   cost: 1300000 },
      { level: 16, th_required: 12, duration_min: 960,   cost: 1600000 },
      { level: 17, th_required: 12, duration_min: 1200,  cost: 1800000 },
      { level: 18, th_required: 13, duration_min: 1440,  cost: 2000000 },
      { level: 19, th_required: 13, duration_min: 1800,  cost: 2200000 },
      { level: 20, th_required: 14, duration_min: 2160,  cost: 3000000 },
      { level: 21, th_required: 15, duration_min: 2880,  cost: 4000000 },
    ],
    count_at_th: { 1:0, 2:1, 3:1, 4:2, 5:3, 6:3, 7:4, 8:5, 9:6, 10:7, 11:8, 12:8, 13:8, 14:8, 15:8, 16:4, 17:2, 18:2 },
  },

  // ── CANNON ───────────────────────────────────────────────────────────────────
  // Note: count drops at TH16+ as some Cannons convert to Ricochet Cannons
  "Cannon": {
    resource: "gold",
    buildingId: 1000008,
    levels: [
      { level: 1,  th_required: 1,  duration_min: 0.08,  cost: 250 },
      { level: 2,  th_required: 1,  duration_min: 0.5,   cost: 1000 },
      { level: 3,  th_required: 2,  duration_min: 2,     cost: 4000 },
      { level: 4,  th_required: 2,  duration_min: 20,    cost: 16000 },
      { level: 5,  th_required: 3,  duration_min: 30,    cost: 50000 },
      { level: 6,  th_required: 5,  duration_min: 60,    cost: 60000 },
      { level: 7,  th_required: 6,  duration_min: 120,   cost: 100000 },
      { level: 8,  th_required: 7,  duration_min: 180,   cost: 160000 },
      { level: 9,  th_required: 8,  duration_min: 210,   cost: 250000 },
      { level: 10, th_required: 8,  duration_min: 240,   cost: 330000 },
      { level: 11, th_required: 9,  duration_min: 270,   cost: 500000 },
      { level: 12, th_required: 10, duration_min: 300,   cost: 600000 },
      { level: 13, th_required: 10, duration_min: 360,   cost: 660000 },
      { level: 14, th_required: 11, duration_min: 480,   cost: 1000000 },
      { level: 15, th_required: 11, duration_min: 600,   cost: 1200000 },
      { level: 16, th_required: 12, duration_min: 660,   cost: 1300000 },
      { level: 17, th_required: 12, duration_min: 720,   cost: 1500000 },
      { level: 18, th_required: 13, duration_min: 960,   cost: 1800000 },
      { level: 19, th_required: 13, duration_min: 1200,  cost: 2000000 },
      { level: 20, th_required: 14, duration_min: 1440,  cost: 2600000 },
      { level: 21, th_required: 15, duration_min: 2160,  cost: 3000000 },
    ],
    count_at_th: { 1:2, 2:2, 3:2, 4:2, 5:3, 6:3, 7:5, 8:5, 9:5, 10:6, 11:7, 12:7, 13:7, 14:7, 15:7, 16:3, 17:0, 18:0 },
  },

  // ── MORTAR ───────────────────────────────────────────────────────────────────
  "Mortar": {
    resource: "gold",
    buildingId: 1000013,
    levels: [
      { level: 1,  th_required: 3,  duration_min: 30,    cost: 5000 },
      { level: 2,  th_required: 4,  duration_min: 60,    cost: 25000 },
      { level: 3,  th_required: 5,  duration_min: 120,   cost: 90000 },
      { level: 4,  th_required: 6,  duration_min: 180,   cost: 180000 },
      { level: 5,  th_required: 7,  duration_min: 360,   cost: 300000 },
      { level: 6,  th_required: 8,  duration_min: 480,   cost: 500000 },
      { level: 7,  th_required: 9,  duration_min: 720,   cost: 900000 },
      { level: 8,  th_required: 10, duration_min: 1080,  cost: 1200000 },
      { level: 9,  th_required: 11, duration_min: 1200,  cost: 1600000 },
      { level: 10, th_required: 11, duration_min: 1440,  cost: 1800000 },
      { level: 11, th_required: 12, duration_min: 1800,  cost: 2300000 },
      { level: 12, th_required: 12, duration_min: 2160,  cost: 2400000 },
      { level: 13, th_required: 13, duration_min: 2880,  cost: 2800000 },
      { level: 14, th_required: 14, duration_min: 3600,  cost: 4300000 },
      { level: 15, th_required: 15, duration_min: 4320,  cost: 5000000 },
      { level: 16, th_required: 16, duration_min: 5760,  cost: 7000000 },
      { level: 17, th_required: 17, duration_min: 11520, cost: 13000000 },
      { level: 18, th_required: 18, duration_min: 18000, cost: 21000000 },
    ],
    count_at_th: { 1:0, 2:0, 3:1, 4:1, 5:1, 6:2, 7:3, 8:4, 9:4, 10:4, 11:4, 12:4, 13:4, 14:4, 15:4, 16:4, 17:4, 18:4 },
  },

  // ── AIR DEFENSE ──────────────────────────────────────────────────────────────
  "Air Defense": {
    resource: "gold",
    buildingId: 1000012,
    levels: [
      { level: 1,  th_required: 4,  duration_min: 60,    cost: 22000 },
      { level: 2,  th_required: 4,  duration_min: 120,   cost: 90000 },
      { level: 3,  th_required: 5,  duration_min: 360,   cost: 210000 },
      { level: 4,  th_required: 6,  duration_min: 720,   cost: 500000 },
      { level: 5,  th_required: 7,  duration_min: 1080,  cost: 800000 },
      { level: 6,  th_required: 8,  duration_min: 1440,  cost: 1000000 },
      { level: 7,  th_required: 9,  duration_min: 2880,  cost: 1750000 },
      { level: 8,  th_required: 10, duration_min: 3600,  cost: 2300000 },
      { level: 9,  th_required: 11, duration_min: 4320,  cost: 3400000 },
      { level: 10, th_required: 12, duration_min: 5760,  cost: 5000000 },
      { level: 11, th_required: 13, duration_min: 6480,  cost: 5600000 },
      { level: 12, th_required: 14, duration_min: 7200,  cost: 6500000 },
      { level: 13, th_required: 15, duration_min: 8640,  cost: 8000000 },
      { level: 14, th_required: 16, duration_min: 9360,  cost: 9000000 },
      { level: 15, th_required: 17, duration_min: 13680, cost: 15000000 },
      { level: 16, th_required: 18, duration_min: 19080, cost: 26000000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:1, 5:1, 6:2, 7:3, 8:3, 9:4, 10:4, 11:4, 12:4, 13:4, 14:4, 15:4, 16:4, 17:4, 18:4 },
  },

  // ── WIZARD TOWER ─────────────────────────────────────────────────────────────
  "Wizard Tower": {
    resource: "gold",
    buildingId: 1000011,
    levels: [
      { level: 1,  th_required: 5,  duration_min: 60,    cost: 100000 },
      { level: 2,  th_required: 5,  duration_min: 90,    cost: 150000 },
      { level: 3,  th_required: 6,  duration_min: 240,   cost: 250000 },
      { level: 4,  th_required: 7,  duration_min: 480,   cost: 400000 },
      { level: 5,  th_required: 8,  duration_min: 600,   cost: 550000 },
      { level: 6,  th_required: 8,  duration_min: 720,   cost: 660000 },
      { level: 7,  th_required: 9,  duration_min: 1080,  cost: 1000000 },
      { level: 8,  th_required: 10, duration_min: 1200,  cost: 1100000 },
      { level: 9,  th_required: 10, duration_min: 1440,  cost: 1300000 },
      { level: 10, th_required: 11, duration_min: 1800,  cost: 2000000 },
      { level: 11, th_required: 12, duration_min: 2160,  cost: 2500000 },
      { level: 12, th_required: 13, duration_min: 2520,  cost: 2600000 },
      { level: 13, th_required: 13, duration_min: 2880,  cost: 3000000 },
      { level: 14, th_required: 14, duration_min: 4320,  cost: 4500000 },
      { level: 15, th_required: 15, duration_min: 5760,  cost: 5500000 },
      { level: 16, th_required: 16, duration_min: 6480,  cost: 8000000 },
      { level: 17, th_required: 17, duration_min: 12240, cost: 14000000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:1, 6:2, 7:2, 8:3, 9:4, 10:4, 11:5, 12:5, 13:5, 14:5, 15:5, 16:5, 17:5, 18:2},
  },

  // ── BOMB TOWER ───────────────────────────────────────────────────────────────
  "Bomb Tower": {
    resource: "gold",
    buildingId: 1000032,
    levels: [
      { level: 1,  th_required: 8,  duration_min: 720,   cost: 700000 },
      { level: 2,  th_required: 8,  duration_min: 1080,  cost: 1000000 },
      { level: 3,  th_required: 9,  duration_min: 1440,  cost: 1300000 },
      { level: 4,  th_required: 10, duration_min: 2160,  cost: 1800000 },
      { level: 5,  th_required: 11, duration_min: 2520,  cost: 1900000 },
      { level: 6,  th_required: 11, duration_min: 2880,  cost: 2000000 },
      { level: 7,  th_required: 12, duration_min: 4320,  cost: 4000000 },
      { level: 8,  th_required: 13, duration_min: 5760,  cost: 5000000 },
      { level: 9,  th_required: 14, duration_min: 6480,  cost: 6000000 },
      { level: 10, th_required: 15, duration_min: 6840,  cost: 7000000 },
      { level: 11, th_required: 16, duration_min: 7200,  cost: 8500000 },
      { level: 12, th_required: 17, duration_min: 12960, cost: 14500000 },
      { level: 13, th_required: 18, duration_min: 18720, cost: 25000000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:1, 9:1, 10:2, 11:2, 12:2, 13:2, 14:2, 15:2, 16:2, 17:2, 18:2 },
  },

  // ── X-BOW ────────────────────────────────────────────────────────────────────
  "X-Bow": {
    resource: "gold",
    buildingId: 1000021,
    levels: [
      { level: 1,  th_required: 9,  duration_min: 720,   cost: 1000000 },
      { level: 2,  th_required: 9,  duration_min: 1440,  cost: 1200000 },
      { level: 3,  th_required: 9,  duration_min: 2880,  cost: 2400000 },
      { level: 4,  th_required: 10, duration_min: 4320,  cost: 2500000 },
      { level: 5,  th_required: 11, duration_min: 5040,  cost: 3900000 },
      { level: 6,  th_required: 12, duration_min: 5760,  cost: 5000000 },
      { level: 7,  th_required: 13, duration_min: 6120,  cost: 6000000 },
      { level: 8,  th_required: 13, duration_min: 6480,  cost: 7000000 },
      { level: 9,  th_required: 14, duration_min: 7200,  cost: 9000000 },
      { level: 10, th_required: 15, duration_min: 7920,  cost: 9500000 },
      { level: 11, th_required: 16, duration_min: 8640,  cost: 10000000 },
      { level: 12, th_required: 17, duration_min: 15120, cost: 16000000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:2, 10:3, 11:4, 12:4, 13:4, 14:4, 15:4, 16:4, 17:4, 18:4 },
  },

  // ── INFERNO TOWER ────────────────────────────────────────────────────────────
  "Inferno Tower": {
    resource: "gold",
    buildingId: 1000027,
    levels: [
      { level: 1,  th_required: 10, duration_min: 720,   cost: 1000000 },
      { level: 2,  th_required: 10, duration_min: 1440,  cost: 1200000 },
      { level: 3,  th_required: 10, duration_min: 2880,  cost: 2400000 },
      { level: 4,  th_required: 11, duration_min: 3600,  cost: 3400000 },
      { level: 5,  th_required: 11, duration_min: 4320,  cost: 4200000 },
      { level: 6,  th_required: 12, duration_min: 5760,  cost: 6000000 },
      { level: 7,  th_required: 13, duration_min: 7200,  cost: 8000000 },
      { level: 8,  th_required: 14, duration_min: 8640,  cost: 9500000 },
      { level: 9,  th_required: 15, duration_min: 9360,  cost: 10000000 },
      { level: 10, th_required: 16, duration_min: 10080, cost: 11000000 },
      { level: 11, th_required: 17, duration_min: 17280, cost: 16000000 },
      { level: 12, th_required: 18, duration_min: 19440, cost: 26500000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:2, 11:2, 12:3, 13:3, 14:3, 15:3, 16:3, 17:3, 18:3 },
  },

  // ── EAGLE ARTILLERY ──────────────────────────────────────────────────────────
  "Eagle Artillery": {
    resource: "gold",
    buildingId: 1000031,
    levels: [
      { level: 1, th_required: 11, duration_min: 5760,  cost: 5000000 },
      { level: 2, th_required: 11, duration_min: 7200,  cost: 6000000 },
      { level: 3, th_required: 12, duration_min: 10080, cost: 9000000 },
      { level: 4, th_required: 13, duration_min: 10800, cost: 10000000 },
      { level: 5, th_required: 14, duration_min: 11520, cost: 12000000 },
      { level: 6, th_required: 15, duration_min: 12960, cost: 13000000 },
      { level: 7, th_required: 16, duration_min: 13680, cost: 14000000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:1, 12:1, 13:1, 14:1, 15:1, 16:1, 17:1, 18:0},
  },

  // ── SCATTERSHOT ──────────────────────────────────────────────────────────────
  "Scattershot": {
    resource: "gold",
    buildingId: 1000067,
    levels: [
      { level: 1, th_required: 13, duration_min: 8640,  cost: 8000000 },
      { level: 2, th_required: 13, duration_min: 10080, cost: 9000000 },
      { level: 3, th_required: 14, duration_min: 10800, cost: 11000000 },
      { level: 4, th_required: 15, duration_min: 11520, cost: 11500000 },
      { level: 5, th_required: 16, duration_min: 12240, cost: 12000000 },
      { level: 6, th_required: 17, duration_min: 15120, cost: 16500000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:1, 14:1, 15:1, 16:2, 17:2, 18:2 },
  },

  // ── HIDDEN TESLA ─────────────────────────────────────────────────────────────
  // Note: labeled "Inferno Tower" in the source PDF (section 3) — confirmed as
  // Hidden Tesla based on TH7 unlock, cost, and duration data.
  "Hidden Tesla": {
    resource: "gold",
    buildingId: 1000019,
    levels: [
      { level: 1,  th_required: 7,  duration_min: 120,   cost: 250000 },
      { level: 2,  th_required: 7,  duration_min: 180,   cost: 350000 },
      { level: 3,  th_required: 7,  duration_min: 240,   cost: 500000 },
      { level: 4,  th_required: 8,  duration_min: 360,   cost: 600000 },
      { level: 5,  th_required: 8,  duration_min: 720,   cost: 800000 },
      { level: 6,  th_required: 8,  duration_min: 1440,  cost: 1200000 },
      { level: 7,  th_required: 9,  duration_min: 1800,  cost: 1400000 },
      { level: 8,  th_required: 10, duration_min: 2160,  cost: 1600000 },
      { level: 9,  th_required: 11, duration_min: 2520,  cost: 2100000 },
      { level: 10, th_required: 12, duration_min: 2880,  cost: 3000000 },
      { level: 11, th_required: 13, duration_min: 3600,  cost: 3100000 },
      { level: 12, th_required: 13, duration_min: 4320,  cost: 3700000 },
      { level: 13, th_required: 14, duration_min: 5040,  cost: 5100000 },
      { level: 14, th_required: 15, duration_min: 5760,  cost: 6500000 },
      { level: 15, th_required: 16, duration_min: 7200,  cost: 8200000 },
      { level: 16, th_required: 17, duration_min: 12960, cost: 15000000 },
      { level: 17, th_required: 18, duration_min: 18720, cost: 25000000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:2, 8:3, 9:4, 10:4, 11:4, 12:5, 13:5, 14:5, 15:5, 16:5, 17:5, 18:5 },
  },

  // ── AIR SWEEPER ──────────────────────────────────────────────────────────────
  "Air Sweeper": {
    resource: "gold",
    buildingId: 1000028,
    levels: [
      { level: 1, th_required: 6,  duration_min: 240,  cost: 200000 },
      { level: 2, th_required: 6,  duration_min: 360,  cost: 300000 },
      { level: 3, th_required: 7,  duration_min: 480,  cost: 450000 },
      { level: 4, th_required: 8,  duration_min: 720,  cost: 800000 },
      { level: 5, th_required: 9,  duration_min: 1440, cost: 1200000 },
      { level: 6, th_required: 10, duration_min: 2880, cost: 1900000 },
      { level: 7, th_required: 11, duration_min: 4320, cost: 3400000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:1, 7:1, 8:1, 9:2, 10:2, 11:2, 12:2, 13:2, 14:2, 15:2, 16:2, 17:2, 18:2 },
  },

  // ── BUILDER HUT ──────────────────────────────────────────────────────────────
  // Level 1 cost is in gems (paid to unlock builders). Levels 2-7 convert the
  // hut into an active defense, require TH14+, and cost gold.
  "Builder Hut": {
    resource: "gold",   // level 1 is gems (special case handled in UI)
    buildingId: 1000015,
    levels: [
      { level: 1, th_required: 1,  duration_min: 0,     cost: 0,        resource: "gems" },
      { level: 2, th_required: 14, duration_min: 2880,  cost: 3000000 },
      { level: 3, th_required: 14, duration_min: 4320,  cost: 4000000 },
      { level: 4, th_required: 14, duration_min: 5760,  cost: 6000000 },
      { level: 5, th_required: 15, duration_min: 7200,  cost: 7000000 },
      { level: 6, th_required: 16, duration_min: 8160,  cost: 8000000 },
      { level: 7, th_required: 17, duration_min: 13680, cost: 15500000 },
    ],
    count_at_th: { 1:5, 2:5, 3:5, 4:5, 5:5, 6:5, 7:5, 8:5, 9:5, 10:5, 11:5, 12:5, 13:5, 14:5, 15:5, 16:5, 17:5, 18:5 },
  },

  // ── SPELL TOWER ──────────────────────────────────────────────────────────────
  "Spell Tower": {
    resource: "gold",
    buildingId: 1000072,
    levels: [
      { level: 1, th_required: 15, duration_min: 10080, cost: 9000000 },
      { level: 2, th_required: 15, duration_min: 11520, cost: 11000000 },
      { level: 3, th_required: 15, duration_min: 12240, cost: 12000000 },
      { level: 4, th_required: 17, duration_min: 20160, cost: 27000000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:2, 16:2, 17:2, 18:2 },
  },

  // ── FIRESPITTER ──────────────────────────────────────────────────────────────
  "Firespitter": {
    resource: "gold",
    buildingId: 1000089,
    levels: [
      { level: 1, th_required: 17, duration_min: 15840, cost: 17000000 },
      { level: 2, th_required: 17, duration_min: 16560, cost: 18000000 },
      { level: 3, th_required: 18, duration_min: 21600, cost: 29000000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0, 16:0, 17:2, 18:2 },
  },

  // ── MONOLITH ─────────────────────────────────────────────────────────────────
  "Monolith": {
    resource: "de",
    buildingId: 1000077,
    levels: [
      { level: 1, th_required: 15, duration_min: 10080, cost: 200000 },
      { level: 2, th_required: 15, duration_min: 11520, cost: 250000 },
      { level: 3, th_required: 16, duration_min: 12960, cost: 260000 },
      { level: 4, th_required: 17, duration_min: 17280, cost: 300000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:1, 16:1, 17:1, 18:1 },
  },

  // ── MULTI-ARCHER TOWER ───────────────────────────────────────────────────────
  // Replaces some Archer Towers at TH16+
  "Multi-Archer Tower": {
    resource: "gold",
    buildingId: 1000084,
    levels: [
      { level: 1, th_required: 16, duration_min: 10080, cost: 12000000 },
      { level: 2, th_required: 16, duration_min: 11520, cost: 13000000 },
      { level: 3, th_required: 17, duration_min: 15480, cost: 17500000 },
      { level: 4, th_required: 18, duration_min: 20160, cost: 27000000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0, 16:2, 17:3, 18:3 },
  },

  // ── RICOCHET CANNON ──────────────────────────────────────────────────────────
  // Replaces some Cannons at TH16+
  "Ricochet Cannon": {
    resource: "de",
    buildingId: 1000085,
    levels: [
      { level: 1, th_required: 16, duration_min: 10080, cost: 12000000 },
      { level: 2, th_required: 16, duration_min: 11520, cost: 13000000 },
      { level: 3, th_required: 17, duration_min: 15480, cost: 17500000 },
      { level: 4, th_required: 18, duration_min: 19440, cost: 26500000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0, 16:2, 17:3, 18:3 },
  },

  // ── SUPER WIZARD TOWER ───────────────────────────────────────────────────────
  // TH18 only. ID confirmed from village JSON export (two individual entries).
  "Super Wizard Tower": {
    resource: "gold",
    buildingId: 1000102,
    levels: [
      { level: 1, th_required: 18, duration_min: 18720, cost: 29000000 },
      { level: 2, th_required: 18, duration_min: 20160, cost: 30000000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0, 16:0, 17:0, 18:2 },
  },

  // ── REVENGE TOWER ────────────────────────────────────────────────────────────
  // TH18 only. ID confirmed from village JSON export (one individual entry).
  "Revenge Tower": {
    resource: "de",
    buildingId: 1000093,
    levels: [
      { level: 1, th_required: 18, duration_min: 18720, cost: 430000 },
      { level: 2, th_required: 18, duration_min: 20160, cost: 460000 },
    ],
    count_at_th: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0, 16:0, 17:0, 18:1 },
  },

};

// ── HERO GAME DATA ────────────────────────────────────────────────────────────
// Heroes are limited by Hero Hall level (not Town Hall level).
// Hero Hall dataId: 1000071
//
// Each hero entry:
//   resource     — "de" (dark elixir)
//   heroId       — integer dataId from in-game village JSON
//   levels       — array of { level, hero_hall_required, duration_min, cost }
//                  (level 1 has duration_min: 0 and cost: 0 — no upgrade needed)

const HERO_GAME_DATA = {

  // ── BARBARIAN KING ───────────────────────────────────────────────────────────
  // One per village. Levels 1–105 (as of 2026-04). dataId: 28000000
  "Barbarian King": {
    resource: "de",
    heroId: 28000000,
    levels: [
      { level:   1, hero_hall_required:  1, duration_min:     0, cost:      0 },
      { level:   2, hero_hall_required:  1, duration_min:   120, cost:   5000 },
      { level:   3, hero_hall_required:  1, duration_min:   240, cost:   5500 },
      { level:   4, hero_hall_required:  1, duration_min:   480, cost:   6000 },
      { level:   5, hero_hall_required:  1, duration_min:   600, cost:   6500 },
      { level:   6, hero_hall_required:  1, duration_min:   720, cost:   7000 },
      { level:   7, hero_hall_required:  1, duration_min:   840, cost:   7500 },
      { level:   8, hero_hall_required:  1, duration_min:   960, cost:   8000 },
      { level:   9, hero_hall_required:  1, duration_min:  1080, cost:   8500 },
      { level:  10, hero_hall_required:  1, duration_min:  1200, cost:  10000 },
      { level:  11, hero_hall_required:  2, duration_min:  1320, cost:  10500 },
      { level:  12, hero_hall_required:  2, duration_min:  1440, cost:  11000 },
      { level:  13, hero_hall_required:  2, duration_min:  1440, cost:  11500 },
      { level:  14, hero_hall_required:  2, duration_min:  1440, cost:  12000 },
      { level:  15, hero_hall_required:  2, duration_min:  1440, cost:  12500 },
      { level:  16, hero_hall_required:  2, duration_min:  1440, cost:  13000 },
      { level:  17, hero_hall_required:  2, duration_min:  1440, cost:  13500 },
      { level:  18, hero_hall_required:  2, duration_min:  1440, cost:  14000 },
      { level:  19, hero_hall_required:  2, duration_min:  1440, cost:  14500 },
      { level:  20, hero_hall_required:  2, duration_min:  1440, cost:  15000 },
      { level:  21, hero_hall_required:  3, duration_min:  1440, cost:  17000 },
      { level:  22, hero_hall_required:  3, duration_min:  1440, cost:  19000 },
      { level:  23, hero_hall_required:  3, duration_min:  1440, cost:  21000 },
      { level:  24, hero_hall_required:  3, duration_min:  1440, cost:  23000 },
      { level:  25, hero_hall_required:  3, duration_min:  1440, cost:  25000 },
      { level:  26, hero_hall_required:  3, duration_min:  2880, cost:  27000 },
      { level:  27, hero_hall_required:  3, duration_min:  2880, cost:  29000 },
      { level:  28, hero_hall_required:  3, duration_min:  2880, cost:  31000 },
      { level:  29, hero_hall_required:  3, duration_min:  2880, cost:  33000 },
      { level:  30, hero_hall_required:  3, duration_min:  2880, cost:  35000 },
      { level:  31, hero_hall_required:  4, duration_min:  2880, cost:  37000 },
      { level:  32, hero_hall_required:  4, duration_min:  2880, cost:  39000 },
      { level:  33, hero_hall_required:  4, duration_min:  2880, cost:  41000 },
      { level:  34, hero_hall_required:  4, duration_min:  2880, cost:  43000 },
      { level:  35, hero_hall_required:  4, duration_min:  2880, cost:  45000 },
      { level:  36, hero_hall_required:  4, duration_min:  2880, cost:  47000 },
      { level:  37, hero_hall_required:  4, duration_min:  2880, cost:  49000 },
      { level:  38, hero_hall_required:  4, duration_min:  2880, cost:  51000 },
      { level:  39, hero_hall_required:  4, duration_min:  2880, cost:  53000 },
      { level:  40, hero_hall_required:  4, duration_min:  2880, cost:  55000 },
      { level:  41, hero_hall_required:  5, duration_min:  4320, cost:  58000 },
      { level:  42, hero_hall_required:  5, duration_min:  4320, cost:  61000 },
      { level:  43, hero_hall_required:  5, duration_min:  4320, cost:  64000 },
      { level:  44, hero_hall_required:  5, duration_min:  4320, cost:  67000 },
      { level:  45, hero_hall_required:  5, duration_min:  4320, cost:  70000 },
      { level:  46, hero_hall_required:  5, duration_min:  4320, cost:  73000 },
      { level:  47, hero_hall_required:  5, duration_min:  4320, cost:  76000 },
      { level:  48, hero_hall_required:  5, duration_min:  4320, cost:  79000 },
      { level:  49, hero_hall_required:  5, duration_min:  4320, cost:  82000 },
      { level:  50, hero_hall_required:  5, duration_min:  4320, cost:  85000 },
      { level:  51, hero_hall_required:  6, duration_min:  4320, cost:  86000 },
      { level:  52, hero_hall_required:  6, duration_min:  4320, cost:  87000 },
      { level:  53, hero_hall_required:  6, duration_min:  4320, cost:  88000 },
      { level:  54, hero_hall_required:  6, duration_min:  4320, cost:  89000 },
      { level:  55, hero_hall_required:  6, duration_min:  4320, cost:  90000 },
      { level:  56, hero_hall_required:  6, duration_min:  4320, cost:  93000 },
      { level:  57, hero_hall_required:  6, duration_min:  4320, cost:  96000 },
      { level:  58, hero_hall_required:  6, duration_min:  4320, cost:  99000 },
      { level:  59, hero_hall_required:  6, duration_min:  4320, cost: 102000 },
      { level:  60, hero_hall_required:  6, duration_min:  4320, cost: 105000 },
      { level:  61, hero_hall_required:  6, duration_min:  5760, cost: 107000 },
      { level:  62, hero_hall_required:  6, duration_min:  5760, cost: 109000 },
      { level:  63, hero_hall_required:  6, duration_min:  5760, cost: 111000 },
      { level:  64, hero_hall_required:  6, duration_min:  5760, cost: 113000 },
      { level:  65, hero_hall_required:  6, duration_min:  5760, cost: 115000 },
      { level:  66, hero_hall_required:  7, duration_min:  5760, cost: 117000 },
      { level:  67, hero_hall_required:  7, duration_min:  5760, cost: 119000 },
      { level:  68, hero_hall_required:  7, duration_min:  5760, cost: 121000 },
      { level:  69, hero_hall_required:  7, duration_min:  5760, cost: 123000 },
      { level:  70, hero_hall_required:  7, duration_min:  5760, cost: 125000 },
      { level:  71, hero_hall_required:  7, duration_min:  5760, cost: 130000 },
      { level:  72, hero_hall_required:  7, duration_min:  5760, cost: 135000 },
      { level:  73, hero_hall_required:  7, duration_min:  5760, cost: 140000 },
      { level:  74, hero_hall_required:  7, duration_min:  5760, cost: 145000 },
      { level:  75, hero_hall_required:  7, duration_min:  5760, cost: 150000 },
      { level:  76, hero_hall_required:  8, duration_min:  5760, cost: 155000 },
      { level:  77, hero_hall_required:  8, duration_min:  5760, cost: 160000 },
      { level:  78, hero_hall_required:  8, duration_min:  5760, cost: 165000 },
      { level:  79, hero_hall_required:  8, duration_min:  5760, cost: 170000 },
      { level:  80, hero_hall_required:  8, duration_min:  5760, cost: 175000 },
      { level:  81, hero_hall_required:  8, duration_min:  7200, cost: 180000 },
      { level:  82, hero_hall_required:  8, duration_min:  7200, cost: 185000 },
      { level:  83, hero_hall_required:  8, duration_min:  7200, cost: 195000 },
      { level:  84, hero_hall_required:  8, duration_min:  7200, cost: 205000 },
      { level:  85, hero_hall_required:  8, duration_min:  7200, cost: 215000 },
      { level:  86, hero_hall_required:  9, duration_min:  8640, cost: 220000 },
      { level:  87, hero_hall_required:  9, duration_min:  8640, cost: 230000 },
      { level:  88, hero_hall_required:  9, duration_min:  8640, cost: 240000 },
      { level:  89, hero_hall_required:  9, duration_min:  8640, cost: 250000 },
      { level:  90, hero_hall_required:  9, duration_min:  8640, cost: 255000 },
      { level:  91, hero_hall_required: 10, duration_min: 10080, cost: 280000 },
      { level:  92, hero_hall_required: 10, duration_min: 10080, cost: 290000 },
      { level:  93, hero_hall_required: 10, duration_min: 10080, cost: 300000 },
      { level:  94, hero_hall_required: 10, duration_min: 10080, cost: 310000 },
      { level:  95, hero_hall_required: 10, duration_min: 10080, cost: 320000 },
      { level:  96, hero_hall_required: 11, duration_min: 11520, cost: 340000 },
      { level:  97, hero_hall_required: 11, duration_min: 11520, cost: 350000 },
      { level:  98, hero_hall_required: 11, duration_min: 11520, cost: 360000 },
      { level:  99, hero_hall_required: 11, duration_min: 11520, cost: 370000 },
      { level: 100, hero_hall_required: 11, duration_min: 11520, cost: 380000 },
      { level: 101, hero_hall_required: 12, duration_min: 11520, cost: 400000 },
      { level: 102, hero_hall_required: 12, duration_min: 11520, cost: 410000 },
      { level: 103, hero_hall_required: 12, duration_min: 11520, cost: 420000 },
      { level: 104, hero_hall_required: 12, duration_min: 11520, cost: 430000 },
      { level: 105, hero_hall_required: 12, duration_min: 11520, cost: 450000 },
    ],
  },

};

// ── HELPER: max hero level achievable at a given Hero Hall level ───────────────
function getMaxHeroLevelAtHH(heroName, heroHallLevel) {
  const data = HERO_GAME_DATA[heroName];
  if (!data) return 0;
  let max = 0;
  for (const lvl of data.levels) {
    if (lvl.hero_hall_required <= heroHallLevel && lvl.level > max) max = lvl.level;
  }
  return max;
}

// ── HELPER: heroes for progress view ─────────────────────────────────────────
// Returns array of { name, resource, heroId, maxLevel, levels[] }
// If heroHallLevel is null (unknown), exposes all levels with the absolute max.
function getHeroesForProgress(heroHallLevel) {
  const cap = (heroHallLevel !== null && heroHallLevel > 0) ? heroHallLevel : Infinity;
  return Object.entries(HERO_GAME_DATA).map(([name, data]) => {
    const maxLevel = cap === Infinity
      ? data.levels[data.levels.length - 1].level
      : getMaxHeroLevelAtHH(name, cap);
    return {
      name,
      resource: data.resource,
      heroId:   data.heroId,
      maxLevel,
      levels:   cap === Infinity ? data.levels : data.levels.filter(l => l.hero_hall_required <= cap),
    };
  }).filter(h => h.maxLevel > 0);
}

// ── HELPER: count at a given TH level ─────────────────────────────────────────
// Returns number of buildings of the given type available at thLevel.
// Uses the last known count if thLevel exceeds all keys.
function getCountAtTH(buildingName, thLevel) {
  const data = DEFENSE_GAME_DATA[buildingName];
  if (!data) return 0;
  const keys = Object.keys(data.count_at_th).map(Number).sort((a, b) => a - b);
  let count = 0;
  for (const th of keys) {
    if (th <= thLevel) count = data.count_at_th[th];
  }
  return count;
}

// ── HELPER: max level achievable at a given TH ────────────────────────────────
function getMaxLevelAtTH(buildingName, thLevel) {
  const data = DEFENSE_GAME_DATA[buildingName];
  if (!data) return 0;
  let max = 0;
  for (const lvl of data.levels) {
    if (lvl.th_required <= thLevel && lvl.level > max) max = lvl.level;
  }
  return max;
}

// ── HELPER: all defense buildings available at a TH level ─────────────────────
// Returns array of:
//   { name, resource, buildingId, count, maxLevel, levels[] }
// Sorted in rough game order (single-target → splash → special).
function getDefensesAtTH(thLevel) {
  const ORDER = [
    "Cannon", "Archer Tower", "Mortar", "Air Defense", "Wizard Tower",
    "Hidden Tesla", "X-Bow", "Inferno Tower", "Bomb Tower", "Air Sweeper",
    "Eagle Artillery", "Scattershot", "Builder Hut", "Spell Tower",
    "Monolith", "Multi-Archer Tower", "Ricochet Cannon",
    "Firespitter", "Super Wizard Tower", "Revenge Tower",
  ];
  const result = [];
  for (const name of ORDER) {
    const data = DEFENSE_GAME_DATA[name];
    if (!data) continue;
    const count    = getCountAtTH(name, thLevel);
    if (count === 0) continue;
    const maxLevel = getMaxLevelAtTH(name, thLevel);
    if (maxLevel === 0) continue;
    if (name === "Builder Hut" && maxLevel < 2) continue; // Lvl 1 is not a defense
    result.push({
      name,
      resource:   data.resource,
      buildingId: data.buildingId,
      count,
      maxLevel,
      levels: data.levels.filter(l => l.th_required <= thLevel),
    });
  }
  return result;
}

// ── HELPER: format duration (minutes → "Xd Xhr Ymin") ────────────────────────
function formatDefenseDuration(minutes) {
  if (!minutes || minutes < 1) return '< 1 min';
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = Math.round(minutes % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}hr`);
  if (m > 0) parts.push(`${m}min`);
  return parts.join(' ') || '< 1 min';
}

// ── HELPER: format cost ───────────────────────────────────────────────────────
function formatDefenseCost(cost, resource) {
  const suffix = resource === 'de' ? ' DE' : resource === 'gems' ? ' gems' : '';
  if (cost >= 1000000) return (cost / 1000000).toFixed(cost % 1000000 === 0 ? 0 : 1) + 'M' + suffix;
  if (cost >= 1000)    return (cost / 1000).toFixed(cost % 1000 === 0 ? 0 : 1) + 'k' + suffix;
  return cost + suffix;
}
