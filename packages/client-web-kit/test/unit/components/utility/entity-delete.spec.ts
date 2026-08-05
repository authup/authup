/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { AEntityDelete } from '../../../../src/components/utility/entity';
import { mountKitComponent } from '../../../utils';

const deleteRequests = (requests: { method: string, url: string }[]) => requests.filter(
    (request) => request.method === 'DELETE',
);

describe('AEntityDelete', () => {
    it('should delete on click', async () => {
        const { wrapper, httpClient } = mountKitComponent(AEntityDelete, {
            entityId: 'abc',
            entityType: 'role',
            elementType: 'link',
            withPrompt: false,
        });

        await wrapper.find('a').trigger('click');
        await flushPromises();

        expect(deleteRequests(httpClient.requests)).toHaveLength(1);
    });

    it('should not delete when disabled', async () => {
        const { wrapper, httpClient } = mountKitComponent(AEntityDelete, {
            entityId: 'abc',
            entityType: 'role',
            elementType: 'link',
            withPrompt: false,
            disabled: true,
        });

        await wrapper.find('a').trigger('click');
        await flushPromises();

        expect(deleteRequests(httpClient.requests)).toHaveLength(0);
    });
});
