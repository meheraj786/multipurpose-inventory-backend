import { prisma } from "../src/config/database"; // Import your shared prisma instance

async function main() {
  console.log("🌱 Seeding database...");

  // Using upsert ensures you don't create duplicates if you run this twice
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
    },
  });

  console.log("✅ Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
