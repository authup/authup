/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';

/**
 * Node's default `maxHeaderSize`: a longer token cannot be presented as a
 * bearer, so it authorizes nothing. Access tokens carry the subject's role
 * names and have no size of their own to align with.
 */
export const TOKEN_REQUEST_TOKEN_MAX_LENGTH = 16384;

export class TokenRequestValidator extends Container<{ token: string }> {
    protected initialize() {
        super.initialize();

        this.mount(
            'token',
            createValidator(z.string().min(16).max(TOKEN_REQUEST_TOKEN_MAX_LENGTH)),
        );
    }
}
