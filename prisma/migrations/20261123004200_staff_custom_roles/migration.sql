CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "module" "SystemModule" NOT NULL,
    "actions" "SystemAction"[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "customRoleId" TEXT;

INSERT INTO "Role" ("id", "name", "accountId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'Legacy - ' || LEFT("email", 24) || ' - ' || "id",
    "accountId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'STAFF';

UPDATE "User" AS u
SET "customRoleId" = r."id"
FROM "Role" AS r
WHERE u."role" = 'STAFF'
  AND r."accountId" = u."accountId"
  AND r."name" = 'Legacy - ' || LEFT(u."email", 24) || ' - ' || u."id";

INSERT INTO "RolePermission" ("id", "roleId", "module", "actions", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."customRoleId", p."module", p."actions", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Permission" AS p
JOIN "User" AS u ON u."id" = p."userId"
WHERE u."role" = 'STAFF'
  AND u."customRoleId" IS NOT NULL;

DROP TABLE "Permission";

CREATE UNIQUE INDEX "Role_accountId_name_key" ON "Role"("accountId", "name");
CREATE INDEX "Role_accountId_idx" ON "Role"("accountId");
CREATE UNIQUE INDEX "RolePermission_roleId_module_key" ON "RolePermission"("roleId", "module");
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");
CREATE INDEX "User_customRoleId_idx" ON "User"("customRoleId");

ALTER TABLE "Role"
ADD CONSTRAINT "Role_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
ADD CONSTRAINT "RolePermission_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "Role"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_customRoleId_fkey"
FOREIGN KEY ("customRoleId") REFERENCES "Role"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
