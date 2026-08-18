/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IssueCode, defineIssueItem } from '@ebec/core';
import { describe, expect, it } from 'vitest';
import { AuthupError } from '../../src';

describe('AuthupError issues', () => {
    it('should carry issues passed through the constructor', () => {
        const issue = defineIssueItem({
            code: IssueCode.REQUIRED,
            path: ['name'],
            message: 'Name is required',
        });
        const error = new AuthupError({ message: 'validation failed', issues: [issue] });

        expect(error.issues).toEqual([issue]);
    });

    it('should default issues to an empty array', () => {
        expect(new AuthupError('nope').issues).toEqual([]);
    });
});
