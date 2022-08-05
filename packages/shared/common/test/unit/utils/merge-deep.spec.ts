/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasMinDepthOf } from '../../../src';

describe('src/utils/merge-deep.ts', () => {
    it('should check right depth', () => {
        let object : Record<string, any> = {
            a: {
                1: true,
            },
        };
        let depth = hasMinDepthOf(object, 1);
        expect(depth).toBeTruthy();

        depth = hasMinDepthOf({}, 1);
        expect(depth).toBeFalsy();

        object = {
            a: {
                a: {
                    b: false,
                },
            },
        };

        depth = hasMinDepthOf(object, 2);
        expect(depth).toBeTruthy();
        depth = hasMinDepthOf(object, 3);
        expect(depth).toBeFalsy();
    });
});
