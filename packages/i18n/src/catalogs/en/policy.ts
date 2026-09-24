/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SystemPolicyName } from '@authup/access';
import type { NamespaceTranslations, SystemPolicyNameValue } from '../../types';

export const TranslatorTranslationPolicyEnglish : NamespaceTranslations<SystemPolicyNameValue> = {
    [SystemPolicyName.DEFAULT]: 'Default policy',
    [SystemPolicyName.IDENTITY]: 'Identity policy',
    [SystemPolicyName.PERMISSION_BINDING]: 'Permission binding policy',
    [SystemPolicyName.REALM_MATCH]: 'Realm match policy',
    [SystemPolicyName.CLIENT_NAMES_SELF_MANAGE]: 'Fields locked from client self-management',
    [SystemPolicyName.USER_NAMES_SELF_MANAGE]: 'Fields locked from user self-management',
};
