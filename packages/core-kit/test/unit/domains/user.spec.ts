/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUserNameValid } from '../../../src';

describe('src/domains/user', () => {
    it('should not be a valid user name ("bot" in name)', () => {
        expect(isUserNameValid('bot123')).toBeFalsy();
    });

    it('should not be a valid user name ("system" in name)', () => {
        expect(isUserNameValid('system')).toBeFalsy();
    });
});
