/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, normalizeError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import { read } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import {
    THEME_ASSETS_DIRECTORY_NAME,
    THEME_FRAGMENTS_DIRECTORY_NAME,
    THEME_HEAD_FRAGMENT_FILE_NAME,
    THEME_HEAD_FRAGMENT_MAX_LENGTH,
    THEME_MANIFEST_FILE_NAME,
    THEME_MANIFEST_REVALIDATE_INTERVAL,
    THEME_MANIFEST_VERSION,
} from './constants.ts';
import { buildThemeHead } from './head.ts';
import { parseThemeManifest } from './manifest.ts';
import type { IThemeProvider, ThemeManifest, ThemeProviderContext } from './types.ts';

/**
 * Owns the operator theme directory: manifest loading + validation, the
 * realpathed servable asset root, and the memoized head markup.
 *
 * Failure posture is deliberately asymmetric, and inverts the
 * FileProvisioningSource precedent for the request path:
 * - at BOOT an invalid manifest throws, so a typo is reported once, loudly,
 *   with the file path and every issue.
 * - AFTER boot a manifest that becomes invalid keeps the last good value and
 *   logs. Provisioning seeds authorization data; a theme is decoration, and
 *   a broken logo must never take down the login page of an identity
 *   provider.
 */
export class ThemeProvider implements IThemeProvider {
    protected readonly directoryPath : string;

    protected readonly manifestPath : string;

    protected readonly fragmentPath : string;

    protected readonly fragmentsEnabled : boolean;

    protected readonly logger : Logger | undefined;

    protected manifest : ThemeManifest | undefined;

    protected headFragment : string | undefined;

    protected assetsPath : string | undefined;

    protected manifestSignature : string | undefined;

    protected fragmentSignature : string | undefined;

    protected revalidatedAt = 0;

    protected headCache = new Map<string, string>();

    constructor(ctx: ThemeProviderContext) {
        this.directoryPath = ctx.directoryPath;
        this.fragmentsEnabled = ctx.fragmentsEnabled ?? false;
        this.logger = ctx.logger;
        this.manifestPath = path.join(ctx.directoryPath, THEME_MANIFEST_FILE_NAME);
        this.fragmentPath = path.join(
            ctx.directoryPath,
            THEME_FRAGMENTS_DIRECTORY_NAME,
            THEME_HEAD_FRAGMENT_FILE_NAME,
        );
    }

    async load() : Promise<void> {
        this.assetsPath = await this.resolveAssetsPath();

        // Stat first: it doubles as the existence probe (no manifest is a
        // valid theme — the operator may ship only a stylesheet) and as the
        // revalidation signature.
        this.manifestSignature = this.readSignature(this.manifestPath);
        if (this.manifestSignature) {
            this.manifest = await parseThemeManifest(await this.readManifest(), this.manifestPath);
        }

        if (this.fragmentsEnabled) {
            this.headFragment = this.readFragment();
            this.fragmentSignature = this.readSignature(this.fragmentPath);
        }

        this.revalidatedAt = Date.now();
        this.headCache.clear();

        this.logInventory();
    }

    async getManifest() : Promise<ThemeManifest | undefined> {
        await this.revalidate();

        return this.manifest;
    }

    getAssetsPath() : string | undefined {
        return this.assetsPath;
    }

    async getHead(basePath: string) : Promise<string> {
        // Drives the revalidation for both files.
        const manifest = await this.getManifest();

        const cached = this.headCache.get(basePath);
        if (typeof cached === 'string') {
            return cached;
        }

        const head = buildThemeHead(
            manifest ?? { version: THEME_MANIFEST_VERSION },
            basePath,
            this.headFragment,
        );
        this.headCache.set(basePath, head);

        return head;
    }

    // ----------------------------------------------------

