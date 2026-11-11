/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationEventEnglish : NamespaceTranslations<`${EventName}`> = {
    [EventName.LOGIN]: 'Sign-in',
    [EventName.LOGIN_FAILED]: 'Failed sign-in',
    [EventName.LOGOUT]: 'Sign-out',
    [EventName.AUTHORIZE]: 'Application authorized',
    [EventName.AUTHORIZE_FAILED]: 'Authorization failed',
    [EventName.REFRESH_REPLAY_DETECTED]: 'Refresh token reuse detected',
    [EventName.TOKEN_EXCHANGED]: 'Token exchanged',
    [EventName.REGISTER]: 'Registration',
    [EventName.ACCOUNT_ACTIVATED]: 'Account activated',
    [EventName.PASSWORD_RESET_REQUESTED]: 'Password reset requested',
    [EventName.PASSWORD_RESET_COMPLETED]: 'Password reset completed',
    [EventName.MFA_ENROLLED]: 'Second factor added',
    [EventName.MFA_REMOVED]: 'Second factor removed',
    [EventName.MFA_VERIFIED]: 'Second factor verified',
    [EventName.MFA_CHALLENGE_FAILED]: 'Second factor failed',
    [EventName.IDENTITY_PROVIDER_LINKED]: 'Provider account linked',
    [EventName.IDENTITY_PROVIDER_UNLINKED]: 'Provider account unlinked',
    [EventName.BACKCHANNEL_LOGOUT]: 'Back-channel sign-out',
    [EventName.BACKCHANNEL_LOGOUT_FAILED]: 'Back-channel sign-out failed',
    [EventName.CLIENT_SECRET_ROTATED]: 'Client secret rotated',
    [EventName.CREATED]: 'Created',
    [EventName.UPDATED]: 'Updated',
    [EventName.DELETED]: 'Deleted',
};
