/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SystemPolicyName } from '@authup/access';
import type { NamespaceTranslations, SystemPolicyNameValue } from '../../types';

export const TranslatorTranslationPolicyGerman : NamespaceTranslations<SystemPolicyNameValue> = {
    [SystemPolicyName.DEFAULT]: 'Standardrichtlinie',
    [SystemPolicyName.IDENTITY]: 'Identitätsrichtlinie',
    [SystemPolicyName.PERMISSION_BINDING]: 'Berechtigungsbindungsrichtlinie',
    [SystemPolicyName.REALM_MATCH]: 'Organisationsabgleichsrichtlinie',
    [SystemPolicyName.CLIENT_NAMES_SELF_MANAGE]: 'Felder der Client-Selbstverwaltung',
    [SystemPolicyName.USER_NAMES_SELF_MANAGE]: 'Felder der Benutzer-Selbstverwaltung',
};
