<!--
  - Copyright (c) 2023.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->

<script setup>

import { createError, navigateTo } from '#app';

const api = useAPI();
try {
    await api.realm.getOne('foo');
} catch (e) {
    await navigateTo({
        path: '/',
    });

    throw createError({ message: 'Crashed' });
}

console.log('foo');

</script>
