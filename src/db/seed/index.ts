import prisma from "../../shared/utils/prisma.js";
import { seedUnits } from "./unit.seed.js";
import "dotenv/config";

const main = async () => {
  try {
    await seedUnits();
    console.log("Seeding complete.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

main();
