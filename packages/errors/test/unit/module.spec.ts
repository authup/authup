/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IssueCode, defineIssueItem } from '@ebec/core';
import { describe, expect, it } from 'vitest';
import { AuthupError, ErrorCode, LoginThrottledError } from '../../src/index.ts';

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

describe('AuthupError toJSON', () => {
    it('should keep the data payload next to the base fields', () => {
        const error = new LoginThrottledError({ retryAfter: 30 });

        expect(error.toJSON()).toMatchObject({
            name: error.name,
            code: ErrorCode.LOGIN_ATTEMPT_THROTTLED,
            retryAfter: 30,
        });
    });

    it('should not let a data key displace code, message or name', () => {
        const error = new LoginThrottledError({
            retryAfter: 30,
            data: {
                code: 'other',
                message: 'x',
                name: 'y',
            },
        });

        const output = error.toJSON();

        expect(output.code).toEqual(ErrorCode.LOGIN_ATTEMPT_THROTTLED);
        expect(output.message).toEqual(error.message);
        expect(output.name).toEqual(error.name);
        expect(output.retryAfter).toEqual(30);
    });
});
