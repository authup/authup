<script lang="ts">
export default {
    props: {
        items: {
            type: Array,
            default: () => [],
        },
        roleId: String,
        permissionId: String,
    },
    data() {
        return {
            busy: false,
            item: null,

            initialized: false,
        };
    },
    created() {
        Promise.resolve()
            .then(() => this.initFromProperties())
            .then(() => this.init())
            .then(() => {
                this.initialized = true;
            });
    },
    methods: {
        initFromProperties() {
            if (!Array.isArray(this.items)) return;

            const index = this.items.findIndex((item) => item.role_id === this.roleId && item.permission_id === this.permissionId);
            if (index !== -1) {
                this.item = this.items[index];
            }
        },
        async init() {
            try {
                const response = await this.$authApi.rolePermission.getMany({
                    filters: {
                        role_id: this.roleId,
                        permission_id: this.permissionId,
                    },
                    page: {
                        limit: 1,
                    },
                });

                if (response.meta.total === 1) {
                    const { 0: item } = response.data;

                    this.item = item;
                }
            } catch (e) {
                // ...
            }
        },
        async add() {
            if (this.busy || this.item) return;

            this.busy = true;

            try {
                const item = await this.$authApi.rolePermission.create({
                    role_id: this.roleId,
                    permission_id: this.permissionId,
                });

                this.$bvToast.toast('The role-permission relation was successfully created.', {
                    variant: 'success',
                    toaster: 'b-toaster-top-center',
                });

                this.item = item;

                this.$emit('created', item);
            } catch (e) {
                if (e instanceof Error) {
                    this.$bvToast.toast(e.message, {
                        variant: 'warning',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
        async drop() {
            if (this.busy || !this.item) return;

            this.busy = true;

            try {
                const item = await this.$authApi.rolePermission.delete(this.item.id);

                this.$bvToast.toast('The role-permission relation was successfully deleted.', {
                    variant: 'success',
                    toaster: 'b-toaster-top-center',
                });

                this.item = null;

                this.$emit('deleted', item);
            } catch (e) {
                if (e instanceof Error) {
                    this.$bvToast.toast(e.message, {
                        variant: 'warning',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
    },
};
</script>
<template>
    <div>
        <button
            v-if="!item && initialized"
            class="btn btn-xs btn-success"
            @click.prevent="add"
        >
            <i class="fa fa-plus" />
        </button>
        <button
            v-if="item && initialized"
            class="btn btn-xs btn-danger"
            @click.prevent="drop"
        >
            <i class="fa fa-trash" />
        </button>
    </div>
</template>
