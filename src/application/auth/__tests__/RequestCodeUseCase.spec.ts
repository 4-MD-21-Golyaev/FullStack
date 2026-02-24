import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestCodeUseCase } from '../RequestCodeUseCase';
import { OtpRepository } from '@/application/ports/OtpRepository';
import { EmailGateway } from '@/application/ports/EmailGateway';

function makeOtpRepo(): OtpRepository {
    return {
        create: vi.fn(),
        verify: vi.fn(),
    };
}

function makeEmailGateway(): EmailGateway {
    return {
        sendOtp: vi.fn().mockResolvedValue(undefined),
    };
}

describe('RequestCodeUseCase', () => {
    beforeEach(() => {
        vi.stubEnv('NODE_ENV', 'development');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('creates OTP in repo and returns code in development', async () => {
        const otpRepo = makeOtpRepo();
        const emailGw = makeEmailGateway();
        const uc = new RequestCodeUseCase(otpRepo, emailGw);

        const result = await uc.execute({ email: 'a@b.com' });

        expect(result.ok).toBe(true);
        expect(result.code).toMatch(/^\d{6}$/);
        expect(otpRepo.create).toHaveBeenCalledWith('a@b.com', expect.any(String), expect.any(Date));
    });

    it('does not return code in production', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        const uc = new RequestCodeUseCase(makeOtpRepo(), makeEmailGateway());

        const result = await uc.execute({ email: 'a@b.com' });

        expect(result.ok).toBe(true);
        expect(result).not.toHaveProperty('code');
    });

    it('calls emailGateway.sendOtp fire-and-forget', async () => {
        const emailGw = makeEmailGateway();
        const uc = new RequestCodeUseCase(makeOtpRepo(), emailGw);

        await uc.execute({ email: 'a@b.com' });
        await Promise.resolve();

        expect(emailGw.sendOtp).toHaveBeenCalledWith('a@b.com', expect.any(String));
    });
});
