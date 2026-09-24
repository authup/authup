/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationScopeSpanish : NamespaceTranslations<`${ScopeName}`> = {
    [ScopeName.GLOBAL]: 'Acceso completo',
    [ScopeName.OPEN_ID]: 'Inicio de sesión OpenID',
    [ScopeName.EMAIL]: 'Dirección de correo electrónico',
    [ScopeName.ROLES]: 'Roles',
    [ScopeName.IDENTITY]: 'Perfil',
};
