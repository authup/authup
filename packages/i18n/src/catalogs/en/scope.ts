/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationScopeEnglish : NamespaceTranslations<`${ScopeName}`> = {
    [ScopeName.GLOBAL]: 'Full access',
    [ScopeName.OPEN_ID]: 'OpenID sign-in',
    [ScopeName.EMAIL]: 'Email address',
    [ScopeName.ROLES]: 'Roles',
    [ScopeName.IDENTITY]: 'Profile',
};
