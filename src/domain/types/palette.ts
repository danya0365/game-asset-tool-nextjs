// Color representation
export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface HSVColor {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

export interface ColorEntry {
  id: string;
  name?: string;
  hex: string;
  rgb: RGBColor;
  hsv: HSVColor;
}

// Palette types
export interface ColorPalette {
  id: string;
  name: string;
  description?: string;
  colors: ColorEntry[];
  createdAt: number;
  updatedAt: number;
}

// Preset palettes
export interface PresetPalette {
  id: string;
  name: string;
  description: string;
  category: "retro" | "modern" | "custom";
  colors: string[]; // hex colors
}

// Color conversion utilities
export function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(rgb: RGBColor): string {
  return (
    "#" +
    [rgb.r, rgb.g, rgb.b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

export function rgbToHsv(rgb: RGBColor): HSVColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }

  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
}

export function hsvToRgb(hsv: HSVColor): RGBColor {
  const h = hsv.h / 360;
  const s = hsv.s / 100;
  const v = hsv.v / 100;

  let r = 0,
    g = 0,
    b = 0;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function createColorEntry(hex: string, name?: string): ColorEntry {
  const rgb = hexToRgb(hex);
  const hsv = rgbToHsv(rgb);
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    hex: hex.startsWith("#") ? hex : `#${hex}`,
    rgb,
    hsv,
  };
}

// Preset game palettes
export const PRESET_PALETTES: PresetPalette[] = [
  {
    id: "nes",
    name: "NES",
    description: "Nintendo Entertainment System (54 colors)",
    category: "retro",
    colors: [
      "#7C7C7C",
      "#0000FC",
      "#0000BC",
      "#4428BC",
      "#940084",
      "#A80020",
      "#A81000",
      "#881400",
      "#503000",
      "#007800",
      "#006800",
      "#005800",
      "#004058",
      "#000000",
      "#000000",
      "#000000",
      "#BCBCBC",
      "#0078F8",
      "#0058F8",
      "#6844FC",
      "#D800CC",
      "#E40058",
      "#F83800",
      "#E45C10",
      "#AC7C00",
      "#00B800",
      "#00A800",
      "#00A844",
      "#008888",
      "#000000",
      "#000000",
      "#000000",
      "#F8F8F8",
      "#3CBCFC",
      "#6888FC",
      "#9878F8",
      "#F878F8",
      "#F85898",
      "#F87858",
      "#FCA044",
      "#F8B800",
      "#B8F818",
      "#58D854",
      "#58F898",
      "#00E8D8",
      "#787878",
      "#000000",
      "#000000",
      "#FCFCFC",
      "#A4E4FC",
      "#B8B8F8",
      "#D8B8F8",
      "#F8B8F8",
      "#F8A4C0",
      "#F0D0B0",
      "#FCE0A8",
      "#F8D878",
      "#D8F878",
      "#B8F8B8",
      "#B8F8D8",
      "#00FCFC",
      "#F8D8F8",
      "#000000",
      "#000000",
    ],
  },
  {
    id: "gameboy",
    name: "Game Boy",
    description: "Original Game Boy (4 colors)",
    category: "retro",
    colors: ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"],
  },
  {
    id: "gameboy-pocket",
    name: "Game Boy Pocket",
    description: "Game Boy Pocket (4 colors)",
    category: "retro",
    colors: ["#000000", "#555555", "#AAAAAA", "#FFFFFF"],
  },
  {
    id: "snes",
    name: "SNES",
    description: "Super Nintendo - Common colors",
    category: "retro",
    colors: [
      "#000000",
      "#FFFFFF",
      "#FF0000",
      "#00FF00",
      "#0000FF",
      "#FFFF00",
      "#FF00FF",
      "#00FFFF",
      "#800000",
      "#008000",
      "#000080",
      "#808000",
      "#800080",
      "#008080",
      "#C0C0C0",
      "#808080",
    ],
  },
  {
    id: "pico8",
    name: "PICO-8",
    description: "PICO-8 Fantasy Console (16 colors)",
    category: "retro",
    colors: [
      "#000000",
      "#1D2B53",
      "#7E2553",
      "#008751",
      "#AB5236",
      "#5F574F",
      "#C2C3C7",
      "#FFF1E8",
      "#FF004D",
      "#FFA300",
      "#FFEC27",
      "#00E436",
      "#29ADFF",
      "#83769C",
      "#FF77A8",
      "#FFCCAA",
    ],
  },
  {
    id: "commodore64",
    name: "Commodore 64",
    description: "Commodore 64 (16 colors)",
    category: "retro",
    colors: [
      "#000000",
      "#FFFFFF",
      "#880000",
      "#AAFFEE",
      "#CC44CC",
      "#00CC55",
      "#0000AA",
      "#EEEE77",
      "#DD8855",
      "#664400",
      "#FF7777",
      "#333333",
      "#777777",
      "#AAFF66",
      "#0088FF",
      "#BBBBBB",
    ],
  },
  {
    id: "cga",
    name: "CGA",
    description: "IBM CGA Mode 4 Palette 1 (4 colors)",
    category: "retro",
    colors: ["#000000", "#55FFFF", "#FF55FF", "#FFFFFF"],
  },
  {
    id: "sweetie16",
    name: "Sweetie 16",
    description: "Modern pixel art palette (16 colors)",
    category: "modern",
    colors: [
      "#1A1C2C",
      "#5D275D",
      "#B13E53",
      "#EF7D57",
      "#FFCD75",
      "#A7F070",
      "#38B764",
      "#257179",
      "#29366F",
      "#3B5DC9",
      "#41A6F6",
      "#73EFF7",
      "#F4F4F4",
      "#94B0C2",
      "#566C86",
      "#333C57",
    ],
  },
  {
    id: "endesga32",
    name: "ENDESGA 32",
    description: "Popular pixel art palette (32 colors)",
    category: "modern",
    colors: [
      "#BE4A2F",
      "#D77643",
      "#EAD4AA",
      "#E4A672",
      "#B86F50",
      "#733E39",
      "#3E2731",
      "#A22633",
      "#E43B44",
      "#F77622",
      "#FEAE34",
      "#FEE761",
      "#63C74D",
      "#3E8948",
      "#265C42",
      "#193C3E",
      "#124E89",
      "#0099DB",
      "#2CE8F5",
      "#FFFFFF",
      "#C0CBDC",
      "#8B9BB4",
      "#5A6988",
      "#3A4466",
      "#262B44",
      "#181425",
      "#FF0044",
      "#68386C",
      "#B55088",
      "#F6757A",
      "#E8B796",
      "#C28569",
    ],
  },
];

export const DEFAULT_PALETTE: ColorPalette = {
  id: "default",
  name: "My Palette",
  description: "Custom color palette",
  colors: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
