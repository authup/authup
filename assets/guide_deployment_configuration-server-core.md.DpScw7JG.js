import{_ as i,o as a,c as n,a0 as l}from"./chunks/framework.BFac62L4.js";const c=JSON.parse('{"title":"Configuration","description":"","frontmatter":{},"headers":[],"relativePath":"guide/deployment/configuration-server-core.md","filePath":"guide/deployment/configuration-server-core.md"}'),e={name:"guide/deployment/configuration-server-core.md"};function p(t,s,h,k,r,d){return a(),n("div",null,[...s[0]||(s[0]=[l(`<h1 id="configuration" tabindex="-1">Configuration <a class="header-anchor" href="#configuration" aria-label="Permalink to &quot;Configuration&quot;">​</a></h1><p>The API configuration is read from the <code>core</code> section of <code>authup.yml</code> (or of <code>authup.{json,js,ts,...}</code>; see the <a href="./configuration.html">configuration introduction</a> for the file lookup and the <code>--configDirectory</code>/<code>--configFile</code> CLI flags).</p><p>Most options can also be provided as environment variables (shown in the <code>.env</code> tab below). <strong>An environment variable always overrides the file value</strong> for the same option. A few options are file-only and have no environment variable — they are marked as such.</p><p>Not every option below sits under <code>core</code>. <code>env</code>, <code>host</code>, <code>rootPath</code>, <code>publicUrl</code>, <code>internalUrl</code> and <code>trustedOrigins</code> are top-level, the two theme options are <code>theme.directoryPath</code> and <code>theme.fragmentsEnabled</code>, and the console options are <code>adminConsole.*</code>, <code>accountConsole.*</code> and <code>authConsole.*</code>. The <code>authup.yml</code> tab shows each one at its place.</p><p><code>host</code> appears at both levels on purpose, and they are not alternatives. The top-level one (env <code>HOST</code>) is the deployment-wide bind address every listener inherits, so one line binds the API and all three console services; <code>core.host</code> overrides it for the API listener alone and is what the sample below sets. <code>port</code> has no top-level counterpart, because several listeners cannot share one.</p><p>Of those, server-core itself reads only <code>enabled</code> and <code>url</code> per console: <code>enabled</code> gates the console&#39;s two sign-in routes, <code>url</code> is where it sends the browser. The rest of a console&#39;s section, and the whole <code>theme</code> section, are read by the <strong>console service</strong> that serves the console, so setting them on an API-only process (<code>authup start core</code>) does nothing. See <a href="./console-replicas.html">Console Replicas</a> for the full per-console option list.</p><div class="danger custom-block"><p class="custom-block-title">Security</p><p>The admin password and the <code>system</code> client secret both default to <code>start123</code>. Set your own values (<code>userAdminPassword</code> / <code>clientSystemSecret</code>, or the <code>USER_ADMIN_PASSWORD</code> / <code>CLIENT_SYSTEM_SECRET</code> environment variables) before deploying to production — the examples below carry placeholders, never copy a credential out of documentation.</p></div><p>For MFA enforcement behavior and its federated-login, password-grant, feature-toggle, and cache-availability boundaries, see <a href="./configuration-server-core-mfa.html">Multi-factor authentication</a>.</p><p>The infrastructure connections are documented on their own pages: <a href="./configuration-server-core-database.html">Database</a> (<code>db</code>), <a href="./configuration-server-core-redis.html">Redis</a> (<code>redis</code>) and <a href="./configuration-server-core-smtp.html">SMTP</a> (<code>smtp</code>).</p><div class="vp-code-group vp-adaptive-theme"><div class="tabs"><input type="radio" name="group-xHU_t" id="tab-58ZLY3r" checked><label data-title="authup.ts" for="tab-58ZLY3r">authup.ts</label><input type="radio" name="group-xHU_t" id="tab-Or13aOf"><label data-title="authup.yml" for="tab-Or13aOf">authup.yml</label><input type="radio" name="group-xHU_t" id="tab-aoBi4Ac"><label data-title=".env" for="tab-aoBi4Ac">.env</label></div><div class="blocks"><div class="language-typescript vp-adaptive-theme active"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">export</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> default</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * Application environment (e.g., &#39;production&#39;).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * env: NODE_ENV</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * default: development</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    env: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;production&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * Base path for resolving relative paths (e.g. a relative</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * logDirectoryPath). File-only (no environment variable).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * default: process working directory</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    rootPath: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;/opt/authup&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * API base URL.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * May include a path prefix (e.g. https://example.com/auth) when the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * server runs behind a reverse proxy that strips the prefix. Asset</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * URLs and links of the served consoles are rebased onto it</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * automatically.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * env: PUBLIC_URL</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * default: derived from host &amp; port — http://localhost:3000</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * (a wildcard bind address renders as localhost)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    publicUrl: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;http://localhost:3000&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * API base URL for calls made from INSIDE the deployment, e.g. a</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * cluster service address.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * \`publicUrl\` is where a browser reaches authup, and nothing</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * guarantees that address resolves from inside: a container</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * published on another port, an ingress hostname that only exists</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * outside, a TLS terminator a self-call would have to trust. The</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * hosted auth pages render server-side (they read /authorize/info</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * and /), so those calls take this address instead.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * Nothing derived from it reaches a browser: publicUrl stays the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * issuer, the cookie scope and the API address the served consoles</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * hand their pages.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * A path is allowed and means what it means on publicUrl: the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * address may name an internal proxy that strips a prefix.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * \`authup start\` overrides it with its own listen address unless</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * the document names a DIFFERENT address, since there the API is</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * that very process. Setting it equal to publicUrl therefore</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * changes nothing: it names no inside address, and reaching</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * yourself through your own ingress is what this key exists to</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * avoid. Run the console as its own service to control that hop.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * env: INTERNAL_URL</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * default: publicUrl</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    internalUrl: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;http://authup:3000&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * Additional trusted origins. Entries are http(s) origins</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * (e.g. https://app.example.com; other protocols are rejected) or</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * bare hosts (e.g. hub.local, hub.local:8080); a bare host expands</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * to both its http and https origin — pass a full origin to</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * restrict to one scheme.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * Each origin is added to the redirect-URI allowlist of the per-realm</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * public system clients (as \`&lt;origin&gt;/**\`).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * The origin of \`publicUrl\` is always trusted implicitly.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * A host may carry a \`*\` (e.g. https://*.example.com), which matches</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * any host ending in \`.example.com\`. The wildcard never crosses a \`/\`,</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * so it cannot reach past the host, and a non-default port has to be</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * written out (https://*.example.com:8443).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     *</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * Security: the system clients are built-in with global scope, so any</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * allowlisted origin can complete a login and obtain a full-permission</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * token — only add origins you control. A wildcard host trusts every</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * subdomain, so use one only where you control the whole domain.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * The consoles authup serves need no entry: they are on the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * publicUrl origin. In non-production, a console&#39;s standalone vite dev</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * server origin (http://localhost:5173) is seeded automatically.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * env: TRUSTED_ORIGINS (comma-separated)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     * default: []</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">     */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    trustedOrigins: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;https://app.example.com&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">],</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    theme: {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * EXPERIMENTAL (may change in a minor release; see the Theming guide).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Directory holding the operator theme applied to the served consoles.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Read by the console services, not by server-core: in a split</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * deployment it must be mounted into the console containers.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Relative paths are resolved against rootPath. Empty disables theming.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * See the Theming guide.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: THEME_DIRECTORY_PATH</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: &#39;&#39; (disabled)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        directoryPath: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;/etc/authup/theme&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * EXPERIMENTAL, alongside directoryPath.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Read fragments/head.html from the theme directory and splice it</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * into the head of every served console. Raw, unsanitized markup on</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * the identity provider origin, so it is opt-in.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: THEME_FRAGMENTS_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        fragmentsEnabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    },</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    adminConsole: {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Where the admin console is published. server-core sends the browser</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * there once a sign-in is complete; the console service rebases its</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * asset URLs and links onto it. Only the path may differ from</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * publicUrl, never the origin. \`port\` and \`host\` (the console&#39;s own</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * listener, used by \`authup start console\`) are documented in the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Console Replicas guide.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: ADMIN_CONSOLE_URL</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: &#39;&#39; (derived: &lt;publicUrl&gt;/console/admin)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        url: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Serve the admin console at \`&lt;publicUrl&gt;/console/admin\` (realms, clients,</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * users, roles, permissions, policies, keys, sessions, events).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Disable it to administer the instance through the API alone.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: ADMIN_CONSOLE_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: true</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        enabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * EXPERIMENTAL. Package directory replacing the served admin console. It</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * points at a directory holding the built dist/. Empty resolves the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * packaged console from node_modules. See the Theming guide.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * A source checkout there is served from source with hot module</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * replacement by \`authup dev\` instead (also EXPERIMENTAL; see the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Quick Start guide).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: ADMIN_CONSOLE_PATH</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: &#39;&#39;</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        path: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    },</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    accountConsole: {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Where the account console is published, same rules as</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * adminConsole.url above.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: ACCOUNT_CONSOLE_URL</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: &#39;&#39; (derived: &lt;publicUrl&gt;/console/account)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        url: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Serve the account self-service surface at \`&lt;publicUrl&gt;/console/account\`</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * (profile, password, authenticators, sessions, applications).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Disable it when you run your own self-service portal.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: ACCOUNT_CONSOLE_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: true</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        enabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * EXPERIMENTAL. Package directory replacing the served account console. It</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * points at a directory holding the built dist/. Empty resolves the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * packaged console from node_modules. See the Theming guide.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * A source checkout there is served from source with hot module</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * replacement by \`authup dev\` instead (also EXPERIMENTAL; see the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Quick Start guide).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: ACCOUNT_CONSOLE_PATH</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: &#39;&#39;</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        path: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    },</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    authConsole: {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Where the hosted login, consent and workflow pages are published.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * The six page GETs on this server redirect there, carrying the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * request&#39;s own query. Same rules as adminConsole.url above; there is</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * no \`enabled\`, because those pages are the issuance surface.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: AUTH_CONSOLE_URL</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: &#39;&#39; (derived: &lt;publicUrl&gt;/console/auth)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        url: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * EXPERIMENTAL. Package directory replacing the served auth console. It</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * points at a directory holding the built dist/. Empty resolves the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * packaged console from node_modules. See the Theming guide.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * A source checkout there is served from source with hot module</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * replacement by \`authup dev\` instead (also EXPERIMENTAL; see the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Quick Start guide).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: AUTH_CONSOLE_PATH</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: &#39;&#39;</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        path: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    },</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    core: {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Directory the production log files are written to. This is the one</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * directory the process writes to. Relative paths are resolved</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * against rootPath. The SQLite database is NOT placed here - its path</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * comes from the database configuration (db.database / DB_DATABASE).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: LOG_DIRECTORY_PATH</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: logs</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        logDirectoryPath: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;logs&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Directory file-based provisioning is read from. Operator-authored</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * input, read-only to the process, so it belongs next to the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * configuration file rather than in the log directory. Relative paths</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * are resolved against rootPath.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: PROVISIONING_DIRECTORY_PATH</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: provisioning</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        provisioningDirectoryPath: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;provisioning&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Enable logging. File-only (no environment variable).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: true</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        logger: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        worker: {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">            /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             * Run the worker (the background cron sweeps) in this process.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             * Under the default mode the API runs it alongside itself; set</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             * false on API replicas when a dedicated</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             * \`authup start worker\` process runs it. Worker mode</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             * refuses to start when this is false. Set it false only once</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             * such a process exists: with it false everywhere, nothing</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             * sweeps. See the Worker guide.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             * env: WORKER_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             * default: true</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            enabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        },</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Apply pending schema migrations at startup. When false, startup runs</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * no DDL: it verifies that no migration is pending and fails loud</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * otherwise, so a replica never races a sibling for the same DDL. Run</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * \`authup migration run\` as a separate step instead; that command</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * is unaffected by this option. Ignored on SQLite, which ships no</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * migrations and always synchronizes its schema. See the Worker guide.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: MIGRATION_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: true</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        migrationEnabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Application port number.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: PORT</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 3000</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        port: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">3000</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Address the HTTP server binds to. Has no environment variable of</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * its own: HOST sets the top-level \`host\`, which this listener and</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * every console listener inherit unless they name their own.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: the top-level host (0.0.0.0, all interfaces)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        host: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;0.0.0.0&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Optional public base URL whose proxy requests TLS client certificates.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Published in OpenID discovery as RFC 8705 mtls_endpoint_aliases.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Requires certificateSource to be enabled.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: MTLS_PUBLIC_URL</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: null</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        mtlsPublicUrl: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;https://mtls.example.com&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Trusted-proxy certificate header contract:</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * - disabled: ignore certificate headers (default)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * - standard: RFC 9440 Client-Cert / Client-Cert-Chain</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * - forwarded: X-Forwarded-Tls-Client-Cert escaped PEM leaf</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         *</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Enabling this requires a private backend listener and a proxy that</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * removes/overwrites public certificate headers on every request.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: CERTIFICATE_SOURCE</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: disabled</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        certificateSource: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;forwarded&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Which upstream proxies to trust when deriving the client IP from</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * X-Forwarded-For: true trusts every hop, false trusts none (the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * socket peer address is used), a number trusts that many hops, and</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * a string / list is an allowlist of proxy IPs, CIDRs, or the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * presets loopback, linklocal, uniquelocal.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         *</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Security: with \`true\` (the default), a DIRECT client can spoof</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * its IP via X-Forwarded-For — login-throttle keys, audit events,</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * the access log, and the session inventory then record the forged</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * value. Pin the actual proxy (e.g. 1, or loopback for a same-host</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * proxy) when the listener is reachable without a proxy or exact</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * attribution matters. String forms are canonicalized: &quot;1&quot; means</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * one trusted hop (never trust-all), &quot;true&quot;/&quot;false&quot; parse as</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * booleans, anything else is a comma-separated allowlist. Allowlist</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * entries are trimmed and lowercased, so &quot; LOOPBACK &quot; is accepted;</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * a hop count outside the safe integer range is rejected at boot.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: TRUST_PROXY</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: true</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        trustProxy: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // ----------------------------------------------------</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Built-in HTTP middlewares. Each accepts a boolean or an options</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * object (options objects require the js/ts file variant), except</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * middlewareSwagger, which is boolean-only.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * File-only (no environment variables).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: true (each)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        middlewareBody: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,       </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// request body parsing</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        middlewareCookie: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,     </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// cookie parsing</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        middlewareCors: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,       </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// CORS (reflects any origin by default;</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">                                    // pass options for an explicit allowlist)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        middlewarePrometheus: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// /metrics endpoint</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        middlewareQuery: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,      </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// query-string parsing</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        middlewareRateLimit: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,  </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// rate limiting</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        middlewareSwagger: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,    </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// /docs endpoint</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // ----------------------------------------------------</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Refresh token validity in seconds (default: 259,200s / 3 days).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: TOKEN_REFRESH_MAX_AGE</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 259_200</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        tokenRefreshMaxAge: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">259_200</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Access token validity in seconds (default: 900s / 15 minutes).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: TOKEN_ACCESS_MAX_AGE</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 900</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        tokenAccessMaxAge: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">900</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Grace period (seconds) during which a just-rotated refresh token is</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * still accepted, minting new chain-linked tokens instead of triggering</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * replay detection. Absorbs multi-tab / mobile refresh races.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: TOKEN_REFRESH_GRACE_PERIOD</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 0 (strict — first-use-wins)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        tokenRefreshGracePeriod: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Max age (seconds) of the authentication that a \`prompt=login\` / \`max_age\`</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * authorize request accepts before forcing re-authentication. Judged against</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * the session&#39;s creation time — a stateless approximation.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: PROMPT_LOGIN_MAX_AGE</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 60</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        promptLoginMaxAge: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">60</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Seconds past its expiry an (expired) id_token_hint presented at the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * RP-initiated logout endpoint (/logout) is still accepted for a</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * server-side session revoke. Bounds how long a leaked id_token stays a</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * replayable remote logout; beyond the window the click-gated confirm</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * page still works.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: END_SESSION_HINT_GRACE_PERIOD</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 0 (unbounded — spec/Keycloak parity)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        endSessionHintGracePeriod: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // ----------------------------------------------------</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Enable user registration?</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: REGISTRATION_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        registrationEnabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Require email verification for registration or login?</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: EMAIL_VERIFICATION_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        emailVerificationEnabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Allow password reset via email?</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: PASSWORD_RECOVERY_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        passwordRecoveryEnabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Minimum length for user-chosen passwords (user create/update,</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * registration, password reset). The maximum is fixed at 512.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: PASSWORD_MIN_LENGTH</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 10</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        passwordMinLength: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">10</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Persist security events (login, loginFailed, authorize,</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * logout, refresh replay, ...) to the auth_events table.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: EVENT_LOG_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: true</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        eventLogEnabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Retention for persisted security events in days. Raise it for</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * longer compliance windows; 0 = keep forever.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: EVENT_LOG_RETENTION_DAYS</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 90</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        eventLogRetentionDays: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">90</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Additionally mirror every entity create/update/delete into the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * auth_events table (scope: entity). Only effective while</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * eventLogEnabled is true.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: EVENT_LOG_ENTITY_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: true</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        eventLogEntityEnabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Retention for entity create/update/delete events in days —</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * deliberately short so entity churn self-prunes. 0 = keep forever.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: EVENT_LOG_ENTITY_RETENTION_DAYS</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 7</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        eventLogEntityRetentionDays: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">7</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Throttle failed logins per (identifier, ip) pair by counting recent</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * loginFailed events. Requires eventLogEnabled.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * The IP half of the key follows \`trustProxy\` — pin it to the actual</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * proxy (hops or allowlist) so a direct client cannot spoof the IP</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * via X-Forwarded-For.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: LOGIN_ATTEMPT_THROTTLE_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        loginAttemptThrottleEnabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Failed attempts per (identifier, ip) pair within the window before</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * the pair is throttled (HTTP 429).</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: LOGIN_ATTEMPT_THRESHOLD</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 5</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        loginAttemptThreshold: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">5</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Sliding throttle window in seconds.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: LOGIN_ATTEMPT_WINDOW</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 900</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        loginAttemptWindow: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">900</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Optional base64-encoded 32-byte key (AES-256-GCM) wrapping the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * realm key store&#39;s material at rest — the per-realm JWT signing</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * private keys and the auto-generated per-realm encryption keys</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * that protect MFA seeds. Generate one with:</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * openssl rand -base64 32</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * or:</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * node -e &quot;console.log(crypto.randomBytes(32).toString(&#39;base64&#39;))&quot;</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Must be standard base64 (+, /, = padding) decoding to exactly</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * 32 bytes — base64url or any other length is rejected at startup.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Unset, key material is stored unwrapped in the database (the</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Keycloak/authentik posture). Setting it later wraps existing</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * rows lazily on read; removing it while wrapped rows exist fails</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * loud at first use, so treat it as a long-lived secret.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: SECRETS_ENCRYPTION_KEY</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: &#39;&#39; (unset)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        secretsEncryptionKey: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Enable multi-factor authentication. Users can enroll authenticator</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * devices (TOTP app, recovery codes); a user holding a confirmed</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * device must present a second factor on interactive authorization</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * and on the password grant (otp parameter). Seed-encryption keys</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * are generated per realm automatically — no further configuration</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * is required.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: MFA_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        mfaEnabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Enforce MFA for every user: a user without a confirmed device is</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * routed to inline enrollment at next interactive login.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Requires mfaEnabled.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: MFA_REQUIRED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        mfaRequired: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Max age (seconds) of the session&#39;s second-factor proof an</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * acr_values=urn:authup:mfa step-up request accepts before forcing</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * a fresh challenge.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: MFA_FRESHNESS_MAX_AGE</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 60</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        mfaFreshnessMaxAge: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">60</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Lifetime (seconds) of the MFA-pending login ticket a fresh</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * interactive login receives when its second factor needs an</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * interactive challenge (email / WebAuthn) — and of the pending</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * session backing it.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: MFA_TICKET_MAX_AGE</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: 600</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        mfaTicketMaxAge: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">600</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // ----------------------------------------------------</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Permit HTTP Basic authentication with client credentials</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * against the management API.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: CLIENT_AUTH_BASIC</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        clientAuthBasic: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Activate the built-in \`system\` client of the master realm.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: CLIENT_SYSTEM_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        clientSystemEnabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * The secret of the built-in \`system\` client.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: CLIENT_SYSTEM_SECRET</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: &#39;start123&#39;</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        clientSystemSecret: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&lt;unique-secret&gt;&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Reset the \`system\` client secret on application startup.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: CLIENT_SYSTEM_SECRET_RESET</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        clientSystemSecretReset: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // ----------------------------------------------------</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Permit HTTP Basic authentication with user credentials</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * against the management API.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: USER_AUTH_BASIC</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        userAuthBasic: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Enable default admin user.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: USER_ADMIN_ENABLED</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: true</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        userAdminEnabled: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * The password of the default admin user.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: USER_ADMIN_PASSWORD</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: &#39;start123&#39;</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        userAdminPassword: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&lt;strong-password&gt;&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Reset admin password on application startup.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: USER_ADMIN_PASSWORD_RESET</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: false</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        userAdminPasswordReset: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // ----------------------------------------------------</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Additional (non-built-in) permission names to provision on startup.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: PERMISSIONS (comma-separated)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: []</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        permissions: [],</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        /**</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Auto-assign the system.default policy to new permissions</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * created without an explicit policyId.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Transitional option — will be removed in the next major release.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * Set to false to opt into the allow-by-default model.</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * env: PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         * default: true</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">         */</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        permissionsDefaultPolicyAssignment: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    },</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><div class="language-yaml vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># yaml-language-server: $schema=https://authup.org/schema/config.json</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">env</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">production</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">publicUrl</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">http://localhost:3000</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">trustedOrigins</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  - </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">https://app.example.com</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">theme</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  directoryPath</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">/etc/authup/theme</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  fragmentsEnabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">adminConsole</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  enabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  path</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&#39;</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">accountConsole</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  enabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  path</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&#39;</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">authConsole</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  path</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&#39;</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">core</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  logDirectoryPath</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">logs</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  provisioningDirectoryPath</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">provisioning</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  worker</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    enabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  migrationEnabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  port</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">3000</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  host</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.0.0.0</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  mtlsPublicUrl</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">https://mtls.example.com</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  certificateSource</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">forwarded</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  trustProxy</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">1</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  tokenRefreshMaxAge</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">259200</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  tokenAccessMaxAge</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">900</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  tokenRefreshGracePeriod</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  promptLoginMaxAge</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">60</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  endSessionHintGracePeriod</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  registrationEnabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  emailVerificationEnabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  passwordRecoveryEnabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  passwordMinLength</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">10</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  eventLogEnabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  eventLogRetentionDays</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">90</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  eventLogEntityEnabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  eventLogEntityRetentionDays</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">7</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  loginAttemptThrottleEnabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  loginAttemptThreshold</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">5</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  loginAttemptWindow</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">900</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  secretsEncryptionKey</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&#39;</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  mfaEnabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  mfaRequired</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  mfaFreshnessMaxAge</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">60</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  mfaTicketMaxAge</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">600</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  clientAuthBasic</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  clientSystemEnabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  clientSystemSecret</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&lt;unique-secret&gt;&#39;</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  clientSystemSecretReset</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  userAuthBasic</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  userAdminEnabled</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  userAdminPassword</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;&lt;strong-password&gt;&#39;</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  userAdminPasswordReset</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">false</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  permissionsDefaultPolicyAssignment</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span></span></code></pre></div><div class="language-dotenv vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">dotenv</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">NODE_ENV</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">production</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">LOG_DIRECTORY_PATH</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">logs</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">PROVISIONING_DIRECTORY_PATH</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">provisioning</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">THEME_DIRECTORY_PATH</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">/etc/authup/theme</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">THEME_FRAGMENTS_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">WORKER_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">true</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">MIGRATION_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">true</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">PORT</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">3000</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">HOST</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">0.0.0.0</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">PUBLIC_URL</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">http://localhost:3000</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># INTERNAL_URL=http://authup:3000</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">MTLS_PUBLIC_URL</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">https://mtls.example.com</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">CERTIFICATE_SOURCE</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">forwarded</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">TRUST_PROXY</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">1</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">TRUSTED_ORIGINS</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">https://app.example.com</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">TOKEN_REFRESH_MAX_AGE</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">259200</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">TOKEN_ACCESS_MAX_AGE</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">900</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">TOKEN_REFRESH_GRACE_PERIOD</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">0</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">PROMPT_LOGIN_MAX_AGE</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">60</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">END_SESSION_HINT_GRACE_PERIOD</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">0</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">REGISTRATION_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">EMAIL_VERIFICATION_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">PASSWORD_RECOVERY_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">PASSWORD_MIN_LENGTH</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">10</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">ACCOUNT_CONSOLE_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">true</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">ADMIN_CONSOLE_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">true</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">EVENT_LOG_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">true</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">EVENT_LOG_RETENTION_DAYS</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">90</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">EVENT_LOG_ENTITY_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">true</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">EVENT_LOG_ENTITY_RETENTION_DAYS</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">7</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">LOGIN_ATTEMPT_THROTTLE_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">LOGIN_ATTEMPT_THRESHOLD</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">5</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">LOGIN_ATTEMPT_WINDOW</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">900</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">SECRETS_ENCRYPTION_KEY</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">MFA_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">MFA_REQUIRED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">MFA_FRESHNESS_MAX_AGE</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">60</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">MFA_TICKET_MAX_AGE</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">600</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">CLIENT_AUTH_BASIC</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">CLIENT_SYSTEM_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">CLIENT_SYSTEM_SECRET</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&lt;unique-secret&gt;</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">CLIENT_SYSTEM_SECRET_RESET</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">USER_AUTH_BASIC</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">USER_ADMIN_ENABLED</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">true</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">USER_ADMIN_PASSWORD</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&lt;strong-password&gt;</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">USER_ADMIN_PASSWORD_RESET</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">false</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">true</span></span></code></pre></div></div></div><div class="tip custom-block"><p class="custom-block-title">File-only options</p><p><code>rootPath</code>, <code>logger</code> and the <code>middleware*</code> options have no environment variable — set them in a configuration file. Middleware <em>options objects</em> (e.g. an explicit CORS allowlist) additionally require the <code>js</code>/<code>ts</code> file variant, since they cannot be expressed as flat strings.</p></div>`,11)])])}const A=i(e,[["render",p]]);export{c as __pageData,A as default};
