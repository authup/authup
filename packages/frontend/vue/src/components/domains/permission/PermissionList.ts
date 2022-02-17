/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import Vue from 'vue';
import { mergeDeep } from '../../../utils';
import { Pagination } from '../../core/Pagination';

export const PermissionList = Vue.extend({
    name: 'PermissionList',
    components: { Pagination },
    props: {
        query: {
            type: Object,
            default() {
                return {};
            },
        },
        loadOnInit: {
            type: Boolean,
            default: true,
        },
        withHeader: {
            type: Boolean,
            default: true,
        },
        withSearch: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        return {
            busy: false,
            items: [],
            q: '',
            meta: {
                limit: 10,
                offset: 0,
                total: 0,
            },
            itemBusy: false,
        };
    },
    watch: {
        q(val, oldVal) {
            if (val === oldVal) return;

            if (val.length === 1 && val.length > oldVal.length) {
                return;
            }

            this.meta.offset = 0;

            this.load();
        },
    },
    created() {
        if (this.loadOnInit) {
            this.load();
        }
    },
    methods: {
        async load() {
            if (this.busy) return;

            this.busy = true;

            try {
                const response = await this.$authApi.permission.getMany(mergeDeep({
                    page: {
                        limit: this.meta.limit,
                        offset: this.meta.offset,
                    },
                    filter: {
                        id: this.q.length > 0 ? `~${this.q}` : this.q,
                    },
                    sort: {
                        id: 'ASC',
                    },
                }, this.query));

                this.items = response.data;
                const { total } = response.meta;
                this.meta.total = total;
            } catch (e) {
                console.log(e);
                // ...
            }

            this.busy = false;
        },
        goTo(options, resolve, reject) {
            if (options.offset === this.meta.offset) return;

            this.meta.offset = options.offset;

            this.load()
                .then(resolve)
                .catch(reject);
        },

        addArrayItem(item) {
            this.items.push(item);
        },
        editArrayItem(item) {
            const index = this.items.findIndex((el) => el.id === item.id);
            if (index !== -1) {
                const keys = Object.keys(item);
                for (let i = 0; i < keys.length; i++) {
                    Vue.set(this.items[index], keys[i], item[keys[i]]);
                }
            }
        },
    },
    template: `
        <div>
            <slot
                v-if="withHeader"
                name="header"
            >
                <div class="d-flex flex-row mb-2">
                    <div>
                        <slot name="header-title">
                            <h6 class="mb-0">
                                <i class="fa fa-key" /> Permissions
                            </h6>
                        </slot>
                    </div>
                    <div class="ml-auto">
                        <slot
                            name="header-actions"
                            :load="load"
                            :busy="busy"
                        >
                            <div class="d-flex flex-row">
                                <div>
                                    <button
                                        type="button"
                                        class="btn btn-xs btn-dark"
                                        :disabled="busy"
                                        @click.prevent="load"
                                    >
                                        <i class="fas fa-sync" /> Refresh
                                    </button>
                                </div>
                            </div>
                        </slot>
                    </div>
                </div>
            </slot>
            <div class="form-group">
                <div class="input-group">
                    <label for="permission-q" />
                    <input
                        id="permission-q"
                        v-model="q"
                        type="text"
                        name="q"
                        class="form-control"
                        placeholder="Name..."
                        autocomplete="new-password"
                    >
                    <div class="input-group-append">
                        <span class="input-group-text"><i class="fa fa-search" /></span>
                    </div>
                </div>
            </div>
            <slot
                name="items"
                :items="items"
                :busy="busy"
            >
                <div class="c-list">
                    <div
                        v-for="(item,key) in items"
                        :key="key"
                        class="c-list-item mb-2"
                    >
                        <div class="c-list-content align-items-center">
                            <div class="c-list-icon">
                                <i class="fa fa-group" />
                            </div>
                            <slot name="item-name">
                                <span class="mb-0">{{ item.id }}</span>
                            </slot>

                            <div class="ml-auto">
                                <slot
                                    name="item-actions"
                                    :item="item"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </slot>

            <div
                v-if="!busy && !items"
                slot="no-more"
            >
                <div class="alert alert-sm alert-info">
                    No (more) permissions available anymore.
                </div>
            </div>

            <pagination
                v-if="meta"
                :total="meta.total"
                :offset="meta.offset"
                :limit="meta.limit"
                @to="goTo"
            />
        </div>
    `,
});
