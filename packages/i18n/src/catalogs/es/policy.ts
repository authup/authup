/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SystemPolicyName } from '@authup/access';
import type { NamespaceTranslations, SystemPolicyNameValue } from '../../types';

export const TranslatorTranslationPolicySpanish : NamespaceTranslations<SystemPolicyNameValue> = {
    [SystemPolicyName.DEFAULT]: 'Política predeterminada',
    [SystemPolicyName.IDENTITY]: 'Política de identidad',
    [SystemPolicyName.PERMISSION_BINDING]: 'Política de vinculación de permisos',
    [SystemPolicyName.REALM_MATCH]: 'Política de coincidencia de dominio',
    [SystemPolicyName.CLIENT_NAMES_SELF_MANAGE]: 'Campos de autogestión de clientes',
    [SystemPolicyName.USER_NAMES_SELF_MANAGE]: 'Campos de autogestión de usuarios',
};
