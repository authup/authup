/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/access';
import { TranslatorTranslationClientKey } from '@authup/i18n';

export const POLICY_TYPE_TRANSLATION_KEYS = {
    [BuiltInPolicyType.COMPOSITE]: TranslatorTranslationClientKey.POLICY_TYPE_COMPOSITE,
    [BuiltInPolicyType.DATE]: TranslatorTranslationClientKey.POLICY_TYPE_DATE,
    [BuiltInPolicyType.TIME]: TranslatorTranslationClientKey.POLICY_TYPE_TIME,
    [BuiltInPolicyType.ATTRIBUTE_NAMES]: TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTE_NAMES,
    [BuiltInPolicyType.ATTRIBUTES]: TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTES,
    [BuiltInPolicyType.REALM_MATCH]: TranslatorTranslationClientKey.POLICY_TYPE_REALM_MATCH,
    [BuiltInPolicyType.IDENTITY]: TranslatorTranslationClientKey.POLICY_TYPE_IDENTITY,
    [BuiltInPolicyType.PERMISSION_BINDING]: TranslatorTranslationClientKey.POLICY_TYPE_PERMISSION_BINDING,
} as const;
