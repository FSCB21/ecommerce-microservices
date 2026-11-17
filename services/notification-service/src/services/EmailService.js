
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

dotenv.config({
    path: resolve(currentDir, '../../../../.env')
});

class EmailService {

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });
    }

    async verifyConnection() {
        return await this.transporter.verify();
    }

    async sendNotification(notification) {
        const {
            recipient_email,
            type,
            message,
            order_id
        } = notification;

        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: recipient_email,
            subject: 'Notificación de E-commerce',
            text: message,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Notificación de E-commerce</h2>
                    <p>${message}</p>
                    <p><strong>Tipo:</strong> ${type}</p>
                    <p><strong>Pedido:</strong> ${order_id}</p>
                    <hr>
                    <small>Mensaje automático del sistema E-commerce.</small>
                </div>
            `
        };

        const result = await this.transporter.sendMail(mailOptions);

        console.log(
            `Correo enviado correctamente a ${recipient_email}`
        );

        return {
            messageId: result.messageId,
            previewUrl: nodemailer.getTestMessageUrl(result)
        };
    }
}

export default new EmailService();
