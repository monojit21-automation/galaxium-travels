# Dependency Audit — Galaxium Travels

> Analysis based on `booking_system_backend/requirements.txt` and
> `booking_system_frontend/package.json`. The Java service
> (`booking_system_inventory_hold_service`) does not exist in this repository;
> no `pom.xml` was found.

---

## Table of Contents

1. [Backend — `requirements.txt`](#1-backend--requirementstxt)
2. [Frontend — `package.json`](#2-frontend--packagejson)
3. [Java Hold Service — `pom.xml`](#3-java-hold-service--pomxml)
4. [Cross-Cutting Findings](#4-cross-cutting-findings)
5. [Immediate Pre-Production Blockers](#5-immediate-pre-production-blockers)

---

## 1. Backend — `requirements.txt`

**Lockfile:** None. No `pip freeze` output, `Pipfile.lock`, or `pyproject.toml` with pinned deps exists in the repository.

**Python runtime:** `python:3.11-slim` (Dockerfile). No `.python-version` file or `pyproject.toml` `[tool.python]` constraint in the repo.

| Package | Declared version | Pinning status | Finding |
|---|---|---|---|
| `fastapi` | _(none)_ | Unpinned | Core web framework — major breaking changes between versions (e.g. v0.100+ Pydantic v2 migration). Any `pip install` could pull an incompatible release. |
| `fastmcp` | _(none)_ | Unpinned | MCP protocol library — pre-1.0 project with a rapidly changing API surface. Unpinned installs risk silent protocol-level breaks. |
| `uvicorn` | _(none)_ | Unpinned | ASGI server — minor versions have changed default worker behaviour and SSL handling. |
| `sqlalchemy` | _(none)_ | Unpinned | ORM — v1→v2 migration was breaking. An unpinned install could land on either major version depending on resolver state. |
| `pydantic[email]` | _(none)_ | Unpinned | Data validation — v1→v2 was a complete API rewrite (`.from_orm()` removed, `model_validate()` introduced). The codebase uses v2 patterns; an unpinned install resolving to v1 would break at runtime. |
| `python-dotenv` | _(none)_ | Unpinned | Minor — low break risk, but still unpinned. |
| `pytest` | _(none)_ | Unpinned | Test framework — major versions change fixture and plugin behaviour. |
| `pytest-asyncio` | _(none)_ | Unpinned | Async test plugin — mode defaults changed between v0.18 and v0.21 (`asyncio_mode` config key). |
| `pytest-cov` | _(none)_ | Unpinned | Coverage plugin — minor risk, but unpinned. |
| `httpx` | _(none)_ | Unpinned | Required by FastAPI `TestClient`. Breaking changes between 0.23 and 0.24 (client constructor args). |

**Summary:** 10 of 10 packages are completely unpinned. There is no lockfile. Two packages (`pydantic`, `sqlalchemy`) have known major-version breaking changes that the codebase would not survive.

---

## 2. Frontend — `package.json`

**Lockfile:** `package-lock.json` (lockfileVersion 3) is committed to git and present on disk. This is the one positive finding — npm installs are reproducible via `npm ci`.

**Node runtime requirement:** `>=18` stated in `README.md`; no `engines` field in `package.json` to enforce it.

### Production Dependencies

| Package | Declared version | Pinning status | Finding |
|---|---|---|---|
| `axios` | `^1.13.2` | Caret range | Allows any `1.x.x >= 1.13.2`. Axios 1.x has had breaking interceptor behaviour changes in minor releases. |
| `clsx` | `^2.1.1` | Caret range | Low risk — utility library with stable API. |
| `date-fns` | `^4.1.0` | Caret range | v4 is a relatively new major; `^4.1.0` allows any 4.x patch. Low risk within the major. |
| `framer-motion` | `^12.26.1` | Caret range | Allows any `12.x.x >= 12.26.1`. Animation library — minor versions occasionally change default physics and transition behaviour. |
| `lucide-react` | `^0.562.0` | Caret range | Pre-1.0 — caret on a `0.x` version allows `0.x.x >= 0.562.0` but **not** a major bump. Icon additions/removals in minor versions could silently break if a used icon is removed. |
| `react` | `^19.2.0` | Caret range | React 19 is a major version with breaking changes from 18. The caret locks to `19.x.x` but allows any 19 minor, which could introduce behaviour changes. |
| `react-dom` | `^19.2.0` | Caret range | Must stay in sync with `react` version. Caret range allows independent drift between the two if one is updated before the other. |
| `react-hot-toast` | `^2.6.0` | Caret range | Low risk — stable library. |
| `react-router-dom` | `^7.12.0` | Caret range | React Router v7 introduced a new architecture (framework vs library mode). `^7.12.0` allows any 7.x minor; minor versions in v7 have shipped non-trivial API additions. |

### Dev Dependencies

| Package | Declared version | Pinning status | Finding |
|---|---|---|---|
| `@eslint/js` | `^9.39.1` | Caret range | ESLint 9 flat config — minor versions add new rules that could fail the lint step. |
| `@types/node` | `^24.10.1` | Caret range | Type definitions — minor version bumps can expose new TypeScript errors in existing code. |
| `@types/react` | `^19.2.5` | Caret range | Must stay aligned with `react` version. Independent drift possible. |
| `@types/react-dom` | `^19.2.3` | Caret range | Must stay aligned with `react-dom` version. |
| `@vitejs/plugin-react` | `^5.1.1` | Caret range | Vite plugin — minor versions may change Babel/SWC transform options. |
| `autoprefixer` | `^10.4.23` | Caret range | Low risk. |
| `eslint` | `^9.39.1` | Caret range | New rules in minor versions can cause CI lint failures. |
| `eslint-plugin-react-hooks` | `^7.0.1` | Caret range | Plugin major versions track React versions — drift risk if `react` version moves. |
| `eslint-plugin-react-refresh` | `^0.4.24` | Caret range | Low risk. |
| `globals` | `^16.5.0` | Caret range | Low risk. |
| `postcss` | `^8.5.6` | Caret range | Low risk. |
| `tailwindcss` | `^3.4.19` | Caret range | Locked to v3 major — v4 (complete rewrite, no config file) would require a semver bump and is not covered. Low within-v3 risk. |
| `typescript` | `~5.9.3` | Tilde range | Tilde restricts to `5.9.x` patch only — the only exact-ish pin in the entire manifest. Appropriate: TypeScript patch releases are safe; minor versions introduce new type-check errors. |
| `typescript-eslint` | `^8.46.4` | Caret range | Must stay aligned with `typescript` and `eslint` versions — independent drift can break the lint step. |
| `vite` | `^7.2.4` | Caret range | Vite 7 is a recent major. Minor versions can change build output, asset hashing, or dev server behaviour. |

**Summary:** 25 of 26 packages use caret ranges. Only `typescript` uses a tilde. The committed `package-lock.json` (lockfileVersion 3) mitigates this for `npm ci` installs, but `npm install` or `npm update` will move versions within the declared ranges. There is no `engines` field enforcing Node version.

---

## 3. Java Hold Service — `pom.xml`

**`booking_system_inventory_hold_service` does not exist in this repository.** No `pom.xml` or any Java source file was found. No analysis is possible.

---

## 4. Cross-Cutting Findings

### 4.1 Python has no lockfile mechanism

`pip` does not generate a lockfile from `requirements.txt` alone. Without a `pip freeze` output committed alongside `requirements.txt`, or the use of `pip-tools` (`requirements.in` → `requirements.txt` with hashes), or Poetry/`pyproject.toml` with `poetry.lock`, two `pip install -r requirements.txt` runs at different times can produce different environments. The Dockerfile (`RUN pip install --no-cache-dir -r requirements.txt`) will silently install whatever the current resolver returns on every image build.

### 4.2 Frontend `package-lock.json` not enforced in Dockerfile

The frontend has no Dockerfile at all. If one is added, using `npm install` instead of `npm ci` would ignore the lockfile. The `start.bat` / `start.sh` scripts use `npm install`, which also does not enforce the lockfile — it may upgrade within caret ranges.

### 4.3 No `engines` field in `package.json`

`package.json` has no `"engines": {"node": ">=18"}` field. A developer on Node 16 or 20 will receive no warning. The only documentation of the requirement is in `README.md`.

### 4.4 No vulnerability scanning in CI

There is no `.github/workflows/` directory — no CI pipeline exists at all. Consequently:
- No `pip audit`, `safety`, or `trivy` scan runs against `requirements.txt`
- No `npm audit` step runs against `package-lock.json`
- No Dependabot or Renovate configuration is present
- Transitive dependency vulnerabilities would not be detected

### 4.5 Test dependencies bundled with runtime dependencies

`requirements.txt` includes `pytest`, `pytest-asyncio`, `pytest-cov`, and `httpx` alongside production runtime dependencies. The Dockerfile (`COPY . .` + `pip install -r requirements.txt`) installs all test tooling into the production image, increasing attack surface and image size.

### 4.6 `react` and `react-dom` versions can drift independently

Both `react` and `react-dom` are declared separately with caret ranges. If one is updated via `npm update` without the other, the mismatch will cause a runtime error. They should be locked to the same exact version or managed as a single constraint.

### 4.7 `@types/react` and `@types/react-dom` can drift from runtime versions

The TypeScript types (`@types/react: ^19.2.5`, `@types/react-dom: ^19.2.3`) are declared independently from the runtime packages. A minor version bump in either type package without a corresponding runtime bump can introduce type errors at build time.

### 4.8 `lucide-react` is pre-1.0 with caret range

`lucide-react: ^0.562.0` — on a `0.x` package, npm's caret range restricts to `0.562.x` only (any patch). However, `lucide-react` publishes frequent minor and patch releases that add, rename, or remove icons. Any consumed icon that is removed in a patch release would cause a runtime rendering failure rather than a build error (icons are rendered silently as nothing when not found in some versions).

---

## 5. Immediate Pre-Production Blockers

| # | Finding | Manifest | Rationale |
|---|---|---|---|
| 1 | **All Python dependencies unpinned** | `requirements.txt` | `pydantic` and `sqlalchemy` have had major breaking API changes across versions. An unpinned install in a new environment or Docker build will resolve to whatever is current at that moment. The application will fail to start if the wrong major is resolved. |
| 2 | **No Python lockfile** | `requirements.txt` | Without a lockfile, production image builds are not reproducible. Two Docker builds from the same commit can produce different installed environments. |
| 3 | **Test tooling installed in production image** | `requirements.txt` + `Dockerfile` | `pytest`, `pytest-asyncio`, `pytest-cov`, `httpx` are installed into every production container. These packages are unnecessary in production and increase the container's attack surface. |
| 4 | **`npm install` used in startup scripts instead of `npm ci`** | `package.json` + `start.bat`/`start.sh` | The startup scripts use `npm install`, which does not enforce `package-lock.json`. On any machine where `node_modules` does not exist, `npm install` may resolve within caret ranges to versions different from what is in the lockfile, silently diverging from the tested dependency set. |
| 5 | **No `engines` field in `package.json`** | `package.json` | Node.js runtime version is not enforced. The frontend uses Vite 7 and React 19, which require Node 18+. An install on Node 16 will produce a build-time failure with no clear diagnostic. |
| 6 | **No vulnerability scanning pipeline** | all manifests | There is no CI at all. Known CVEs in any dependency — including transitive dependencies — would not be detected before deployment. `npm audit` against the current lockfile should be run before any production release. |
| 7 | **`booking_system_inventory_hold_service` has no manifest** | `pom.xml` | The service does not exist. If it is required for production operation, its absence is a blocker regardless of dependency pinning. |