    /**
     * The mount root is `<root>/assets`, never the theme root, so the
     * manifest is unreachable over HTTP by construction.
     *
     * Returns the LOGICAL path, deliberately not a realpath. A Kubernetes
     * ConfigMap volume is a symlink farm whose update swaps `..data` to a
     * NEW timestamped directory and deletes the old one, so a realpath
     * captured here would dangle after the first update and every asset
     * would 404 until the pod restarts. The asset handler resolves and
     * re-asserts containment per request instead.
     */
    protected async resolveAssetsPath() : Promise<string | undefined> {
        const assetsPath = path.join(this.directoryPath, THEME_ASSETS_DIRECTORY_NAME);

        try {
            // stat follows the symlink, so this still rejects a non-directory.
            const stats = await fs.promises.stat(assetsPath);

            return stats.isDirectory() ? assetsPath : undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Read + decode the manifest through locter, the same loader
     * FileProvisioningSource uses for its operator files. Its JSON reader
     * is a plain read-and-parse with no content cache, so the live reload
     * below still sees an edited file.
     */
    protected async readManifest() : Promise<unknown> {
        try {
            return await read(this.manifestPath);
        } catch (e) {
            const reason = normalizeError(e).message;

            throw new AuthupError(
                `The theme manifest "${this.manifestPath}" could not be read.\n  ${reason}`,
            );
        }
    }

    protected readSignature(filePath: string) : string | undefined {
        try {
            const stats = fs.statSync(filePath);

            return `${stats.size}-${stats.mtimeMs}`;
        } catch {
            return undefined;
        }
    }

    /**
     * Read `fragments/head.html`. Never called when the operator has not
     * opted in, so dropping the file into the directory does nothing on
     * its own.
     */
    protected readFragment() : string | undefined {
        let raw : string;
        try {
            raw = fs.readFileSync(this.fragmentPath, 'utf-8');
        } catch {
            return undefined;
        }

        if (raw.length > THEME_HEAD_FRAGMENT_MAX_LENGTH) {
            this.logger?.warn(
                `The head fragment "${this.fragmentPath}" exceeds ${THEME_HEAD_FRAGMENT_MAX_LENGTH} bytes and is ignored.`,
            );

            return undefined;
        }

        const trimmed = raw.trim();

        return trimmed.length > 0 ? trimmed : undefined;
    }

    /**
     * Re-read the manifest when it changed on disk, at most once per
     * interval. One stat per console render is negligible next to the SSR
     * pass it precedes, and it is what makes an edit visible without a
     * restart (the property every operator asks about first).
     */
    protected async revalidate() : Promise<void> {
        const now = Date.now();
        if (now - this.revalidatedAt < THEME_MANIFEST_REVALIDATE_INTERVAL) {
            return;
        }
        this.revalidatedAt = now;

        await this.revalidateManifest();
        this.revalidateFragment();
    }

    protected async revalidateManifest() : Promise<void> {
        const signature = this.readSignature(this.manifestPath);
        if (signature === this.manifestSignature) {
            return;
        }

        if (typeof signature === 'undefined') {
            this.manifestSignature = undefined;
            this.manifest = undefined;
            this.headCache.clear();

            return;
        }

        // Stamped before the parse attempt so a persistently broken file is
        // re-parsed once per edit, not once per render.
        this.manifestSignature = signature;

        try {
            this.manifest = await parseThemeManifest(await this.readManifest(), this.manifestPath);
            this.headCache.clear();
        } catch (e) {
            const reason = normalizeError(e).message;
            this.logger?.warn(`The theme manifest changed but is invalid, keeping the previous one.\n${reason}`);
        }
    }

    protected revalidateFragment() : void {
        if (!this.fragmentsEnabled) {
            return;
        }

        const signature = this.readSignature(this.fragmentPath);
        if (signature === this.fragmentSignature) {
            return;
        }

        this.fragmentSignature = signature;
        this.headFragment = typeof signature === 'undefined' ?
            undefined :
            this.readFragment();
        this.headCache.clear();
    }

    /**
     * Always logged. The dominant failure mode of this feature is silence:
     * mount the wrong path and the page looks exactly like an un-themed
     * page. An enumerable boot summary is both the cheapest debugging
     * affordance and the cheapest way to notice a file that should not be
     * in the volume.
     */
    protected logInventory() : void {
        if (!this.logger) {
            return;
        }

        this.logger.info(`Theme directory: ${this.directoryPath}`);

        if (this.manifest) {
            const tokens = Object.keys(this.manifest.tokens ?? {}).length;
            const tokensDark = Object.keys(this.manifest.tokensDark ?? {}).length;
            this.logger.info(
                `Theme manifest: loaded (${tokens} token(s), ${tokensDark} dark token(s))`,
            );
        } else {
            this.logger.info(`Theme manifest: none (no ${THEME_MANIFEST_FILE_NAME})`);
        }

        if (!this.fragmentsEnabled) {
            this.logger.info('Theme head fragment: disabled (themeFragmentsEnabled is off)');
        } else if (this.headFragment) {
            this.logger.info(
                `Theme head fragment: loaded (${this.headFragment.length} bytes from ${THEME_FRAGMENTS_DIRECTORY_NAME}/${THEME_HEAD_FRAGMENT_FILE_NAME})`,
            );
        } else {
            this.logger.info(
                `Theme head fragment: none (no ${THEME_FRAGMENTS_DIRECTORY_NAME}/${THEME_HEAD_FRAGMENT_FILE_NAME})`,
            );
        }

        if (!this.assetsPath) {
            this.logger.info(`Theme assets: none (no ${THEME_ASSETS_DIRECTORY_NAME}/ directory)`);

            return;
        }

        let files : string[];
        try {
            files = fs.readdirSync(this.assetsPath, { recursive: true, withFileTypes: true })
                .filter((entry) => entry.isFile())
                .map((entry) => path
                    .relative(this.assetsPath as string, path.join(entry.parentPath, entry.name))
                    .split(path.sep)
                    .join('/'))
                .sort();
        } catch {
            files = [];
        }

        this.logger.info(`Theme assets (${files.length}): ${files.join(', ') || '-'}`);
    }
}
