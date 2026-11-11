/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Scope } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { describe, expect, it } from 'vitest';
import AuthorizeScope from '../../../../src/components/workflows/authorize/AuthorizeScope.vue';
import { mountKitComponent } from '../../../utils';

const now = new Date(0).toISOString();

function buildScope(input: Partial<Scope>) : Scope {
    return {
        id: 'scope-1',
        builtIn: false,
        name: 'reports',
        displayName: null,
        description: null,
        realmId: null,
        realm: null,
        createdAt: now,
        updatedAt: now,
        ...input,
    };
}

describe('AuthorizeScope', () => {
    it('renders the localized label of a built-in scope', () => {
        const { wrapper } = mountKitComponent(AuthorizeScope, {
            entity: buildScope({ name: ScopeName.OPEN_ID, builtIn: true }),
            requested: [ScopeName.OPEN_ID],
        });

        expect(wrapper.find('strong').text()).toEqual('OpenID sign-in');
    });

    it('renders the raw name of a custom scope named like a built-in one', () => {
        const { wrapper } = mountKitComponent(AuthorizeScope, { entity: buildScope({ name: ScopeName.OPEN_ID }) });

        expect(wrapper.find('strong').text()).toEqual(ScopeName.OPEN_ID);
    });

    it('prefers the display name over the catalog label', () => {
        const { wrapper } = mountKitComponent(AuthorizeScope, {
            entity: buildScope({
                name: ScopeName.EMAIL,
                builtIn: true,
                displayName: 'Your work email',
            }),
        });

        expect(wrapper.find('strong').text()).toEqual('Your work email');
    });
});
