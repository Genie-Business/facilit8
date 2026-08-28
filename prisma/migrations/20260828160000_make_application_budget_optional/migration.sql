-- AlterTable
ALTER TABLE "Application" ALTER COLUMN "budgetPerDelegate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MergerApplication" ALTER COLUMN "budgetPerDelegate" DROP NOT NULL;
