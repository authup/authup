# Client-Web-Kit

This package provides **lists**, **forms** and **entities** for all 
[resources](../core-kit/api-reference) of the ecosystem.
Besides, many other features are also included.

## Installation

Add the package as a dev-dependency to the project.

```sh
npm install @authup/client-web-kit --save-dev
```

## Configuration

Create a file in the plugins folder (e.g. `plugins/authup.ts`) to integrate it into the application.

```typescript
import { install } from '@authup/client-web-kit';
import { createApp } from 'vue'

const app = createApp({
  /* root component options */
});

app.use(install, {
    baseURL: 'http://localhost:3010'
});
```
