/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type RecordNamed = {
    id?: string | null,
    name?: string | null,
    displayName?: string | null,
    description?: string | null
};

export type RecordHeading = {
    /**
     * The page `<h1>` AND the record's breadcrumb crumb. One value, so the
     * two cannot disagree.
     */
    label: string,
    /** The line under the heading. Empty when there is nothing left to say. */
    subTitle: string
};

/**
 * How a record names itself on its detail page.
 *
 * The heading leads with the display name where there is one, and the line
 * under it answers "what is this record", the same question the collection
 * pages answer one level up with their section descriptions.
 *
 * It is a ladder, because no single field is present on every entity, and
 * every rung must carry something the heading is not already showing:
 *
 *   1. the record's own `description` (client, role, scope, permission,
 *      policy and realm carry the column; the other six do not)
 *   2. else the `name`, the identifier an operator types into a config file,
 *      which the heading is no longer showing because a display name took it
 *   3. else the `id`, which is what an API call or a support ticket needs
 *
 * The entity type deliberately does NOT appear. It was the original rung 3,
 * and it is what the breadcrumb and the sidebar already state twice over, so
 * a record with neither a description nor a display name (the provisioned
 * `master` realm, for one) got a line that told the reader nothing.
 *
 * A description is free text and can run long, so `.sub-title` clamps it. The
 * heading block sits above the tab rail, and an unclamped paragraph would push
 * the rail down the page.
 */
export function buildRecordHeading(entity: RecordNamed) : RecordHeading {
    const name = entity.name || '';
    const displayName = (entity.displayName || '').trim();
    const description = (entity.description || '').trim();

    const label = displayName.length > 0 ?
        displayName :
        name;

    if (description.length > 0) {
        return { label, subTitle: description };
    }

    if (label !== name && name.length > 0) {
        return { label, subTitle: name };
    }

    return { label, subTitle: entity.id || '' };
}
