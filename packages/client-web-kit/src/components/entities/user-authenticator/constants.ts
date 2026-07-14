/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserAuthenticatorKind } from '@authup/core-kit';

export const USER_AUTHENTICATOR_KIND_ICONS : Record<`${UserAuthenticatorKind}`, string> = {
    [UserAuthenticatorKind.TOTP]: 'fa6-solid:mobile-screen',
    [UserAuthenticatorKind.WEBAUTHN]: 'fa6-solid:fingerprint',
    [UserAuthenticatorKind.EMAIL]: 'fa6-solid:envelope',
    [UserAuthenticatorKind.RECOVERY]: 'fa6-solid:life-ring',
};
