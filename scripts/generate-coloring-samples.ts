#!/usr/bin/env npx tsx
/**
 * KidLearn Coloring Sheet Generator
 * ─────────────────────────────────
 * Generates sample SVG coloring pages at ZERO cost.
 * Writes SVG files to public/coloring/{theme}/
 * Writes a manifest to public/coloring/manifest.json
 *
 * Usage:
 *   npx tsx scripts/generate-coloring-samples.ts
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "public", "coloring");

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function write(filePath: string, content: string) {
  writeFileSync(filePath, content, "utf8");
  console.log(`  ✓ ${filePath.replace(process.cwd(), ".")}`);
}

function svgWrap(width: number, height: number, inner: string, title: string, subtitle = ""): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="white"/>
  <!-- Outer border -->
  <rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="none" stroke="#000" stroke-width="3" rx="16"/>
  <!-- Inner border -->
  <rect x="16" y="16" width="${width - 32}" height="${height - 32}" fill="none" stroke="#000" stroke-width="1.5" rx="12" stroke-dasharray="6,4"/>
  ${inner}
  <!-- Title -->
  <text x="${width / 2}" y="${height - 32}" font-family="Arial Black, sans-serif" font-size="20"
        text-anchor="middle" fill="#000" font-weight="900">${title}</text>
  ${subtitle ? `<text x="${width / 2}" y="${height - 12}" font-family="Arial, sans-serif" font-size="13"
        text-anchor="middle" fill="#555">${subtitle}</text>` : ""}
  <!-- KidLearn branding -->
  <text x="${width - 20}" y="${height - 4}" font-family="Arial, sans-serif" font-size="9"
        text-anchor="end" fill="#ccc">KidLearn</text>
</svg>`;
}

// ── 1. ALPHABET — A to J ──────────────────────────────────────────────────────

function generateAlphabet(): SheetMeta[] {
  const dir = join(OUT_DIR, "alphabet");
  ensureDir(dir);
  const letters = "ABCDEFGHIJ".split("");
  const sheets: SheetMeta[] = [];

  const DECORATIONS: Record<string, { emoji: string; word: string }> = {
    A: { emoji: "🍎", word: "Apple" },
    B: { emoji: "🦋", word: "Butterfly" },
    C: { emoji: "🐱", word: "Cat" },
    D: { emoji: "🐶", word: "Dog" },
    E: { emoji: "🐘", word: "Elephant" },
    F: { emoji: "🐸", word: "Frog" },
    G: { emoji: "🦒", word: "Giraffe" },
    H: { emoji: "🐴", word: "Horse" },
    I: { emoji: "🦎", word: "Iguana" },
    J: { emoji: "🪼", word: "Jellyfish" },
  };

  for (const letter of letters) {
    const deco = DECORATIONS[letter];
    // Decorative corner flowers
    const corners = `
      <circle cx="40" cy="40" r="6" fill="none" stroke="#000" stroke-width="2"/>
      <circle cx="360" cy="40" r="6" fill="none" stroke="#000" stroke-width="2"/>
      <circle cx="40" cy="530" r="6" fill="none" stroke="#000" stroke-width="2"/>
      <circle cx="360" cy="530" r="6" fill="none" stroke="#000" stroke-width="2"/>
    `;
    // Big outlined letter using text with stroke
    const big = `
      <text x="200" y="340" font-family="Arial Black, sans-serif" font-size="280" font-weight="900"
            text-anchor="middle" fill="none" stroke="#000" stroke-width="10" stroke-linejoin="round">${letter}</text>
      <text x="200" y="340" font-family="Arial Black, sans-serif" font-size="280" font-weight="900"
            text-anchor="middle" fill="none" stroke="#fff" stroke-width="4">${letter}</text>
    `;
    // Small decoration circles (for coloring)
    const dots = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const cx = 200 + Math.cos(angle) * 155;
      const cy = 180 + Math.sin(angle) * 50;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="10" fill="none" stroke="#000" stroke-width="2"/>`;
    }).join("\n      ");

    const inner = corners + big + dots;
    const svg = svgWrap(400, 570, inner, `${letter} is for ${deco.word}`, "Colour me in!");
    const filename = `${letter.toLowerCase()}.svg`;
    write(join(dir, filename), svg);
    sheets.push({ id: `alphabet-${letter.toLowerCase()}`, theme: "alphabet", title: `Letter ${letter}`, subtitle: `${letter} is for ${deco.word}`, file: `/coloring/alphabet/${filename}`, ageGroup: "foundation", tags: ["letters", "english", "abc"] });
  }

  return sheets;
}

// ── 2. NUMBERS — 1 to 10 ─────────────────────────────────────────────────────

function generateNumbers(): SheetMeta[] {
  const dir = join(OUT_DIR, "numbers");
  ensureDir(dir);
  const sheets: SheetMeta[] = [];

  const WORDS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const OBJECTS = ["star", "heart", "circle", "square", "triangle", "hexagon", "diamond", "oval", "moon", "sun"];

  for (let n = 1; n <= 10; n++) {
    const word = WORDS[n - 1];
    // Big outlined number
    const big = `
      <text x="200" y="310" font-family="Arial Black, sans-serif" font-size="${n < 10 ? 260 : 210}" font-weight="900"
            text-anchor="middle" fill="none" stroke="#000" stroke-width="10" stroke-linejoin="round">${n}</text>
      <text x="200" y="310" font-family="Arial Black, sans-serif" font-size="${n < 10 ? 260 : 210}" font-weight="900"
            text-anchor="middle" fill="none" stroke="#fff" stroke-width="4">${n}</text>
    `;
    // Count dots at the bottom matching the number
    const dotsPerRow = Math.min(n, 5);
    const rows = Math.ceil(n / 5);
    const dotSize = 16;
    const dotGap = 40;
    let dotsSvg = "";
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const rowCount = (row === rows - 1) ? n - row * 5 : 5;
      const startX = 200 - ((rowCount - 1) * dotGap) / 2;
      const cx = startX + col * dotGap;
      const cy = 390 + row * 38;
      dotsSvg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${dotSize}" fill="none" stroke="#000" stroke-width="2.5"/>\n      `;
    }

    const inner = big + dotsSvg;
    const svg = svgWrap(400, 570, inner, `${n} — ${word}`, `Count the ${OBJECTS[n - 1]}s!`);
    const filename = `${n < 10 ? "0" + n : n}.svg`;
    write(join(dir, filename), svg);
    sheets.push({ id: `numbers-${n}`, theme: "numbers", title: `Number ${n}`, subtitle: word, file: `/coloring/numbers/${filename}`, ageGroup: "foundation", tags: ["numbers", "counting", "maths"] });
  }

  return sheets;
}

// ── 3. SHAPES ─────────────────────────────────────────────────────────────────

function generateShapes(): SheetMeta[] {
  const dir = join(OUT_DIR, "shapes");
  ensureDir(dir);

  const shapes = [
    { id: "circle",    title: "Circle",    sides: "No corners — round all the way!",   path: `<circle cx="200" cy="230" r="150" fill="none" stroke="#000" stroke-width="9"/>` },
    { id: "triangle",  title: "Triangle",  sides: "3 sides, 3 corners",               path: `<polygon points="200,80 370,380 30,380" fill="none" stroke="#000" stroke-width="9" stroke-linejoin="round"/>` },
    { id: "square",    title: "Square",    sides: "4 equal sides",                    path: `<rect x="55" y="80" width="290" height="290" fill="none" stroke="#000" stroke-width="9" rx="8"/>` },
    { id: "rectangle", title: "Rectangle", sides: "2 long sides, 2 short sides",      path: `<rect x="35" y="125" width="330" height="200" fill="none" stroke="#000" stroke-width="9" rx="8"/>` },
    { id: "star",      title: "Star",      sides: "5 points",                        path: buildStarPath(200, 220, 150, 65, 5) },
    { id: "heart",     title: "Heart",     sides: "A symbol of love",                 path: buildHeartPath() },
    { id: "diamond",   title: "Diamond",   sides: "4 sides like a square on its tip", path: `<polygon points="200,70 355,230 200,390 45,230" fill="none" stroke="#000" stroke-width="9" stroke-linejoin="round"/>` },
    { id: "hexagon",   title: "Hexagon",   sides: "6 sides",                         path: buildPolygonPath(200, 225, 155, 6) },
    { id: "pentagon",  title: "Pentagon",  sides: "5 sides",                         path: buildPolygonPath(200, 225, 155, 5, -Math.PI / 2) },
    { id: "oval",      title: "Oval",      sides: "Like a stretched circle",          path: `<ellipse cx="200" cy="225" rx="165" ry="115" fill="none" stroke="#000" stroke-width="9"/>` },
  ];

  const sheets: SheetMeta[] = [];

  for (const shape of shapes) {
    // Add decorative dots inside the shape outline area
    const patternDots = Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const cx = 200 + Math.cos(angle) * 55;
      const cy = 225 + Math.sin(angle) * 40;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="7" fill="none" stroke="#000" stroke-width="1.5"/>`;
    }).join("\n      ");

    const inner = shape.path + "\n      " + patternDots;
    const svg = svgWrap(400, 570, inner, shape.title, shape.sides);
    const filename = `${shape.id}.svg`;
    write(join(dir, filename), svg);
    sheets.push({ id: `shapes-${shape.id}`, theme: "shapes", title: shape.title, subtitle: shape.sides, file: `/coloring/shapes/${filename}`, ageGroup: "year1", tags: ["shapes", "geometry", "maths"] });
  }

  return sheets;
}

// ── 4. NATURE ─────────────────────────────────────────────────────────────────

function generateNature(): SheetMeta[] {
  const dir = join(OUT_DIR, "nature");
  ensureDir(dir);
  const sheets: SheetMeta[] = [];

  const items = [
    { id: "sun",       title: "The Sun",       svg: buildSun()       },
    { id: "moon",      title: "The Moon",      svg: buildMoon()      },
    { id: "cloud",     title: "Cloud & Rain",  svg: buildCloud()     },
    { id: "flower",    title: "Sunflower",     svg: buildFlower()    },
    { id: "tree",      title: "Big Tree",      svg: buildTree()      },
    { id: "leaf",      title: "Leaf",          svg: buildLeaf()      },
    { id: "rainbow",   title: "Rainbow",       svg: buildRainbow()   },
    { id: "snowflake", title: "Snowflake",     svg: buildSnowflake() },
    { id: "butterfly", title: "Butterfly",     svg: buildButterfly() },
    { id: "mountain",  title: "Mountains",     svg: buildMountain()  },
  ];

  for (const item of items) {
    const svg = svgWrap(400, 570, item.svg, item.title, "Colour me in!");
    const filename = `${item.id}.svg`;
    write(join(dir, filename), svg);
    sheets.push({ id: `nature-${item.id}`, theme: "nature", title: item.title, subtitle: "Colour me in!", file: `/coloring/nature/${filename}`, ageGroup: "year1", tags: ["nature", "science"] });
  }

  return sheets;
}

// ── 5. OCEAN ──────────────────────────────────────────────────────────────────

function generateOcean(): SheetMeta[] {
  const dir = join(OUT_DIR, "ocean");
  ensureDir(dir);
  const sheets: SheetMeta[] = [];

  const items = [
    { id: "fish",      title: "Tropical Fish",  svg: buildFish()       },
    { id: "whale",     title: "Humpback Whale", svg: buildWhale()      },
    { id: "octopus",   title: "Octopus",        svg: buildOctopus()    },
    { id: "crab",      title: "Crab",           svg: buildCrab()       },
    { id: "shell",     title: "Seashell",       svg: buildShell()      },
    { id: "seahorse",  title: "Seahorse",       svg: buildSeahorse()   },
    { id: "dolphin",   title: "Dolphin",        svg: buildDolphin()    },
    { id: "starfish",  title: "Starfish",       svg: buildStarfish()   },
    { id: "turtle",    title: "Sea Turtle",     svg: buildTurtle()     },
    { id: "submarine", title: "Submarine",      svg: buildSubmarine()  },
  ];

  for (const item of items) {
    const svg = svgWrap(400, 570, item.svg, item.title, "Deep sea adventure!");
    const filename = `${item.id}.svg`;
    write(join(dir, filename), svg);
    sheets.push({ id: `ocean-${item.id}`, theme: "ocean", title: item.title, subtitle: "Deep sea adventure!", file: `/coloring/ocean/${filename}`, ageGroup: "year1", tags: ["ocean", "animals", "science"] });
  }

  return sheets;
}

// ── 6. SPACE ──────────────────────────────────────────────────────────────────

function generateSpace(): SheetMeta[] {
  const dir = join(OUT_DIR, "space");
  ensureDir(dir);
  const sheets: SheetMeta[] = [];

  const items = [
    { id: "rocket",     title: "Rocket Ship",   svg: buildRocket()    },
    { id: "planet",     title: "Planet Saturn", svg: buildSaturn()    },
    { id: "moon",       title: "The Moon",      svg: buildSpaceMoon() },
    { id: "astronaut",  title: "Astronaut",     svg: buildAstronaut() },
    { id: "stars",      title: "Star Cluster",  svg: buildStarCluster() },
    { id: "ufo",        title: "UFO",           svg: buildUFO()       },
    { id: "comet",      title: "Comet",         svg: buildComet()     },
    { id: "telescope",  title: "Telescope",     svg: buildTelescope() },
    { id: "earth",      title: "Planet Earth",  svg: buildEarth()     },
    { id: "milkyway",   title: "Milky Way",     svg: buildMilkyWay()  },
  ];

  for (const item of items) {
    const svg = svgWrap(400, 570, item.svg, item.title, "Blast off! 🚀");
    const filename = `${item.id}.svg`;
    write(join(dir, filename), svg);
    sheets.push({ id: `space-${item.id}`, theme: "space", title: item.title, subtitle: "Blast off!", file: `/coloring/space/${filename}`, ageGroup: "year2", tags: ["space", "science", "planets"] });
  }

  return sheets;
}

// ── 7. PATTERNS (Aboriginal-inspired dot art & mandala) ───────────────────────

function generatePatterns(): SheetMeta[] {
  const dir = join(OUT_DIR, "patterns");
  ensureDir(dir);
  const sheets: SheetMeta[] = [];

  for (let i = 1; i <= 10; i++) {
    const inner = buildMandalaPattern(i);
    const svg = svgWrap(400, 570, inner, `Pattern ${i}`, "Fill each section with colour");
    const filename = `pattern-${i < 10 ? "0" + i : i}.svg`;
    write(join(dir, filename), svg);
    sheets.push({ id: `patterns-${i}`, theme: "patterns", title: `Pattern ${i}`, subtitle: "Fill with colour", file: `/coloring/patterns/${filename}`, ageGroup: "year1", tags: ["patterns", "art", "maths"] });
  }

  return sheets;
}

// ── 8. CULTURAL FRAMES (placeholders for curated artwork) ─────────────────────

function generateCulturalFrames(): SheetMeta[] {
  const dir = join(OUT_DIR, "cultural");
  ensureDir(dir);
  const sheets: SheetMeta[] = [];

  const cultures = [
    { id: "indian-taj",      title: "Taj Mahal",          region: "India",           hint: "India's most famous monument" },
    { id: "indian-peacock",  title: "Peacock",             region: "India",           hint: "India's national bird" },
    { id: "aboriginal-roo",  title: "Dreamtime Kangaroo",  region: "Aboriginal AU",   hint: "Traditional dot art style" },
    { id: "chinese-dragon",  title: "Chinese Dragon",      region: "China",           hint: "A lucky dragon" },
    { id: "chinese-panda",   title: "Giant Panda",         region: "China",           hint: "China's beloved bear" },
    { id: "african-elephant",title: "African Elephant",    region: "Africa",          hint: "The world's largest land animal" },
    { id: "hispanic-marigold",title: "Marigold Flower",   region: "Latin America",   hint: "Festival of colours" },
    { id: "european-castle", title: "Castle",              region: "Europe",          hint: "A grand medieval castle" },
    { id: "aussie-koala",    title: "Koala",               region: "Australia",       hint: "Australia's sleepy marsupial" },
    { id: "aussie-reef",     title: "Coral Reef",          region: "Australia",       hint: "Great Barrier Reef life" },
  ];

  for (const culture of cultures) {
    const inner = buildCulturalFrame(culture.title, culture.region, culture.hint);
    const svg = svgWrap(400, 570, inner, culture.title, culture.hint);
    const filename = `${culture.id}.svg`;
    write(join(dir, filename), svg);
    sheets.push({ id: `cultural-${culture.id}`, theme: "cultural", title: culture.title, subtitle: culture.hint, file: `/coloring/cultural/${filename}`, ageGroup: "year2", tags: ["culture", "world", "history"], region: culture.region });
  }

  return sheets;
}

// ── SVG shape builders ────────────────────────────────────────────────────────

function buildStarPath(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = (cx + Math.cos(angle) * r).toFixed(1);
    const y = (cy + Math.sin(angle) * r).toFixed(1);
    d += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
  }
  return `<path d="${d} Z" fill="none" stroke="#000" stroke-width="9" stroke-linejoin="round"/>`;
}

function buildPolygonPath(cx: number, cy: number, r: number, sides: number, startAngle = -Math.PI / 2): string {
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = startAngle + (i / sides) * Math.PI * 2;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
  return `<polygon points="${pts}" fill="none" stroke="#000" stroke-width="9" stroke-linejoin="round"/>`;
}

function buildHeartPath(): string {
  return `<path d="M200,370 C200,370 35,270 35,160 C35,95 85,65 135,65 C165,65 185,80 200,100 C215,80 235,65 265,65 C315,65 365,95 365,160 C365,270 200,370 200,370 Z" fill="none" stroke="#000" stroke-width="9" stroke-linejoin="round"/>`;
}

function buildSun(): string {
  let rays = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x1 = (200 + Math.cos(a) * 105).toFixed(1);
    const y1 = (210 + Math.sin(a) * 105).toFixed(1);
    const x2 = (200 + Math.cos(a) * 145).toFixed(1);
    const y2 = (210 + Math.sin(a) * 145).toFixed(1);
    rays += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="6" stroke-linecap="round"/>`;
  }
  return `${rays}<circle cx="200" cy="210" r="95" fill="none" stroke="#000" stroke-width="9"/>
  <circle cx="172" cy="195" r="10" fill="none" stroke="#000" stroke-width="3"/>
  <circle cx="228" cy="195" r="10" fill="none" stroke="#000" stroke-width="3"/>
  <path d="M170,230 Q200,255 230,230" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"/>`;
}

function buildMoon(): string {
  return `<path d="M240,100 A110,110 0 1,0 240,330 A75,75 0 1,1 240,100 Z" fill="none" stroke="#000" stroke-width="9"/>
  <circle cx="165" cy="150" r="12" fill="none" stroke="#000" stroke-width="3"/>
  <circle cx="195" cy="270" r="18" fill="none" stroke="#000" stroke-width="3"/>
  <circle cx="240" cy="200" r="9" fill="none" stroke="#000" stroke-width="3"/>`;
}

function buildCloud(): string {
  let rain = "";
  for (let i = 0; i < 7; i++) {
    const x = 95 + i * 32;
    rain += `<line x1="${x}" y1="290" x2="${x - 8}" y2="330" stroke="#000" stroke-width="4" stroke-linecap="round"/>`;
  }
  return `<path d="M90,240 Q80,175 140,170 Q155,120 210,130 Q245,95 285,130 Q330,120 335,170 Q380,175 370,240 Z" fill="none" stroke="#000" stroke-width="8"/>
  ${rain}`;
}

function buildFlower(): string {
  let petals = "";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cx = (200 + Math.cos(a) * 80).toFixed(1);
    const cy = (205 + Math.sin(a) * 80).toFixed(1);
    petals += `<ellipse cx="${cx}" cy="${cy}" rx="35" ry="22" fill="none" stroke="#000" stroke-width="5" transform="rotate(${(i / 8) * 360} ${cx} ${cy})"/>`;
  }
  return `<line x1="200" y1="345" x2="200" y2="490" stroke="#000" stroke-width="8" stroke-linecap="round"/>
  <path d="M200,420 Q160,390 145,360" fill="none" stroke="#000" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="140" cy="353" rx="22" ry="13" fill="none" stroke="#000" stroke-width="4" transform="rotate(-30 140 353)"/>
  ${petals}
  <circle cx="200" cy="205" r="42" fill="none" stroke="#000" stroke-width="8"/>`;
}

function buildTree(): string {
  return `<polygon points="200,80 330,340 70,340" fill="none" stroke="#000" stroke-width="8" stroke-linejoin="round"/>
  <polygon points="200,120 315,340 85,340" fill="none" stroke="#000" stroke-width="8" stroke-linejoin="round"/>
  <polygon points="200,160 300,340 100,340" fill="none" stroke="#000" stroke-width="8" stroke-linejoin="round"/>
  <rect x="175" y="340" width="50" height="80" rx="6" fill="none" stroke="#000" stroke-width="8"/>
  <circle cx="200" cy="95" r="18" fill="none" stroke="#000" stroke-width="3"/>`;
}

function buildLeaf(): string {
  return `<path d="M200,460 Q200,460 200,460 C200,460 80,340 80,220 C80,130 140,70 200,60 C260,70 320,130 320,220 C320,340 200,460 200,460 Z" fill="none" stroke="#000" stroke-width="8"/>
  <line x1="200" y1="460" x2="200" y2="90" stroke="#000" stroke-width="5"/>
  <line x1="200" y1="200" x2="130" y2="150" stroke="#000" stroke-width="3.5"/>
  <line x1="200" y1="200" x2="270" y2="150" stroke="#000" stroke-width="3.5"/>
  <line x1="200" y1="280" x2="145" y2="250" stroke="#000" stroke-width="3.5"/>
  <line x1="200" y1="280" x2="255" y2="250" stroke="#000" stroke-width="3.5"/>`;
}

function buildRainbow(): string {
  const arcs = [150, 130, 110, 90, 70].map((r, i) =>
    `<path d="M${200 - r},280 A${r},${r} 0 0,1 ${200 + r},280" fill="none" stroke="#000" stroke-width="18"/>`
  ).join("\n  ");
  return `${arcs}
  <circle cx="95" cy="300" r="30" fill="none" stroke="#000" stroke-width="6"/>
  <circle cx="305" cy="300" r="30" fill="none" stroke="#000" stroke-width="6"/>
  <text x="200" y="380" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#000">Each stripe is a different colour!</text>`;
}

function buildSnowflake(): string {
  let arms = "";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x2 = (200 + Math.cos(a) * 145).toFixed(1);
    const y2 = (215 + Math.sin(a) * 145).toFixed(1);
    const mx = (200 + Math.cos(a) * 80).toFixed(1);
    const my = (215 + Math.sin(a) * 80).toFixed(1);
    const bx1 = (200 + Math.cos(a + 0.6) * 105).toFixed(1);
    const by1 = (215 + Math.sin(a + 0.6) * 105).toFixed(1);
    const bx2 = (200 + Math.cos(a - 0.6) * 105).toFixed(1);
    const by2 = (215 + Math.sin(a - 0.6) * 105).toFixed(1);
    arms += `<line x1="200" y1="215" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="6" stroke-linecap="round"/>
    <line x1="${mx}" y1="${my}" x2="${bx1}" y2="${by1}" stroke="#000" stroke-width="4" stroke-linecap="round"/>
    <line x1="${mx}" y1="${my}" x2="${bx2}" y2="${by2}" stroke="#000" stroke-width="4" stroke-linecap="round"/>`;
  }
  return `${arms}<circle cx="200" cy="215" r="14" fill="none" stroke="#000" stroke-width="5"/>`;
}

function buildButterfly(): string {
  return `<path d="M200,210 Q120,100 80,150 Q40,200 80,260 Q120,320 200,270 Z" fill="none" stroke="#000" stroke-width="7"/>
  <path d="M200,210 Q280,100 320,150 Q360,200 320,260 Q280,320 200,270 Z" fill="none" stroke="#000" stroke-width="7"/>
  <path d="M200,230 Q150,280 130,360 Q140,390 160,370 Q185,340 200,350 Q215,340 240,370 Q260,390 270,360 Q250,280 200,230 Z" fill="none" stroke="#000" stroke-width="7"/>
  <ellipse cx="200" cy="240" rx="10" ry="70" fill="none" stroke="#000" stroke-width="6"/>
  <line x1="195" y1="180" x2="165" y2="130" stroke="#000" stroke-width="4" stroke-linecap="round"/>
  <line x1="205" y1="180" x2="235" y2="130" stroke="#000" stroke-width="4" stroke-linecap="round"/>
  <circle cx="163" cy="126" r="6" fill="none" stroke="#000" stroke-width="3"/>
  <circle cx="237" cy="126" r="6" fill="none" stroke="#000" stroke-width="3"/>`;
}

function buildMountain(): string {
  return `<polygon points="100,420 200,100 300,420" fill="none" stroke="#000" stroke-width="8" stroke-linejoin="round"/>
  <polygon points="30,420 130,200 230,420" fill="none" stroke="#000" stroke-width="6" stroke-linejoin="round"/>
  <polygon points="170,420 270,220 370,420" fill="none" stroke="#000" stroke-width="6" stroke-linejoin="round"/>
  <path d="M175,150 Q200,105 225,150" fill="none" stroke="#000" stroke-width="5"/>
  <line x1="30" y1="420" x2="370" y2="420" stroke="#000" stroke-width="5"/>
  <circle cx="320" cy="115" r="28" fill="none" stroke="#000" stroke-width="5"/>
  <!-- Sun rays -->
  <line x1="320" y1="80" x2="320" y2="70" stroke="#000" stroke-width="3" stroke-linecap="round"/>
  <line x1="344" y1="91" x2="351" y2="84" stroke="#000" stroke-width="3" stroke-linecap="round"/>
  <line x1="355" y1="115" x2="365" y2="115" stroke="#000" stroke-width="3" stroke-linecap="round"/>`;
}

// Ocean creatures
function buildFish(): string {
  return `<path d="M320,215 Q360,180 380,215 Q360,250 320,215 Z" fill="none" stroke="#000" stroke-width="6"/>
  <ellipse cx="200" cy="215" rx="130" ry="70" fill="none" stroke="#000" stroke-width="8"/>
  <circle cx="255" cy="200" r="12" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="259" cy="196" r="4" fill="#000"/>
  <!-- scales -->
  <path d="M180,215 Q195,200 210,215" fill="none" stroke="#000" stroke-width="3"/>
  <path d="M160,215 Q175,200 190,215" fill="none" stroke="#000" stroke-width="3"/>
  <path d="M170,235 Q185,220 200,235" fill="none" stroke="#000" stroke-width="3"/>
  <line x1="200" y1="145" x2="200" y2="165" stroke="#000" stroke-width="5"/>
  <path d="M180,165 Q200,155 220,165" fill="none" stroke="#000" stroke-width="5"/>`;
}

function buildWhale(): string {
  return `<path d="M60,250 Q60,150 200,150 Q340,150 340,230 Q340,300 250,310 Q200,315 150,310 Q80,305 60,250 Z" fill="none" stroke="#000" stroke-width="8"/>
  <path d="M60,255 Q30,290 25,320 Q50,310 60,275" fill="none" stroke="#000" stroke-width="7"/>
  <path d="M60,245 Q30,215 25,185 Q50,195 60,225" fill="none" stroke="#000" stroke-width="7"/>
  <circle cx="285" cy="195" r="14" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="290" cy="190" r="5" fill="#000"/>
  <path d="M160,280 Q200,295 240,280" fill="none" stroke="#000" stroke-width="4"/>
  <path d="M200,152 Q210,110 220,95" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>`;
}

function buildOctopus(): string {
  let arms = "";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 2;
    const cx1 = (200 + Math.cos(a - 0.3) * 70).toFixed(1);
    const cy1 = (260 + Math.sin(a - 0.3) * 50).toFixed(1);
    const cx2 = (200 + Math.cos(a) * 140).toFixed(1);
    const cy2 = (260 + Math.sin(a) * 130).toFixed(1);
    const ex = (200 + Math.cos(a + 0.2) * 160).toFixed(1);
    const ey = (260 + Math.sin(a + 0.2) * 150).toFixed(1);
    arms += `<path d="M${cx1},${cy1} Q${cx2},${cy2} ${ex},${ey}" fill="none" stroke="#000" stroke-width="14" stroke-linecap="round"/>`;
  }
  return `${arms}
  <ellipse cx="200" cy="210" rx="80" ry="65" fill="none" stroke="#000" stroke-width="8"/>
  <circle cx="178" cy="198" r="14" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="222" cy="198" r="14" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="183" cy="193" r="6" fill="#000"/>
  <circle cx="227" cy="193" r="6" fill="#000"/>
  <path d="M185,225 Q200,238 215,225" fill="none" stroke="#000" stroke-width="4"/>`;
}

function buildCrab(): string {
  return `<ellipse cx="200" cy="250" rx="85" ry="60" fill="none" stroke="#000" stroke-width="8"/>
  <!-- Claws -->
  <path d="M115,230 Q80,200 55,210 Q45,235 60,250 Q75,260 90,245" fill="none" stroke="#000" stroke-width="7"/>
  <path d="M285,230 Q320,200 345,210 Q355,235 340,250 Q325,260 310,245" fill="none" stroke="#000" stroke-width="7"/>
  <!-- Legs -->
  <line x1="135" y1="270" x2="100" y2="320" stroke="#000" stroke-width="6" stroke-linecap="round"/>
  <line x1="155" y1="295" x2="130" y2="345" stroke="#000" stroke-width="6" stroke-linecap="round"/>
  <line x1="245" y1="270" x2="280" y2="320" stroke="#000" stroke-width="6" stroke-linecap="round"/>
  <line x1="265" y1="295" x2="290" y2="345" stroke="#000" stroke-width="6" stroke-linecap="round"/>
  <!-- Eyes -->
  <circle cx="170" cy="210" r="12" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="230" cy="210" r="12" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="173" cy="207" r="5" fill="#000"/>
  <circle cx="233" cy="207" r="5" fill="#000"/>`;
}

function buildShell(): string {
  return `<path d="M200,100 Q310,100 340,200 Q360,280 310,360 Q270,420 200,430 Q130,420 90,360 Q40,280 60,200 Q90,100 200,100 Z" fill="none" stroke="#000" stroke-width="8"/>
  <path d="M200,430 Q200,100 200,100" fill="none" stroke="#000" stroke-width="4"/>
  <path d="M200,150 Q270,160 300,230 Q315,280 290,340" fill="none" stroke="#000" stroke-width="3.5"/>
  <path d="M200,180 Q255,195 275,255 Q285,295 265,345" fill="none" stroke="#000" stroke-width="3"/>
  <path d="M200,150 Q130,160 100,230 Q85,280 110,340" fill="none" stroke="#000" stroke-width="3.5"/>`;
}

function buildSeahorse(): string {
  return `<path d="M200,100 Q240,100 250,140 Q260,180 240,200 Q260,220 255,260 Q245,310 220,350 Q200,390 195,420 Q185,390 175,350 Q155,310 145,260 Q140,220 160,200 Q140,180 150,140 Q160,100 200,100 Z" fill="none" stroke="#000" stroke-width="7"/>
  <circle cx="220" cy="120" r="12" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="224" cy="116" r="5" fill="#000"/>
  <path d="M240,160 Q270,155 275,170 Q270,185 240,180" fill="none" stroke="#000" stroke-width="5"/>
  <path d="M195,420 Q220,440 215,460" fill="none" stroke="#000" stroke-width="6" stroke-linecap="round"/>`;
}

function buildDolphin(): string {
  return `<path d="M340,230 Q340,165 260,155 Q180,150 110,180 Q55,210 50,250 Q55,290 110,305 Q185,320 265,305 Q340,290 340,230 Z" fill="none" stroke="#000" stroke-width="8"/>
  <path d="M340,215 Q370,185 385,195 Q380,215 340,245" fill="none" stroke="#000" stroke-width="7"/>
  <path d="M220,153 Q215,110 230,95 Q250,110 245,153" fill="none" stroke="#000" stroke-width="7"/>
  <circle cx="105" cy="235" r="13" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="109" cy="231" r="5" fill="#000"/>
  <path d="M95,265 Q120,280 140,265" fill="none" stroke="#000" stroke-width="4"/>`;
}

function buildStarfish(): string {
  return buildStarPath(200, 215, 155, 68, 5).replace("stroke-width=\"9\"", "stroke-width=\"20\"") +
    `<circle cx="200" cy="215" r="40" fill="none" stroke="#000" stroke-width="8"/>
    <circle cx="200" cy="215" r="20" fill="none" stroke="#000" stroke-width="4"/>`;
}

function buildTurtle(): string {
  return `<ellipse cx="200" cy="230" rx="115" ry="90" fill="none" stroke="#000" stroke-width="8"/>
  <!-- Shell pattern -->
  <ellipse cx="200" cy="230" rx="75" ry="58" fill="none" stroke="#000" stroke-width="4"/>
  <line x1="200" y1="172" x2="200" y2="288" stroke="#000" stroke-width="3"/>
  <line x1="127" y1="230" x2="275" y2="230" stroke="#000" stroke-width="3"/>
  <line x1="150" y1="185" x2="250" y2="275" stroke="#000" stroke-width="3"/>
  <line x1="250" y1="185" x2="150" y2="275" stroke="#000" stroke-width="3"/>
  <!-- Head -->
  <ellipse cx="200" cy="135" rx="32" ry="26" fill="none" stroke="#000" stroke-width="7"/>
  <circle cx="191" cy="128" r="7" fill="none" stroke="#000" stroke-width="3"/>
  <circle cx="209" cy="128" r="7" fill="none" stroke="#000" stroke-width="3"/>
  <!-- Flippers -->
  <ellipse cx="90" cy="190" rx="28" ry="15" fill="none" stroke="#000" stroke-width="6" transform="rotate(-30 90 190)"/>
  <ellipse cx="310" cy="190" rx="28" ry="15" fill="none" stroke="#000" stroke-width="6" transform="rotate(30 310 190)"/>
  <ellipse cx="90" cy="270" rx="25" ry="13" fill="none" stroke="#000" stroke-width="6" transform="rotate(30 90 270)"/>
  <ellipse cx="310" cy="270" rx="25" ry="13" fill="none" stroke="#000" stroke-width="6" transform="rotate(-30 310 270)"/>`;
}

function buildSubmarine(): string {
  return `<ellipse cx="200" cy="255" rx="150" ry="70" fill="none" stroke="#000" stroke-width="8"/>
  <rect x="165" y="175" width="60" height="80" rx="8" fill="none" stroke="#000" stroke-width="6"/>
  <line x1="195" y1="175" x2="195" y2="145" stroke="#000" stroke-width="6"/>
  <circle cx="195" cy="138" r="10" fill="none" stroke="#000" stroke-width="4"/>
  <path d="M350,250 L390,240 L390,270 L350,260 Z" fill="none" stroke="#000" stroke-width="6"/>
  <circle cx="155" cy="250" r="22" fill="none" stroke="#000" stroke-width="5"/>
  <circle cx="225" cy="265" r="22" fill="none" stroke="#000" stroke-width="5"/>
  <circle cx="295" cy="250" r="18" fill="none" stroke="#000" stroke-width="5"/>
  <!-- Bubbles -->
  <circle cx="365" cy="200" r="8" fill="none" stroke="#000" stroke-width="3"/>
  <circle cx="375" cy="180" r="5" fill="none" stroke="#000" stroke-width="3"/>
  <circle cx="358" cy="165" r="4" fill="none" stroke="#000" stroke-width="3"/>`;
}

// Space objects
function buildRocket(): string {
  return `<path d="M200,80 Q230,80 245,130 L260,330 Q200,350 140,330 L155,130 Q170,80 200,80 Z" fill="none" stroke="#000" stroke-width="8"/>
  <path d="M140,310 Q100,330 85,380 L140,360 Z" fill="none" stroke="#000" stroke-width="7"/>
  <path d="M260,310 Q300,330 315,380 L260,360 Z" fill="none" stroke="#000" stroke-width="7"/>
  <circle cx="200" cy="195" r="35" fill="none" stroke="#000" stroke-width="6"/>
  <ellipse cx="200" cy="360" rx="30" ry="45" fill="none" stroke="#000" stroke-width="5"/>
  <!-- Flames -->
  <path d="M175,400 Q185,440 200,430 Q215,440 225,400" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>
  <path d="M185,400 Q192,455 200,450 Q208,455 215,400" fill="none" stroke="#000" stroke-width="4"/>`;
}

function buildSaturn(): string {
  return `<ellipse cx="200" cy="220" rx="120" ry="120" fill="none" stroke="#000" stroke-width="8"/>
  <ellipse cx="200" cy="220" rx="190" ry="55" fill="none" stroke="#000" stroke-width="6"/>
  <line x1="100" y1="175" x2="130" y2="175" stroke="#fff" stroke-width="12"/>
  <line x1="270" y1="175" x2="300" y2="175" stroke="#fff" stroke-width="12"/>
  <!-- Bands on planet -->
  <path d="M100,210 Q200,205 300,210" fill="none" stroke="#000" stroke-width="3"/>
  <path d="M95,235 Q200,228 305,235" fill="none" stroke="#000" stroke-width="3"/>
  <path d="M100,260 Q200,252 300,260" fill="none" stroke="#000" stroke-width="3"/>`;
}

function buildSpaceMoon(): string {
  return `<circle cx="200" cy="210" r="155" fill="none" stroke="#000" stroke-width="9"/>
  <circle cx="140" cy="155" r="30" fill="none" stroke="#000" stroke-width="5"/>
  <circle cx="265" cy="180" r="22" fill="none" stroke="#000" stroke-width="5"/>
  <circle cx="175" cy="280" r="35" fill="none" stroke="#000" stroke-width="5"/>
  <circle cx="275" cy="280" r="18" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="155" cy="240" r="14" fill="none" stroke="#000" stroke-width="4"/>`;
}

function buildAstronaut(): string {
  return `<ellipse cx="200" cy="145" rx="55" ry="58" fill="none" stroke="#000" stroke-width="8"/>
  <rect x="140" y="195" width="120" height="130" rx="20" fill="none" stroke="#000" stroke-width="8"/>
  <rect x="155" y="205" width="90" height="60" rx="8" fill="none" stroke="#000" stroke-width="5"/>
  <!-- Arms -->
  <path d="M140,220 Q95,235 80,280 Q90,300 110,285 Q125,255 150,250" fill="none" stroke="#000" stroke-width="10" stroke-linecap="round"/>
  <path d="M260,220 Q305,235 320,280 Q310,300 290,285 Q275,255 250,250" fill="none" stroke="#000" stroke-width="10" stroke-linecap="round"/>
  <!-- Legs -->
  <line x1="170" y1="325" x2="160" y2="410" stroke="#000" stroke-width="10" stroke-linecap="round"/>
  <line x1="230" y1="325" x2="240" y2="410" stroke="#000" stroke-width="10" stroke-linecap="round"/>
  <ellipse cx="160" cy="415" rx="22" ry="12" fill="none" stroke="#000" stroke-width="6"/>
  <ellipse cx="240" cy="415" rx="22" ry="12" fill="none" stroke="#000" stroke-width="6"/>
  <!-- Visor -->
  <ellipse cx="200" cy="142" rx="33" ry="35" fill="none" stroke="#000" stroke-width="4"/>
  <!-- Flag patch -->
  <rect x="148" y="215" width="28" height="18" rx="2" fill="none" stroke="#000" stroke-width="3"/>`;
}

function buildStarCluster(): string {
  const stars = [
    [200, 130, 40, 18], [310, 160, 30, 13], [100, 175, 28, 12],
    [155, 270, 34, 15], [270, 280, 26, 11], [200, 340, 22, 10],
    [80,  310, 20, 9],  [330, 320, 24, 11], [185, 195, 18, 8],
  ];
  return stars.map(([cx, cy, r, ir]) =>
    buildStarPath(cx, cy, r, ir, 5).replace("stroke-width=\"9\"", "stroke-width=\"5\"")
  ).join("\n  ");
}

function buildUFO(): string {
  return `<ellipse cx="200" cy="245" rx="155" ry="50" fill="none" stroke="#000" stroke-width="8"/>
  <path d="M120,245 Q120,170 200,165 Q280,170 280,245" fill="none" stroke="#000" stroke-width="8"/>
  <ellipse cx="200" cy="188" rx="50" ry="38" fill="none" stroke="#000" stroke-width="5"/>
  <!-- Lights -->
  <circle cx="120" cy="255" r="12" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="160" cy="268" r="12" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="200" cy="272" r="12" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="240" cy="268" r="12" fill="none" stroke="#000" stroke-width="4"/>
  <circle cx="280" cy="255" r="12" fill="none" stroke="#000" stroke-width="4"/>
  <!-- Beam -->
  <path d="M155,295 L100,410 M245,295 L300,410" stroke="#000" stroke-width="4" stroke-dasharray="8,6"/>`;
}

function buildComet(): string {
  return `<circle cx="280" cy="140" r="55" fill="none" stroke="#000" stroke-width="8"/>
  <path d="M240,180 Q160,230 80,290 Q120,280 145,310 Q130,280 170,295 Q155,265 200,280" fill="none" stroke="#000" stroke-width="5"/>
  <path d="M240,185 Q150,255 50,320 Q95,305 115,335 Q100,305 140,315 Q125,285 170,300" fill="none" stroke="#000" stroke-width="4" opacity="0.7"/>
  <circle cx="280" cy="140" r="28" fill="none" stroke="#000" stroke-width="4"/>`;
}

function buildTelescope(): string {
  return `<rect x="100" y="195" width="220" height="75" rx="37" fill="none" stroke="#000" stroke-width="8" transform="rotate(-25 200 232)"/>
  <ellipse cx="95" cy="254" rx="20" ry="35" fill="none" stroke="#000" stroke-width="7" transform="rotate(-25 95 254)"/>
  <ellipse cx="315" cy="196" rx="14" ry="26" fill="none" stroke="#000" stroke-width="7" transform="rotate(-25 315 196)"/>
  <!-- Tripod -->
  <line x1="200" y1="280" x2="200" y2="380" stroke="#000" stroke-width="8" stroke-linecap="round"/>
  <line x1="200" y1="380" x2="130" y2="480" stroke="#000" stroke-width="7" stroke-linecap="round"/>
  <line x1="200" y1="380" x2="270" y2="480" stroke="#000" stroke-width="7" stroke-linecap="round"/>
  <!-- Stars being viewed -->
  <path d="M320,130 L325,115 L330,130 L345,130 L333,140 L338,155 L325,145 L312,155 L317,140 L305,130 Z" fill="none" stroke="#000" stroke-width="3"/>`;
}

function buildEarth(): string {
  return `<circle cx="200" cy="210" r="155" fill="none" stroke="#000" stroke-width="9"/>
  <!-- Rough continents as blobs -->
  <path d="M155,100 Q195,85 230,110 Q260,130 265,175 Q255,210 230,220 Q210,235 185,225 Q155,215 140,185 Q125,155 155,100 Z" fill="none" stroke="#000" stroke-width="5"/>
  <path d="M100,200 Q115,175 140,185 Q155,215 140,245 Q120,260 100,245 Q80,225 100,200 Z" fill="none" stroke="#000" stroke-width="5"/>
  <path d="M210,250 Q240,240 260,265 Q270,290 250,310 Q225,325 205,310 Q185,295 210,250 Z" fill="none" stroke="#000" stroke-width="5"/>
  <!-- Equator and meridian lines -->
  <line x1="45" y1="210" x2="355" y2="210" stroke="#000" stroke-width="2.5" stroke-dasharray="5,4"/>
  <ellipse cx="200" cy="210" rx="155" ry="55" fill="none" stroke="#000" stroke-width="2.5" stroke-dasharray="5,4"/>`;
}

function buildMilkyWay(): string {
  let stars = "";
  // Deterministic "random" star positions using a simple LCG
  let seed = 42;
  for (let i = 0; i < 60; i++) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    const x = 30 + (seed % 340);
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    const y = 50 + (seed % 430);
    const r = 2 + (i % 4);
    stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#000" stroke-width="1.5"/>`;
  }
  return `${stars}
  <!-- Galaxy spiral hints -->
  <path d="M200,250 Q280,180 320,200 Q360,220 340,270 Q310,330 240,340 Q160,350 120,300 Q70,240 110,180 Q150,120 220,130" fill="none" stroke="#000" stroke-width="3" stroke-dasharray="4,4"/>`;
}

function buildMandalaPattern(variant: number): string {
  const rings = 4 + (variant % 3);
  let paths = "";
  for (let ring = 1; ring <= rings; ring++) {
    const r = ring * 38;
    const segments = 6 + ring * 2;
    paths += `<circle cx="200" cy="225" r="${r}" fill="none" stroke="#000" stroke-width="${ring === 1 ? 4 : 2}"/>`;
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const x1 = (200 + Math.cos(a) * (r - 18)).toFixed(1);
      const y1 = (225 + Math.sin(a) * (r - 18)).toFixed(1);
      const x2 = (200 + Math.cos(a) * r).toFixed(1);
      const y2 = (225 + Math.sin(a) * r).toFixed(1);
      if (ring % 2 === 0) {
        const mr = r - 9;
        const mx = (200 + Math.cos(a) * mr).toFixed(1);
        const my = (225 + Math.sin(a) * mr).toFixed(1);
        paths += `<circle cx="${mx}" cy="${my}" r="${4 + variant % 3}" fill="none" stroke="#000" stroke-width="1.5"/>`;
      } else {
        paths += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="2"/>`;
      }
    }
  }
  paths += `<circle cx="200" cy="225" r="12" fill="none" stroke="#000" stroke-width="3"/>`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bx = (200 + Math.cos(a) * 8).toFixed(1);
    const by = (225 + Math.sin(a) * 8).toFixed(1);
    paths += `<circle cx="${bx}" cy="${by}" r="3" fill="#000"/>`;
  }
  return paths;
}

function buildCulturalFrame(title: string, region: string, hint: string): string {
  // Decorative border + placeholder centre for cultural art to be dropped in
  let border = "";
  for (let i = 0; i < 16; i++) {
    const x = 30 + i * 22;
    border += `<circle cx="${x}" cy="48" r="7" fill="none" stroke="#000" stroke-width="2"/>
    <circle cx="${x}" cy="522" r="7" fill="none" stroke="#000" stroke-width="2"/>`;
  }
  for (let i = 0; i < 10; i++) {
    const y = 70 + i * 43;
    border += `<circle cx="38" cy="${y}" r="7" fill="none" stroke="#000" stroke-width="2"/>
    <circle cx="362" cy="${y}" r="7" fill="none" stroke="#000" stroke-width="2"/>`;
  }
  return `${border}
  <!-- Placeholder for curated artwork -->
  <rect x="60" y="80" width="280" height="360" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="8,4" rx="8"/>
  <text x="200" y="250" font-family="Arial, sans-serif" font-size="15" text-anchor="middle" fill="#999">🎨</text>
  <text x="200" y="272" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#bbb">${region}</text>
  <text x="200" y="292" font-family="Arial, sans-serif" font-size="11" text-anchor="middle" fill="#ccc">Add free SVG from</text>
  <text x="200" y="308" font-family="Arial, sans-serif" font-size="11" text-anchor="middle" fill="#ccc">commons.wikimedia.org</text>`;
}

// ── Manifest ──────────────────────────────────────────────────────────────────

interface SheetMeta {
  id: string;
  theme: string;
  title: string;
  subtitle: string;
  file: string;
  ageGroup: string;
  tags: string[];
  region?: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🎨  KidLearn Coloring Sheet Generator");
  console.log("─────────────────────────────────────");
  console.log("Cost: $0.00 (all programmatic SVG)\n");

  ensureDir(OUT_DIR);

  const all: SheetMeta[] = [
    ...generateAlphabet(),
    ...generateNumbers(),
    ...generateShapes(),
    ...generateNature(),
    ...generateOcean(),
    ...generateSpace(),
    ...generatePatterns(),
    ...generateCulturalFrames(),
  ];

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalSheets: all.length,
    themes: [...new Set(all.map((s) => s.theme))],
    sheets: all,
  };

  write(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`\n✅  Generated ${all.length} coloring sheets across ${manifest.themes.length} themes`);
  console.log(`    Themes: ${manifest.themes.join(", ")}`);
  console.log(`\n📄  Run the app and visit /coloring to browse and print`);
  console.log(`💡  Cultural frames are placeholders — drop SVG files into public/coloring/cultural/`);
  console.log(`    Free source: commons.wikimedia.org (search "coloring page" + country)\n`);
}

main().catch((err) => {
  console.error("Generator failed:", err);
  process.exit(1);
});
