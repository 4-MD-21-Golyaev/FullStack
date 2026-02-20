import nodemailer from 'nodemailer';

export async function sendOtpEmail(to: string, code: string): Promise<void> {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'Ваш код входа',
        text: `Ваш код подтверждения: ${code}\n\nКод действителен 10 минут.`,
        html: `<p>Ваш код подтверждения: <strong>${code}</strong></p><p>Код действителен 10 минут.</p>`,
    });
}
