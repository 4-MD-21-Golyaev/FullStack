export interface VkIdentityRepository {
    findUserIdByVkUserId(vkUserId: string): Promise<string | null>;
    link(vkUserId: string, userId: string): Promise<void>;
    unlink(userId: string): Promise<void>;
}
