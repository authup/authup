/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationScopeFrench : NamespaceTranslations<`${ScopeName}`> = {
    [ScopeName.GLOBAL]: 'Accès complet',
    [ScopeName.OPEN_ID]: 'Connexion OpenID',
    [ScopeName.EMAIL]: 'Adresse e-mail',
    [ScopeName.ROLES]: 'Rôles',
    [ScopeName.IDENTITY]: 'Profil',
};
