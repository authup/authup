/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { MailTemplateName, MailTemplateRenderer } from '../../../../src/core/mail/index.ts';

describe('MailTemplateRenderer', () => {
    const renderer = new MailTemplateRenderer();

    it('should render the activation template with code and action link', async () => {
        const mail = await renderer.render({
            template: MailTemplateName.REGISTRATION_ACTIVATION,
            params: { code: 'abc123', url: 'https://auth.example.com/activate?token=abc123' },
        });

        expect(mail.subject).toEqual('Activate your account');
        expect(mail.html).toContain('abc123');
        expect(mail.html).toContain('https://auth.example.com/activate?token=abc123');
        expect(mail.text).toContain('abc123');
        expect(mail.text).toContain('https://auth.example.com/activate?token=abc123');
    });

    it('should include a security hint in both mail parts', async () => {
        const mail = await renderer.render({
            template: MailTemplateName.REGISTRATION_ACTIVATION,
            params: { code: 'abc123' },
        });

        expect(mail.html).toContain('you can safely ignore this email');
        expect(mail.text).toContain('you can safely ignore this email');
    });

    it('should omit the action link when no url is given', async () => {
        const mail = await renderer.render({
            template: MailTemplateName.PASSWORD_RESET,
            params: { code: 'reset-code' },
        });

        expect(mail.subject).toEqual('Reset your password');
        expect(mail.html).toContain('reset-code');
        expect(mail.html).not.toContain('<a href');
    });

    it('should render the expiry note when expiresInMinutes is given', async () => {
        const mail = await renderer.render({
            template: MailTemplateName.PASSWORD_RESET,
            params: { code: 'reset-code', expiresInMinutes: 30 },
        });

        expect(mail.html).toContain('The code expires in 30 minutes.');
        expect(mail.text).toContain('The code expires in 30 minutes.');
    });

    it('should omit the expiry note when expiresInMinutes is absent', async () => {
        const mail = await renderer.render({
            template: MailTemplateName.PASSWORD_RESET,
            params: { code: 'reset-code' },
        });

        expect(mail.html).not.toContain('expires in');
    });

    it('should localize subject + body by locale (de), narrowing BCP-47', async () => {
        const mail = await renderer.render({
            template: MailTemplateName.PASSWORD_RESET,
            params: { code: 'x' },
            locale: 'de-DE',
        });

        expect(mail.subject).toEqual('Passwort zurücksetzen');
        expect(mail.html).toContain('lang="de"');
    });

    it('should fall back to the default locale for unsupported languages', async () => {
        const mail = await renderer.render({
            template: MailTemplateName.REGISTRATION_ACTIVATION,
            params: { code: 'x' },
            locale: 'zz',
        });

        expect(mail.subject).toEqual('Activate your account');
        expect(mail.html).toContain('lang="en"');
    });

    it('should html-escape interpolated values', async () => {
        const mail = await renderer.render({
            template: MailTemplateName.REGISTRATION_ACTIVATION,
            params: { code: '<script>alert(1)</script>' },
        });

        expect(mail.html).not.toContain('<script>alert(1)</script>');
        expect(mail.html).toContain('&lt;script&gt;');
    });

    it('should escape the url so it cannot break out of the href attribute', async () => {
        const mail = await renderer.render({
            template: MailTemplateName.REGISTRATION_ACTIVATION,
            params: { code: 'x', url: 'https://auth.example.com/activate?q="onclick="alert(1)' },
        });

        expect(mail.html).not.toContain('"onclick="alert(1)');
        expect(mail.html).toContain('&quot;onclick=&quot;alert(1)');
    });

    it('should drop the action when the url is not http(s)', async () => {
        /* eslint-disable no-script-url */
        const mail = await renderer.render({
            template: MailTemplateName.REGISTRATION_ACTIVATION,
            params: { code: 'x', url: 'javascript:alert(1)' },
        });

        expect(mail.html).not.toContain('<a href');
        expect(mail.html).not.toContain('javascript:');
        expect(mail.text).not.toContain('javascript:');
        /* eslint-enable no-script-url */
    });

    it('should carry a hidden preheader for the mail client preview line', async () => {
        const mail = await renderer.render({
            template: MailTemplateName.REGISTRATION_ACTIVATION,
            params: { code: 'x' },
        });

        expect(mail.html).toContain('display:none');
        expect(mail.html).toContain('Use the code below to activate your account');
    });
});
