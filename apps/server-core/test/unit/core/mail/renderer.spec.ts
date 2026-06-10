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

    it('should render the activation template with code and action link', () => {
        const mail = renderer.render({
            template: MailTemplateName.REGISTRATION_ACTIVATION,
            params: { code: 'abc123', url: 'https://auth.example.com/activate?token=abc123' },
        });

        expect(mail.subject).toEqual('Activate your account');
        expect(mail.html).toContain('abc123');
        expect(mail.html).toContain('https://auth.example.com/activate?token=abc123');
        expect(mail.text).toContain('abc123');
        expect(mail.text).toContain('https://auth.example.com/activate?token=abc123');
    });

    it('should omit the action link when no url is given', () => {
        const mail = renderer.render({
            template: MailTemplateName.PASSWORD_RESET,
            params: { code: 'reset-code' },
        });

        expect(mail.subject).toEqual('Reset your password');
        expect(mail.html).toContain('reset-code');
        expect(mail.html).not.toContain('<a href');
    });

    it('should localize subject + body by locale (de), narrowing BCP-47', () => {
        const mail = renderer.render({
            template: MailTemplateName.PASSWORD_RESET,
            params: { code: 'x' },
            locale: 'de-DE',
        });

        expect(mail.subject).toEqual('Passwort zurücksetzen');
    });

    it('should fall back to the default locale for unsupported languages', () => {
        const mail = renderer.render({
            template: MailTemplateName.REGISTRATION_ACTIVATION,
            params: { code: 'x' },
            locale: 'zz',
        });

        expect(mail.subject).toEqual('Activate your account');
    });

    it('should html-escape interpolated values', () => {
        const mail = renderer.render({
            template: MailTemplateName.REGISTRATION_ACTIVATION,
            params: { code: '<script>alert(1)</script>' },
        });

        expect(mail.html).not.toContain('<script>alert(1)</script>');
        expect(mail.html).toContain('&lt;script&gt;');
    });
});
