/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import { DecisionStrategy } from '../../../constants';
import type { RealmMatchPolicy } from './types';

export class RealmMatchPolicyValidator extends Container<RealmMatchPolicy> {
    override initialize() {
        super.initialize();

        this.mount(
            'decision_strategy',
            createValidator(
                z.enum(DecisionStrategy)
                    .or(z.null())
                    .or(z.undefined())
                    .optional(),
            ),
        );

        this.mount(
            'attribute_name',
            createValidator(
                z.string()
                    .min(3)
                    .or(z.array(z.string().min(3)))
                    .or(z.null())
                    .or(z.undefined())
                    .optional(),
            ),
        );
        this.mount(
            'attribute_name_strict',
            createValidator(
                z.boolean()
                    .or(z.null())
                    .or(z.undefined())
                    .optional(),
            ),
        );
        this.mount(
            'attribute_null_match_all',
            createValidator(
                z.boolean()
                    .or(z.null())
                    .or(z.undefined())
                    .optional(),
            ),
        );

        this.mount(
            'identity_master_match_all',
            createValidator(
                z.boolean()
                    .or(z.null())
                    .or(z.undefined())
                    .optional(),
            ),
        );

        this.mount(
            'invert',
            createValidator(
                z.boolean()
                    .or(z.null())
                    .or(z.undefined())
                    .optional(),
            ),
        );
    }
}
