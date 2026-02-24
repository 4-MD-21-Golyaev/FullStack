export interface EmailGateway {
    sendOtp(to: string, code: string): Promise<void>;
}
