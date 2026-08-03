/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import fs from 'node:fs';
import path from 'node:path';
import {
    THEME_ASSETS_DIRECTORY_NAME,
    THEME_MANIFEST_FILE_NAME,
    THEME_MANIFEST_REVALIDATE_INTERVAL,
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

    protected readonly logger : Logger | undefined;

    protected manifest : ThemeManifest | undefined;

    protected assetsPath : string | undefined;

    protected manifestSignature : string | undefined;

    protected revalidatedAt = 0;

    protected headCache = new Map<string, string>();

    constructor(ctx: ThemeProviderContext) {
        this.directoryPath = ctx.directoryPath;
        this.logger = ctx.logger;
        this.manifestPath = path.join(ctx.directoryPath, THEME_MANIFEST_FILE_NAME);
    }

    async load() : Promise<void> {
        this.assetsPath = await this.resolveAssetsPath();

        let raw : string | undefined;
        try {
            raw = await fs.promises.readFile(this.manifestPath, 'utf-8');
        } catch {
            // No manifest is a valid theme: the operator may ship only a
            // stylesheet and let the assets mount serve it.
            raw = undefined;
        }

        if (typeof raw === 'string') {
            this.manifest = parseThemeManifest(this.parseJSON(raw), this.manifestPath);
            this.manifestSignature = await this.readSignature();
        }

        this.revalidatedAt = Date.now();
        this.headCache.clear();

        this.logInventory();
    }

    getManifest() : ThemeManifest | undefined {
        this.revalidate();

        return this.manifest;
    }

    getAssetsPath() : string | undefined {
        return this.assetsPath;
    }

    getHead(basePath: string) : string {
        const manifest = this.getManifest();
        if (!manifest) {
            return '';
        }

        const cached = this.headCache.get(basePath);
        if (typeof cached === 'string') {
            return cached;
        }

        const head = buildThemeHead(manifest, basePath);
        this.headCache.set(basePath, head);

        return head;
    }

    // ----------------------------------------------------

    /**
     * The mount root is `<root>/assets`, never the theme root, so the
     * manifest is unreachable over HTTP by construction. Realpathed once
     * here so every served path can be compared against a canonical value.
     */
    protected async resolveAssetsPath() : Promise<string | undefined> {
        const assetsPath = path.join(this.directoryPath, THEME_ASSETS_DIRECTORY_NAME);

        try {
            const resolved = await fs.promises.realpath(assetsPath);
            const stats = await fs.promises.stat(resolved);

            return stats.isDirectory() ? resolved : undefined;
        } catch {
            return undefined;
        }
    }

    protected parseJSON(raw: string) : unknown {
        try {
            return JSON.parse(raw);
        } catch (e) {
            const reason = e instanceof Error ? e.message : 'unknown error';

            throw new AuthupError(
                `The theme manifest "${this.manifestPath}" is not valid JSON.\n  ${reason}`,
            );
        }
    }

    protected async readSignature() : Promise<string | undefined> {
        try {
            const stats = await fs.promises.stat(this.manifestPath);

            return `${stats.size}-${stats.mtimeMs}`;
        } catch {
            return undefined;
        }
    }

    /**
     * Re-read the manifest when it changed on disk, at most once per
     * interval. One stat per console render is negligible next to the SSR
     * pass it precedes, and it is what makes an edit visible without a
     * restart (the property every operator asks about first).
     */
    protected revalidate() : void {
        const now = Date.now();
        if (now - this.revalidatedAt < THEME_MANIFEST_REVALIDATE_INTERVAL) {
            return;
        }
        this.revalidatedAt = now;

        let signature : string | undefined;
        try {
            const stats = fs.statSync(this.manifestPath);
            signature = `${stats.size}-${stats.mtimeMs}`;
        } catch {
            signature = undefined;
        }

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
            const raw = fs.readFileSync(this.manifestPath, 'utf-8');
            this.manifest = parseThemeManifest(this.parseJSON(raw), this.manifestPath);
            this.headCache.clear();
        } catch (e) {
            const reason = e instanceof Error ? e.message : 'unknown error';
            this.logger?.warn(`The theme manifest changed but is invalid, keeping the previous one.\n${reason}`);
        }
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
