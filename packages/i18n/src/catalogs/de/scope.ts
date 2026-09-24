/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationScopeGerman : NamespaceTranslations<`${ScopeName}`> = {
    [ScopeName.GLOBAL]: 'Vollzugriff',
    [ScopeName.OPEN_ID]: 'OpenID-Anmeldung',
    [ScopeName.EMAIL]: 'E-Mail-Adresse',
    [ScopeName.ROLES]: 'Rollen',
    [ScopeName.IDENTITY]: 'Profil',
};
