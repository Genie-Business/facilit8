-- CreateTable
CREATE TABLE "MarketingPageContent" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPageContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPageContent_page_key" ON "MarketingPageContent"("page");
