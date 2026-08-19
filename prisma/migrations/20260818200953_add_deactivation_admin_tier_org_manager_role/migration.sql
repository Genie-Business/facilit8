-- CreateEnum
CREATE TYPE "AdminTier" AS ENUM ('SUPER_ADMIN', 'SUPPORT_ADMIN');

-- AlterEnum
ALTER TYPE "OrgMemberRole" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminTier" "AdminTier" DEFAULT 'SUPER_ADMIN',
ADD COLUMN     "deactivatedAt" TIMESTAMP(3);
