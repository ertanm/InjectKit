-- Add tokenVersion column for JWT revocation support.
-- Incrementing this value invalidates all previously issued tokens for the user.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
