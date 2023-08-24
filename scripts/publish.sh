#!/bin/sh

set -e

pnpm i --frozen-lockfile --ignore-scripts

pnpm update-version

cd packages/commitizen-mini

pnpm build

npm publish --access public

cd -

cd packages/tools

pnpm build

npm publish --access public

cd -

echo "✅ Publish completed"
