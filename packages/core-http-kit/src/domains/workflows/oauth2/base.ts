/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BaseAPIContext } from '../../types-base';
import { BaseAPI } from '../../base';
import type { OAuth2APIOptions } from './types';

export type OAuth2BaseAPIContext = BaseAPIContext & {
    options?: OAuth2APIOptions
};

export class OAuth2BaseAPI extends BaseAPI {
    protected readonly options : OAuth2APIOptions;

    constructor(context: OAuth2BaseAPIContext = {}) {
        super(context);

        this.options = context.options || {};
    }
}
