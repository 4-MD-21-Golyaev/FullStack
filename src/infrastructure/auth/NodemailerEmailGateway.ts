import nodemailer from 'nodemailer';
import { type EmailGateway } from '@/application/ports/EmailGateway';

export class NodemailerEmailGateway implements EmailGateway {
    private createTransporter() {
        const port = Number(process.env.SMTP_PORT ?? 465);
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: port === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendOtp(to: string, code: string): Promise<void> {
        await this.createTransporter().sendMail({
            from: process.env.SMTP_FROM,
            to,
            subject: 'Ваш код входа',
            text: `Ваш код подтверждения: ${code}\n\nКод действителен 10 минут.`,
            html: `<p>Ваш код подтверждения: <strong>${code}</strong></p><p>Код действителен 10 минут.</p>`,
        });
    }

    async sendOrderConfirmed(to: string, orderId: string, totalAmount: number): Promise<void> {
        const short = orderId.slice(0, 8).toUpperCase();
        await this.createTransporter().sendMail({
            from: process.env.SMTP_FROM,
            to,
            subject: `Заказ #${short} принят`,
            text: `Ваш заказ #${short} принят в обработку. Сумма: ${totalAmount.toLocaleString('ru')} ₽.`,
            html: `<p>Ваш заказ <strong>#${short}</strong> принят в обработку.</p><p>Сумма: <strong>${totalAmount.toLocaleString('ru')} ₽</strong>.</p>`,
        });
    }

    async sendOrderOutForDelivery(to: string, orderId: string): Promise<void> {
        const short = orderId.slice(0, 8).toUpperCase();
        await this.createTransporter().sendMail({
            from: process.env.SMTP_FROM,
            to,
            subject: `Заказ #${short} передан курьеру`,
            text: `Курьер уже в пути с вашим заказом #${short}. Ожидайте доставку.`,
            html: `<p>Курьер уже в пути с вашим заказом <strong>#${short}</strong>.</p><p>Ожидайте доставку.</p>`,
        });
    }

    async sendOrderDelivered(to: string, orderId: string): Promise<void> {
        const short = orderId.slice(0, 8).toUpperCase();
        await this.createTransporter().sendMail({
            from: process.env.SMTP_FROM,
            to,
            subject: `Заказ #${short} доставлен`,
            text: `Ваш заказ #${short} успешно доставлен. Спасибо за покупку!`,
            html: `<p>Ваш заказ <strong>#${short}</strong> успешно доставлен.</p><p>Спасибо за покупку!</p>`,
        });
    }
}
