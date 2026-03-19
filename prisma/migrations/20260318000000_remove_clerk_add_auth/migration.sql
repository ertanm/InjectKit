-- Remove Clerk, add email/password auth
-- Drop unique constraint on clerkId
DROP INDEX IF EXISTS "User_clerkId_key";

-- Add new columns (nullable first for existing data)
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- For existing rows: set placeholder values (user must re-register or reset)
UPDATE "User" SET
  "email" = 'migrated-' || "id" || '@temp.local',
  "passwordHash" = '$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
WHERE "email" IS NULL;

-- Make columns required
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

-- Add unique constraint on email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Drop clerkId
ALTER TABLE "User" DROP COLUMN "clerkId";
