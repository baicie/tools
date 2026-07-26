# Release Dry Run

Before creating a release tag, build all release packages and inspect their tarballs without publishing anything:

```bash
pnpm release:dry-run
```

To check one package while iterating locally:

```bash
pnpm release:dry-run -- --package @baicie/cli
```

The command runs the workspace build first and then executes `npm pack --dry-run` for each selected publishable package.
