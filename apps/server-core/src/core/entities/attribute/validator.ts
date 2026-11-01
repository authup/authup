/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidatorGroup } from '@authup/kit';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { EntityAttributeInput } from './types.ts';

/**
 * The writable pair of a role or user attribute. The name is checked here,
 * before the reserved-name and preference checks, because both only match a
 * string: an array `['email']` slipped past them, and mysql stores a
 * one-element array as `email`. The value stays any JSON value: it is
 * persisted through `serialize` (#3671) and never becomes a key.
 */
export class EntityAttributeValidator extends Container<EntityAttributeInput> {
    protected override initialize() {
        super.initialize();

        const nameValidator = createValidator(z.string().trim().min(1).max(255));

        this.mount('name', { group: ValidatorGroup.CREATE }, nameValidator);
        this.mount('name', { group: ValidatorGroup.UPDATE, optional: true }, nameValidator);

        this.mount('value', { optional: true }, createValidator(z.json()));
    }
}
