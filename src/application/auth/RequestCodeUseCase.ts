import { randomInt } from 'crypto';
import { OtpRepository } from '@/application/ports/OtpRepository';
import { EmailGateway } from '@/application/ports/EmailGateway';

export interface RequestCodeInput {
    email: string;
}

export interface RequestCodeOutput {
    ok: true;
    code?: string;
}

export class RequestCodeUseCase {
    constructor(
        private otpRepository: OtpRepository,
        private emailGateway: EmailGateway,
    ) {}

    async execute(input: RequestCodeInput): Promise<RequestCodeOutput> {
        const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await this.otpRepository.create(input.email, code, expiresAt);

        this.emailGateway.sendOtp(input.email, code).catch((err) => {
            console.error('[RequestCodeUseCase] Failed to send OTP email:', err);
        });

        const output: RequestCodeOutput = { ok: true };
        if (process.env.NODE_ENV === 'development') {
            output.code = code;
        }
        return output;
    }
}
