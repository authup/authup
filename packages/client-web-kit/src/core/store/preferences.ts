/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserAttributeName } from '@authup/core-kit';
import { OAuth2SubKind } from '@authup/specs';
import type { OAuth2TokenIntrospectionResponse } from '@authup/specs';
import type { Ref } from 'vue';
import { watch } from 'vue';
import { COLOR_MODE_UNSET, LOCALE_UNSET } from '../cookie';
import type { StorePreferenceSyncContext } from './types';

/**
 * How long a switcher may keep moving before its value goes up, so a rapid
 * toggle is one write.
 */
const WRITE_DELAY = 300;

type Preference = {
    name: UserAttributeName,
    claim: 'locale' | 'color_mode',
    unset: string,
    ref: Ref<string>,
    /**
     * The value the account holds, as far as this instance knows: what the
     * last commit seeded, or what the last write stored. A change back to it
     * is not written, which is what keeps a seed from echoing straight up.
     */
    known?: string,
    /**
     * The value the account refused, so the bootstrap does not retry the
     * same write on every commit. A change the user makes still goes up.
     */
    failed?: string,
    timer?: ReturnType<typeof setTimeout>,
    /**
     * Writes are chained, so two of one preference never race (both would
     * find no row and both would create), and counted, so a seed knows a
     * newer value is on its way up.
     */
    chain: Promise<void>,
    pending: number
};

/**
 * The account half of the two UI preferences. The refs stay the app's (vuecs
 * owns the locale, the color-mode source is a cookie ref): this pipes the
 * account value INTO them on every session commit and a change OUT of them
 * onto the user's `locale` / `colorMode` attribute.
 */
export function createStorePreferenceSync(ctx: StorePreferenceSyncContext) {
    const preferences : Preference[] = [];

    if (ctx.preferences.locale) {
        preferences.push({
            name: UserAttributeName.LOCALE,
            claim: 'locale',
            unset: LOCALE_UNSET,
            ref: ctx.preferences.locale,
            chain: Promise.resolve(),
            pending: 0,
        });
    }

    if (ctx.preferences.colorMode) {
        preferences.push({
            name: UserAttributeName.COLOR_MODE,
            claim: 'color_mode',
            unset: COLOR_MODE_UNSET,
            ref: ctx.preferences.colorMode,
            chain: Promise.resolve(),
            pending: 0,
        });
    }

    // Whose values `known` describes: another subject's are worthless.
    let subject : string | undefined;

    /**
     * Every timer, write and memo belongs to the subject it was made for.
     * A subject change (a second tab signing in as someone else on the shared
     * console session) bumps the generation, so a change the previous user
     * left in flight can neither be written onto the new account nor block
     * its seed, and its completion can no longer touch `known`.
     */
    let generation = 0;

    const invalidate = () => {
        generation += 1;

        for (const preference of preferences) {
            clearTimeout(preference.timer);
            preference.timer = undefined;
            preference.known = undefined;
            preference.failed = undefined;
            preference.pending = 0;
        }
    };

    /**
     * The no-choice sentinel is not a value the account holds: a preference
     * moved back to it has its row removed, so the account reports nothing
     * and every device falls back to its own default.
     */
    const write = async (preference: Preference, value: string, userId: string) : Promise<boolean> => {
        try {
            const { data: [existing] } = await ctx.client.userAttribute.getMany({
                filters: {
                    userId,
                    name: preference.name,
                },
            });

            if (value === preference.unset) {
                if (existing) {
                    await ctx.client.userAttribute.delete(existing.id);
                }
            } else if (existing) {
                await ctx.client.userAttribute.update(existing.id, { value });
            } else {
                await ctx.client.userAttribute.create({
                    userId,
                    name: preference.name,
                    value,
                });
            }

            return true;
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`[authup] The ${preference.name} preference could not be saved to the account.`, e);

            return false;
        }
    };

    const enqueue = (preference: Preference, value: string, userId: string) => {
        const owner = generation;

        preference.pending += 1;
        preference.chain = preference.chain
            .then(() => write(preference, value, userId))
            .then((stored) => {
                if (owner !== generation) {
                    return;
                }

                if (stored) {
                    preference.known = value;
                    preference.failed = undefined;
                } else {
                    preference.failed = value;
                }
            })
            .finally(() => {
                if (owner === generation) {
                    preference.pending -= 1;
                }
            });
    };

    for (const preference of preferences) {
        watch(preference.ref, (value) => {
            if (value === preference.known) {
                return;
            }

            // The change belongs to whoever is signed in NOW, not to
            // whoever is signed in when the timer fires.
            const userId = ctx.userId();
            if (!userId) {
                return;
            }

            const owner = generation;

            clearTimeout(preference.timer);
            preference.timer = setTimeout(() => {
                preference.timer = undefined;

                // Whatever the ref holds NOW: a seed that landed inside the
                // window has already put the account's value back.
                const current = preference.ref.value;
                if (
                    owner !== generation ||
                    ctx.userId() !== userId ||
                    current === preference.known
                ) {
                    return;
                }

                enqueue(preference, current, userId);
            }, WRITE_DELAY);
        });
    }

    /**
     * Runs inside the synchronous session commit. The account wins whenever
     * it holds a value; when it holds none, an explicit browser value (never
     * the no-choice sentinel, never one the account already refused) becomes
     * the account's initial one, for a user subject, since a client has no
     * attributes.
     */
    const seed = (introspection: OAuth2TokenIntrospectionResponse) => {
        if (introspection.sub !== subject) {
            subject = introspection.sub;
            invalidate();
        }

        const userId = introspection.sub_kind === OAuth2SubKind.USER ?
            introspection.sub :
            undefined;

        for (const preference of preferences) {
            // A change on its way up is newer than what the account reports.
            if (preference.timer || preference.pending > 0) {
                continue;
            }

            const value = introspection[preference.claim];
            if (value) {
                preference.known = value;
                preference.ref.value = value;
                continue;
            }

            const current = preference.ref.value;
            if (
                !userId ||
                !current ||
                current === preference.unset ||
                current === preference.known ||
                current === preference.failed
            ) {
                continue;
            }

            enqueue(preference, current, userId);
        }
    };

    const reset = () => {
        subject = undefined;
        invalidate();
    };

    return {
        seed,
        reset,
    };
}
