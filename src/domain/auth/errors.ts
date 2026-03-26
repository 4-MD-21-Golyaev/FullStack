export class InvalidOtpError extends Error {
    constructor() {
        super('Invalid or expired OTP code');
        this.name = 'InvalidOtpError';
    }
}

export class UserNotFoundError extends Error {
    constructor(email: string) {
        super(`User with email "${email}" not found`);
        this.name = 'UserNotFoundError';
    }
}

export class UserAlreadyExistsError extends Error {
    constructor(email: string) {
        super(`User with email "${email}" already exists`);
        this.name = 'UserAlreadyExistsError';
    }
}

export class OtpRateLimitedError extends Error {
    constructor() {
        super('Too many OTP attempts, please request a new code');
        this.name = 'OtpRateLimitedError';
    }
}

export class InvalidRefreshTokenError extends Error {
    constructor() {
        super('Refresh token is invalid, expired, or revoked');
        this.name = 'InvalidRefreshTokenError';
    }
}

export class InvalidVkSignatureError extends Error {
    constructor() {
        super('VK launch params signature is invalid');
        this.name = 'InvalidVkSignatureError';
    }
}

export class VkIdentityNotLinkedError extends Error {
    constructor() {
        super('This VK account is not linked to any user');
        this.name = 'VkIdentityNotLinkedError';
    }
}
