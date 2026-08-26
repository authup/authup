# Package Dependency Graph

<!-- This file is auto-generated. Update it by running /update-dependency-graph -->

```mermaid
graph TD
    subgraph Foundation
        kit
        errors
    end

    subgraph Layer 1
        specs
        core-realtime-kit
        i18n
    end

    subgraph Layer 2
        access
        core-kit
        server-kit
    end

    subgraph Layer 3
        core-http-kit
        server-adapter-kit
        server-test-kit
    end

    subgraph Layer 4
        server-adapter-node
        server-adapter-socket-io
        server-adapter-web
    end

    subgraph Application Libraries
        client-web-kit
        client-web-kit-theme
        client-web-nuxt
        client-web-theme
    end

    subgraph Apps
        server-core
        client-account-console
        client-admin-console
        client-auth-console
        authup
    end

    %% Foundation has no internal deps

    %% Layer 1
    specs --> errors
    specs --> kit
    core-realtime-kit --> kit
    i18n --> errors

    %% Layer 2
    access --> errors
    access --> kit
    core-kit --> errors
    core-kit --> kit
    core-kit --> specs
    server-kit --> access
    server-kit --> core-kit
    server-kit --> core-realtime-kit
    server-kit --> kit
    server-kit --> specs

    %% Layer 3
    core-http-kit --> access
    core-http-kit --> core-kit
    core-http-kit --> errors
    core-http-kit --> kit
    core-http-kit --> specs
    server-adapter-kit --> core-http-kit
    server-adapter-kit --> core-kit
    server-adapter-kit --> errors
    server-adapter-kit --> kit
    server-adapter-kit --> server-kit
    server-adapter-kit --> specs
    server-test-kit --> access
    server-test-kit --> core-kit
    server-test-kit --> kit
    server-test-kit --> server-kit

    %% Layer 4
    server-adapter-node --> errors
    server-adapter-node --> server-adapter-kit
    server-adapter-socket-io --> errors
    server-adapter-socket-io --> server-adapter-kit
    server-adapter-web --> errors
    server-adapter-web --> server-adapter-kit

    %% Application Libraries
    client-web-kit --> access
    client-web-kit --> core-http-kit
    client-web-kit --> core-kit
    client-web-kit --> core-realtime-kit
    client-web-kit --> errors
    client-web-kit --> i18n
    client-web-kit --> kit
    client-web-kit --> specs
    client-web-kit-theme --> client-web-kit
    client-web-nuxt --> access
    client-web-nuxt --> client-web-kit
    client-web-nuxt --> core-http-kit
    client-web-nuxt --> kit
    client-web-theme --> client-web-kit-theme

    %% Apps
    server-core --> access
    server-core --> client-account-console
    server-core --> client-admin-console
    server-core --> client-auth-console
    server-core --> core-http-kit
    server-core --> core-kit
    server-core --> errors
    server-core --> i18n
    server-core --> kit
    server-core --> server-kit
    server-core --> server-test-kit
    server-core --> specs
    client-account-console --> client-web-kit
    client-account-console --> client-web-kit-theme
    client-account-console --> client-web-theme
    client-account-console --> core-http-kit
    client-account-console --> core-kit
    client-account-console --> i18n
    client-account-console --> kit
    client-account-console --> specs
    client-auth-console --> client-web-kit
    client-auth-console --> client-web-kit-theme
    client-auth-console --> client-web-theme
    client-auth-console --> core-http-kit
    client-auth-console --> core-kit
    client-auth-console --> i18n
    client-auth-console --> kit
    client-admin-console --> access
    client-admin-console --> client-web-kit
    client-admin-console --> client-web-kit-theme
    client-admin-console --> client-web-theme
    client-admin-console --> core-http-kit
    client-admin-console --> core-kit
    client-admin-console --> i18n
    client-admin-console --> kit
    client-admin-console --> specs
    authup --> server-core
```
