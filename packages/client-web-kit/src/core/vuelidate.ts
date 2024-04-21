/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/core-kit';
import type { Validation } from '@vuelidate/core';
import { helpers } from '@vuelidate/validators';
import type { Ref } from 'vue';

export enum VuelidateCustomRuleKey {
    ALPHA_NUM_HYPHEN_UNDERSCORE = 'alphaNumHyphenUnderscore',
    ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE = 'alphaUpperNumHyphenUnderscore',
}

export const VuelidateCustomRule = {
    [VuelidateCustomRuleKey.ALPHA_NUM_HYPHEN_UNDERSCORE]: helpers.regex(/^[a-z0-9-_]*$/),
    [VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE]: helpers.regex(/^[a-zA-Z0-9-_]*$/),
};

export function extractVuelidateResultsFromChild(vuelidate: Ref<Validation>, child: string, keys?: string[]) {
    const childResults = vuelidate.value.$getResultsForChild(child);
    if (!childResults) {
        return {};
    }

    const childKeys = keys ?? Object.keys(childResults)
        .filter((key) => !key.startsWith('$'));

    const result : Record<string, any> = {};
    for (let i = 0; i < childKeys.length; i++) {
        if (hasOwnProperty(childResults, childKeys[i])) {
            result[childKeys[i]] = (childResults[childKeys[i]] as { $model: Record<string, any> }).$model;
        }
    }

    return result;
}
