set windows-shell := ["powershell"]
set shell := ["bash", "-cu"]

_default:
  just --list -u

setup:
  just check-setup-prerequisites
  # Rust related setup
  cargo install cargo-binstall
  cargo binstall cargo-insta cargo-deny cargo-shear typos-cli -y
  # Node.js related setup
  corepack enable
  pnpm install
  @echo "✅✅✅ Setup complete!"

# Run Rust tests.
test-rust: pnpm-install
  cargo test --workspace

lint-rust: clippy
  cargo fmt --all --check
  cargo check --workspace --all-features --all-targets --locked

# For the most of the time, code is automatically formatted on save in the editor.
# Also, clippy already cover compiler error.
clippy:
  cargo clippy --workspace --all-targets -- --deny warnings


lint-node:
  pnpm lint-code
  pnpm type-check

lint-repo:
  typos # Check if the spelling is correct.
  pnpm format-check # Check if files are formatted correctly.

# --- `build` series commands aim to provide a easy way to build the project.



# Build `@baicie/napi`
build: build-napi

# Only build `.node` binding located in `packages/napi`.
build-binding:
  pnpm run --filter @baicie/napi build-binding

# Build `@baicie/napi` located in `packages/napi` itself and its `.node` binding.
build-napi:
  pnpm run --filter @baicie/napi build-native:debug

# Build `@baicie/napi` located in `packages/npi` itself and its `.wasm` binding for WASI.
build-napi-wasi:
  pnpm run --filter @baicie/napi build-wasi:debug

# Build `@baicie/napi` located in `packages/napi` itself and its `.node` binding in release mode.
build-napi-release:
  pnpm run --filter @baicie/napi build-native:release

# Build `@baicie/napi` located in `packages/napi` itself and its `.node` binding in profile mode.
build-napi-profile:
  pnpm run --filter @baicie/napi build-native:profile

build-napi-memory-profile:
  pnpm run --filter @baicie/napi build-native:memory-profile

# Build `@baicie/napi-browser` located in `packages/napi-browser` itself and its `.wasm` binding.
build-browser:
  pnpm run --filter "@baicie/napi-browser" build:debug

# Build `@baicie/napi-browser` located in `packages/napi-browser` itself and its `.wasm` binding in release mode.
build-browser-release:
  pnpm run --filter "@baicie/napi-browser" build:release

# Trigger pnpm install. This is used the ensure up-to-date dependencies before running any commands.
pnpm-install:
  pnpm install

# Run the `rolldown` cli using node.
run *args:
  pnpm rolldown {{ args }}
