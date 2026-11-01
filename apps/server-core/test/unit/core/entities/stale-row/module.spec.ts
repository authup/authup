/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { ErrorCode } from '@authup/errors';
import {
    StaleRowSignal,
    assertRowUnchanged,
    retryOnStaleRow,
} from '../../../../../src/core/entities/stale-row/index.ts';

describe('core/entities/stale-row', () => {
    describe('assertRowUnchanged', () => {
        it('should pass for an equal row', () => {
            expect(() => assertRowUnchanged({
                id: 'a', 
                name: 'x', 
                pathId: null, 
            }, {
                id: 'a', 
                name: 'x', 
                pathId: null, 
            }))
                .not.toThrow();
        });

        it('should ignore updatedAt and loaded relations', () => {
            expect(() => assertRowUnchanged(
                {
                    id: 'a', 
                    updatedAt: '2026-01-01', 
                    realm: { id: 'r' }, 
                },
                {
                    id: 'a', 
                    updatedAt: '2026-01-02', 
                    realm: { id: 'r' }, 
                },
            )).not.toThrow();
        });

        it('should signal a changed column, also one only the current row carries', () => {
            expect(() => assertRowUnchanged({ id: 'a', pathId: 'p' }, { id: 'a', pathId: 'q' }))
                .toThrow(StaleRowSignal);
            expect(() => assertRowUnchanged({ id: 'a' }, { id: 'a', description: 'set' }))
                .toThrow(StaleRowSignal);
        });
    });

    describe('retryOnStaleRow', () => {
        it('should retry against the re-read row', async () => {
            const rows: string[] = [];

            const result = await retryOnStaleRow({
                row: 'first',
                reread: async () => 'fresh',
            }, async (row) => {
                rows.push(row);

                if (row === 'first') {
                    throw new StaleRowSignal();
                }

                return row;
            });

            expect(result).toBe('fresh');
            expect(rows).toEqual(['first', 'fresh']);
        });

        it('should answer a conflict after the last attempt', async () => {
            let calls = 0;

            await expect(retryOnStaleRow({
                row: 'row',
                reread: async () => 'row',
            }, async () => {
                calls += 1;

                throw new StaleRowSignal();
            })).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
            expect(calls).toBe(3);
        });

        it('should answer not found when the row is gone', async () => {
            await expect(retryOnStaleRow({
                row: 'row',
                reread: async () => null,
            }, async () => {
                throw new StaleRowSignal();
            })).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should pass any other error through', async () => {
            await expect(retryOnStaleRow({
                row: 'row',
                reread: async () => 'row',
            }, async () => {
                throw new Error('boom');
            })).rejects.toThrow('boom');
        });
    });
});
