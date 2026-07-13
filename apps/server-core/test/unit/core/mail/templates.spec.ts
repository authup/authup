/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LOCALES } from '@authup/i18n';
import { describe, expect, it } from 'vitest';
import { MailTemplateName, MailTemplateRenderer } from '../../../../src/core/mail/index.ts';

/**
 * Cross-locale render smoke test. Key parity inside the `authupMail`
 * namespace is enforced by `@authup/i18n`'s parity test; this verifies the
 * server-side wiring: every registered template resolves all its keys for
 * every authored locale (the renderer throws on a missing translation).
 */
describe('mail templates', () => {
    const renderer = new MailTemplateRenderer();

    const matrix = Object.values(MailTemplateName).flatMap(
        (template) => LOCALES.map((locale) => [template, locale.code] as const),
    );

    it.each(matrix)('should render %s in locale %s', async (template, locale) => {
        const mail = await renderer.render({
            template,
            params: {
                code: 'code-123',
                url: 'https://auth.example.com/path',
                expiresInMinutes: 30,
            },
            locale,
        });

        expect(mail.subject.trim().length).toBeGreaterThan(0);
        expect(mail.html).toContain(`lang="${locale}"`);
        expect(mail.html).toContain('code-123');
        expect(mail.text).toContain('code-123');

        // the email OTP template deliberately renders no action link
        if (template !== MailTemplateName.MFA_EMAIL_OTP) {
            expect(mail.html).toContain('https://auth.example.com/path');
        }
    });
});
