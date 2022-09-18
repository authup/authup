<!--
  - Copyright (c) 2022.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->

<script>
export default {
    methods: {
        handleCreated(item) {
            console.log(item);
            this.$refs.itemList.handleCreated(item);
        },
        handleDeleted(item) {
            console.log(item);
            this.$refs.itemList.handleDeleted(item);
        },
    },
};
</script>
<template>
    <div class="m-3">
        <div class="row">
            <div class="col">
                <user-list ref="itemList">
                    <template #item-actions="props">
                        <auth-entity-delete
                            class="btn btn-xs btn-dark"
                            :entity-type="'user'"
                            :entity-id="props.item.id"
                            :with-text="false"
                            @deleted="handleDeleted"
                        />
                    </template>
                </user-list>

                <hr>

                <role-list />
            </div>
            <div class="col">
                <user-form @created="handleCreated" />

                <hr>

                <robot-form />

                <hr>

                <user-password-form />

                <hr>

                <o-auth2-provider-form />
            </div>
        </div>
    </div>
</template>
<style>
.form-group {
    margin-bottom: 0.5rem;
}
</style>
