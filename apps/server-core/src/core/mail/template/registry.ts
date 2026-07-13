/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mfaEmailOtpMailTemplate } from './templates/mfa-email-otp.ts';
import { passwordResetMailTemplate } from './templates/password-reset.ts';
import { registrationActivationMailTemplate } from './templates/registration-activation.ts';
import type { MailTemplate } from './types.ts';
import { MailTemplateName } from './types.ts';

export const MAIL_TEMPLATE_REGISTRY: { [N in MailTemplateName]: MailTemplate<N> } = {
    [MailTemplateName.REGISTRATION_ACTIVATION]: registrationActivationMailTemplate,
    [MailTemplateName.PASSWORD_RESET]: passwordResetMailTemplate,
    [MailTemplateName.MFA_EMAIL_OTP]: mfaEmailOtpMailTemplate,
};
