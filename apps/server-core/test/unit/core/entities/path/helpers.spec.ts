/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { EntityConflictError, ErrorCode } from '@authup/errors';
import { PATH_MAX_DEPTH } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ensurePath } from '../../../../../src/core/entities/path/helpers.ts';
import { createFakePath } from '../../../../utils/domains/index.ts';
import { FakePathRepository } from './fake-repository.ts';

describe('core/entities/path/helpers', () => {
    let repository: FakePathRepository;
    let realmId: string;

    beforeEach(() => {
        repository = new FakePathRepository();
        realmId = randomUUID();
    });

    it('should create the missing chain once and answer the leaf', async () => {
        const leaf = await ensurePath(repository, realmId, 'sales/berlin/east');

        expect(leaf.path).toBe('sales/berlin/east');
        expect(leaf.name).toBe('east');
        expect(leaf.realmId).toBe(realmId);

        const middle = await repository.findOneBy({
            realmId,
            path: 'sales/berlin',
        });
        expect(leaf.parentId).toBe(middle!.id);

        const root = await repository.findOneBy({
            realmId,
            path: 'sales',
        });
        expect(root!.parentId).toBeNull();
        expect(middle!.parentId).toBe(root!.id);

        expect((await repository.findManyBy({ realmId })).length).toBe(3);
    });

    it('should be idempotent', async () => {
        const first = await ensurePath(repository, realmId, 'sales/berlin/east');
        const second = await ensurePath(repository, realmId, 'sales/berlin/east');

        expect(second.id).toBe(first.id);
        expect((await repository.findManyBy({ realmId })).length).toBe(3);
    });

    it('should canonicalize and refuse a malformed path', async () => {
        expect((await ensurePath(repository, realmId, ' Sales/Berlin ')).path).toBe('sales/berlin');

        await expect(
            ensurePath(repository, realmId, '/sales'),
        ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });

        await expect(
            ensurePath(repository, realmId, 'sales//berlin'),
        ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
    });

    it('should refuse a chain deeper than the maximum depth', async () => {
        const segments : string[] = [];
        for (let i = 0; i < PATH_MAX_DEPTH + 1; i++) {
            segments.push(`s${i}`);
        }

        await expect(
            ensurePath(repository, realmId, segments.join('/')),
        ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });

        expect((await repository.findManyBy({ realmId })).length).toBe(0);
    });

    it('should survive losing the unique race', async () => {
        const spy = vi.spyOn(repository, 'save');
        spy.mockImplementationOnce(async () => {
            // the concurrent caller's row lands between the read and the write,
            // and the adapter reports the rejected insert as a conflict
            repository.seed(createFakePath({
                name: 'sales',
                path: 'sales',
                parentId: null,
                realmId,
            }));

            throw new EntityConflictError({ entity: 'path' });
        });

        const leaf = await ensurePath(repository, realmId, 'sales');
        const winner = await repository.findOneBy({
            realmId,
            path: 'sales',
        });

        expect(leaf.id).toBe(winner!.id);
        expect((await repository.findManyBy({ realmId })).length).toBe(1);
    });
});
