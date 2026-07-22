/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// @peculiar/x509 v2 pulls in tsyringe, which asserts a Reflect polyfill is
// present at import time. The entry points import reflect-metadata first, but
// the bundler (rolldown, unbundle mode) groups relative imports ahead of bare
// package imports, so the entry's own reflect-metadata import is emitted AFTER
// the relative modules that transitively load x509 — too late. Importing the
// polyfill through this relative module at every runtime x509 import site keeps
// it grouped ahead of the bare `@peculiar/x509` import in the same emitted
// file, so it always evaluates first. Must precede any x509 import.
import 'reflect-metadata';
