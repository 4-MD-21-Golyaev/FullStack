-- CreateTable
CREATE TABLE "VkIdentity" (
    "vkUserId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VkIdentity_pkey" PRIMARY KEY ("vkUserId")
);

-- CreateIndex
CREATE UNIQUE INDEX "VkIdentity_userId_key" ON "VkIdentity"("userId");

-- AddForeignKey
ALTER TABLE "VkIdentity" ADD CONSTRAINT "VkIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
