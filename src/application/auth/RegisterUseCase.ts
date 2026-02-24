import { UserRepository } from '@/application/ports/UserRepository';
import { UserAlreadyExistsError } from '@/domain/auth/errors';

export interface RegisterInput {
    email: string;
    phone: string;
    address?: string | null;
}

export interface RegisterOutput {
    id: string;
    email: string;
}

export class RegisterUseCase {
    constructor(private userRepository: UserRepository) {}

    async execute(input: RegisterInput): Promise<RegisterOutput> {
        const existing = await this.userRepository.findByEmail(input.email);
        if (existing) throw new UserAlreadyExistsError(input.email);

        const user = await this.userRepository.create({
            email: input.email,
            phone: input.phone,
            address: input.address ?? null,
            role: 'CUSTOMER',
        });

        return { id: user.id, email: user.email };
    }
}
