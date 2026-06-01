// import prisma from "../../shared/utils/prisma.js";
// import "dotenv/config";

// export const unitSeedData = [
//   // ── WEIGHT (base: g) ─────────────────────────────────────────
//   { name: "Gram", symbol: "g", group: "WEIGHT", conversionFactor: 1, isBase: true },
//   { name: "Kilogram", symbol: "kg", group: "WEIGHT", conversionFactor: 1000, isBase: false },
//   { name: "Milligram", symbol: "mg", group: "WEIGHT", conversionFactor: 0.001, isBase: false },
//   { name: "Pound", symbol: "lb", group: "WEIGHT", conversionFactor: 453.592, isBase: false },
//   { name: "Ounce", symbol: "oz", group: "WEIGHT", conversionFactor: 28.3495, isBase: false },
//   { name: "Ton", symbol: "ton", group: "WEIGHT", conversionFactor: 1000000, isBase: false },

//   // ── VOLUME (base: ml) ─────────────────────────────────────────
//   { name: "Millilitre", symbol: "ml", group: "VOLUME", conversionFactor: 1, isBase: true },
//   { name: "Litre", symbol: "l", group: "VOLUME", conversionFactor: 1000, isBase: false },
//   { name: "Centilitre", symbol: "cl", group: "VOLUME", conversionFactor: 10, isBase: false },
//   {
//     name: "Fluid Ounce",
//     symbol: "fl oz",
//     group: "VOLUME",
//     conversionFactor: 29.5735,
//     isBase: false,
//   },
//   { name: "Gallon", symbol: "gal", group: "VOLUME", conversionFactor: 3785.41, isBase: false },

//   // ── LENGTH (base: mm) ─────────────────────────────────────────
//   { name: "Millimetre", symbol: "mm", group: "LENGTH", conversionFactor: 1, isBase: true },
//   { name: "Centimetre", symbol: "cm", group: "LENGTH", conversionFactor: 10, isBase: false },
//   { name: "Metre", symbol: "m", group: "LENGTH", conversionFactor: 1000, isBase: false },
//   { name: "Kilometre", symbol: "km", group: "LENGTH", conversionFactor: 1000000, isBase: false },
//   { name: "Inch", symbol: "in", group: "LENGTH", conversionFactor: 25.4, isBase: false },
//   { name: "Foot", symbol: "ft", group: "LENGTH", conversionFactor: 304.8, isBase: false },
//   { name: "Yard", symbol: "yd", group: "LENGTH", conversionFactor: 914.4, isBase: false },

//   // ── AREA (base: sqmm) ─────────────────────────────────────────
//   { name: "Sq. Millimetre", symbol: "mm²", group: "AREA", conversionFactor: 1, isBase: true },
//   { name: "Sq. Centimetre", symbol: "cm²", group: "AREA", conversionFactor: 100, isBase: false },
//   { name: "Sq. Metre", symbol: "m²", group: "AREA", conversionFactor: 1000000, isBase: false },
//   { name: "Sq. Foot", symbol: "sqft", group: "AREA", conversionFactor: 92903.04, isBase: false },
//   { name: "Sq. Yard", symbol: "sqyd", group: "AREA", conversionFactor: 836127.36, isBase: false },

//   // ── COUNT (base: pcs) ────────────────────────────────────────
//   { name: "Piece", symbol: "pcs", group: "COUNT", conversionFactor: 1, isBase: true },
//   { name: "Dozen", symbol: "doz", group: "COUNT", conversionFactor: 12, isBase: false },
//   { name: "Gross", symbol: "gr", group: "COUNT", conversionFactor: 144, isBase: false },
//   { name: "Pair", symbol: "pair", group: "COUNT", conversionFactor: 2, isBase: false },
//   { name: "Set", symbol: "set", group: "COUNT", conversionFactor: 1, isBase: false },
//   { name: "Pack", symbol: "pack", group: "COUNT", conversionFactor: 1, isBase: false },
//   { name: "Box", symbol: "box", group: "COUNT", conversionFactor: 1, isBase: false },
//   { name: "Carton", symbol: "ctn", group: "COUNT", conversionFactor: 1, isBase: false },
//   { name: "Bundle", symbol: "bndl", group: "COUNT", conversionFactor: 1, isBase: false },
//   { name: "Roll", symbol: "roll", group: "COUNT", conversionFactor: 1, isBase: false },
//   { name: "Sheet", symbol: "sheet", group: "COUNT", conversionFactor: 1, isBase: false },
//   { name: "Bag", symbol: "bag", group: "COUNT", conversionFactor: 1, isBase: false },
// ];

// export const seedUnits = async () => {
//   prisma.$connect();
//   console.log("Seeding units...");

//   for (const unit of unitSeedData) {
//     await prisma.unit.upsert({
//       where: { symbol: unit.symbol },
//       update: {},
//       create: unit,
//     });
//   }

//   console.log(`Seeded ${unitSeedData.length} units.`);
// };
