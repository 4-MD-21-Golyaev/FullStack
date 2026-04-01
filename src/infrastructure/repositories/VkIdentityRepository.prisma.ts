import { type VkIdentityRepository } from '@/application/ports/VkIdentityRepository';
import { prisma } from '../db/prismaClient';

export class PrismaVkIdentityRepository implements VkIdentityRepository {
    async findUserIdByVkUserId(vkUserId: string): Promise<string | null> {
        const record = await prisma.vkIdentity.findUnique({ where: { vkUserId } });
        return record?.userId ?? null;
    }

    async link(vkUserId: string, userId: string): Promise<void> {
        await prisma.vkIdentity.upsert({
            where: { userId },
            create: { vkUserId, userId },
            update: { vkUserId },
        });
    }

    async unlink(userId: string): Promise<void> {
        await prisma.vkIdentity.deleteMany({ where: { userId } });
    }
}
