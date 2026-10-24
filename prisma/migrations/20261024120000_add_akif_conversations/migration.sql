-- CreateTable
CREATE TABLE "AkifConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AkifConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AkifChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "turn" JSONB,
    "card" JSONB,
    "channel" TEXT NOT NULL DEFAULT 'text',
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AkifChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AkifConversation_userId_lastMessageAt_idx" ON "AkifConversation"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "AkifChatMessage_conversationId_createdAt_idx" ON "AkifChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AkifChatMessage_conversationId_clientId_key" ON "AkifChatMessage"("conversationId", "clientId");

-- AddForeignKey
ALTER TABLE "AkifConversation" ADD CONSTRAINT "AkifConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AkifChatMessage" ADD CONSTRAINT "AkifChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AkifConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

