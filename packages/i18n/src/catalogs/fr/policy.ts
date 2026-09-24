/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SystemPolicyName } from '@authup/access';
import type { NamespaceTranslations, SystemPolicyNameValue } from '../../types';

export const TranslatorTranslationPolicyFrench : NamespaceTranslations<SystemPolicyNameValue> = {
    [SystemPolicyName.DEFAULT]: 'Politique par défaut',
    [SystemPolicyName.IDENTITY]: 'Politique d\'identité',
    [SystemPolicyName.PERMISSION_BINDING]: 'Politique de liaison des permissions',
    [SystemPolicyName.REALM_MATCH]: 'Politique de correspondance de domaine',
    [SystemPolicyName.CLIENT_NAMES_SELF_MANAGE]: 'Champs d\'autogestion des clients',
    [SystemPolicyName.USER_NAMES_SELF_MANAGE]: 'Champs d\'autogestion des utilisateurs',
};
