/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidatorGroup } from '@authup/kit';
import { describe, expect, it } from 'vitest';
import { PathValidator } from '../../../../src';

describe('domains/path/validator', () => {
    const validator = new PathValidator();

    it('should canonicalize the segment name and accept a nullable parent', async () => {
        const output = await validator.run({
            name: ' Berlin ',
            parentId: null,
            realmId: '5cb2b3fa-6a3a-4f1e-9a4f-2d1f6a1b0c11',
        }, { group: ValidatorGroup.CREATE });
        expect(output.name).toBe('berlin');
        expect(output.parentId).toBeNull();
    });

    it('should refuse a slash inside the segment name', async () => {
        await expect(validator.run({ name: 'sales/berlin' }, { group: ValidatorGroup.CREATE })).rejects.toThrow();
    });

    it('should strip realmId on update and keep parentId editable', async () => {
        const output = await validator.run({ realmId: '5cb2b3fa-6a3a-4f1e-9a4f-2d1f6a1b0c11', parentId: '9a5c1d3e-2b4f-4a6c-8d7e-1f2a3b4c5d6e' }, { group: ValidatorGroup.UPDATE });
        expect(output.realmId).toBeUndefined();
        expect(output.parentId).toBe('9a5c1d3e-2b4f-4a6c-8d7e-1f2a3b4c5d6e');
    });

    it('should never accept the derived path from a caller', async () => {
        const output = await validator.run({ name: 'berlin', path: 'evil/berlin' }, { group: ValidatorGroup.CREATE });
        expect(output.path).toBeUndefined();
    });
});
