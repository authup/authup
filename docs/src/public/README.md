# Public assets

Files in this directory are served from the root of the docs site.

## Pending: `hero-admin.png`

`Hero.vue` expects an admin-UI screenshot at this path:

```
docs/src/public/hero-admin.png
```

Suggested specs:

- Aspect ratio close to `16:10` (the hero card uses `aspect-ratio: 16 / 10`).
- Width ≥ `1200px` for retina.
- Show a representative admin screen — user list, role editor or realm overview.
- Trim browser chrome (the hero already provides a traffic-light window frame).

Until the file is added, `Hero.vue` shows a CSS skeleton placeholder.
