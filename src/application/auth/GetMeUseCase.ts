import { UserRepository, UserInfo } from '@/application/ports/UserRepository';

export interface GetMeInput {
    userId: string;
}

export class GetMeUseCase {
    constructor(private userRepository: UserRepository) {}

    async execute(input: GetMeInput): Promise<UserInfo | null> {
        return this.userRepository.findById(input.userId);
    }
}
