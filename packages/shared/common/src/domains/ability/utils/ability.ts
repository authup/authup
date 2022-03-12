/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Subject } from '@casl/ability';
import { pascalCase } from 'change-case';

/**
 * Transform string subject from camel-, or snake-case to
 * pascal-case.
 *
 * @param subject
 */
export function transformAbilityStringSubject(subject: Subject) : Subject {
    if (typeof subject === 'string') {
        return pascalCase(subject);
    }

    return subject;
}
