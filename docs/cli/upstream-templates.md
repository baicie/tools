# Curated Upstream Templates

The companion template repository provides reproducible upstream templates that can be updated without forking them. Use its catalog to create an exact upstream revision with optional local overlays:

```bash
git clone https://github.com/baicie/template-repo.git
cd template-repo
npm run templates:create -- shadcn-admin-ai ../my-admin
```

`shadcn-admin-ai` checks out a pinned shadcn-admin revision and applies the repository-owned AI rules overlay. The generated `.template-origin.json` records the source revision.

Use `npm run templates:sync` to detect upstream changes. Run `npm run templates:sync -- --write` only when intentionally updating the pinned revision; the repository workflow turns scheduled updates into reviewable pull requests.
