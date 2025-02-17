/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isNameValid } from '../../../src';

describe('src/helpers/name', () => {
    it('should be a valid name ("-" character)', () => {
        expect(isNameValid('foo-bar')).toBeTruthy();
    });

    it('should be a valid name ("." character)', () => {
        expect(isNameValid('foo.bar')).toBeTruthy();
    });

    it('should be a valid name ("_" character)', () => {
        expect(isNameValid('foo_bar')).toBeTruthy();
    });

    it('should be a valid name (uppercase character)', () => {
        expect(isNameValid('FOO')).toBeTruthy();
    });

    it('should not be a valid name ("!" character)', () => {
        expect(isNameValid('foo!')).toBeFalsy();
    });

    it('should not be a valid name ("#" character)', () => {
        expect(isNameValid('foo#bar')).toBeFalsy();
    });
});
