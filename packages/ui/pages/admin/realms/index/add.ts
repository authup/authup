/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/common';
import { navigateTo } from '#app';
import { definePageMeta, resolveComponent } from '#imports';
import { LayoutKey, LayoutNavigationID } from '../../../../config/layout';

export default defineComponent({
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.REALM_ADD,
            ],
        });

        const handleCreated = (e) => {
            navigateTo({ path: `/admin/realms/${e.id}` });
        };

        const handleFailed = (e) => {
            console.log(e);
            emit('failed', e);
        };

        const form = resolveComponent('RealmForm');

        return () => h(form, {
            onCreated: handleCreated,
            onFailed: handleFailed,
        });
    },
});
