# Build Template Alignment Specification (P2-WP-ENV-002)
## Work Package: P2-WP-ENV-002 — Build Template Alignment
## Documentation-Only Architecture and Environment Design Document

---

## 1. Document Control

### 1.1 Metadata
| Metadata Field | Value |
| :--- | :--- |
| **Project** | Gujarat Art & Craft ERP |
| **Work Package** | P2-WP-ENV-002 — Build Template Alignment |
| **Version** | 1.0 |
| **Status** | APPROVED — Build Template Alignment Specification Frozen |
| **Branch** | `phase-2-runtime-development` |
| **Security Runtime Commit** | `b54f499` |
| **Validation Document Commit** | `e4820de` |
| **Docker Context Security Commit**| `b6cda64` |
| **Canonical Path** | `docs/runtime/phase-2/environment/P2-WP-ENV-002-Build-Template-Alignment.md` |
| **Docker Image** | `gujarat-erp-validation:latest` |
| **Verified Toolchain** | Node.js v20.20.2, npm 10.8.2, pnpm 10.34.5, ICP CLI 0.1.0-beta.3, Motoko compiler 0.16.3 |
| **Reviewers** | Senior ICP/DFX DevOps Architect, Motoko Build Engineer, Docker Build Engineer, Repository Architect, Enterprise Release Reviewer |

### 1.2 Scope
- **In Scope**:
  - Detailed audit of the repository root, `build-template/` directory, Docker build context, and container filesystem layout.
  - Analysis of Motoko compilation paths, Vite frontend build targets, and script assumptions.
  - Evaluation of architectural alignment options for mapping the actual ERP runtime code to the build template context.
  - Definition of a compile-only validation command and isolated local deployment design.
  - Draft of Architecture Decision Record (ADR) `ADR-P2-ENV-002`.
  - Design of rollback, cleanup, browser validation, and supply-chain security controls.
- **Out of Scope**:
  - Executing any canister compile commands, Vite builds, or replica deployments.
  - Modifying backend (`backend/**`) or frontend (`frontend/**`) source code.
  - Modifying configuration files in `build-template/` (e.g., `Dockerfile`, `icp.yaml`, `deploy.sh`).
  - Restoring, applying, or modifying the Git stash (`stash@{0}`).
  - Modifying general packaging, lockfiles, or workspace configurations.
  - Initializing a mainnet network or executing stateful changes on any staging server.

### 1.3 Assumptions
1. **Local-Only Sandbox**: All replica network starts and deployments must be strictly run with `--environment local` to prevent mainnet leakage.
2. **Ignored Template**: The directory `build-template/` is ignored by Git (line 73 of `.gitignore`), meaning any changes inside this folder remain local to the development machine and are untracked by the VCS.
3. **Execution Context**: The containerized working directory is set to `/workdir/build-template` under the `ubuntu` user in the Dockerfile.

### 1.4 Dependencies
- System packages: `sharp` (for image resizing), `tar` (for downloading toolchains), and standard compilation utilities (`build-essential`).
- Environment variables: `MOC_PATH`, `MOTOKO_CORE`, `MOTOKO_BASE`, `BACKEND_CANISTER_ID`, `STORAGE_GATEWAY_URL`, and `II_URL`.

---

## 2. Purpose

This specification defines the architecture and environment design required to align the ignored Caffeine `build-template/` structure with the actual ERP runtime code (`/backend` and `/frontend`). 

Currently, the `build-template/` directory contains configuration scripts and template directories representing the boilerplate provided by the Caffeine build container, while the actual application source code resides at the root level of the repository. Because the compilation and deployment configurations assume that source code resides nested under `build-template/src/`, compilation and deployment in the verification container fail due to path mismatch. 

To bridge this gap without mutating production files, this document analyzes the current repository layouts, traces compilation paths, compares structural options, and outlines a recommended enterprise architecture that guarantees reproducible, tracked, and secure local validation.

### 2.1 File Location Standards
The repository segregates system files into distinct locations based on their lifecycle and executable status:
- **`docs/` Directory**: Used strictly for specifications, ADRs, verification plans, test logs, and compliance evidence.
- **`infrastructure/` Directory**: Serves as the canonical runtime location for executable configuration, deployment scripts, Dockerfiles, and environment files. No executable configuration files are allowed to reside inside the `docs/` hierarchy.
- **`build-template/` Status**: "The ignored build-template directory must not become the canonical or version-controlled validation configuration. Existing local exploratory changes may remain temporary but must not be relied upon by automated validation, release, or deployment procedures." The folder remains ignored in `.gitignore`, can be retained as local reference material, and must not be force-added without separate approval. Local exploratory edits to the Dockerfile or deployment scripts are classified as non-canonical.

---

## 3. Current Repository Structure

The physical layout of the workspace contains two separate tracks:
1. **Actual ERP Runtime**: Comprising the Motoko backend source and React/Vite frontend.
2. **Build Template Configuration**: Comprising the ignored Caffeine build wrapper.

### 3.1 Repository Directory Tree (ASCII Representation)
```
/workdir/ (Repository Root)
├── .dockerignore
├── .gitignore
├── README.md
├── backend/                       <-- Actual ERP Backend Source
│   ├── main.mo
│   └── migration.mo
├── frontend/                      <-- Actual ERP Frontend Source
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src/
│       ├── App.tsx
│       ├── backend.ts
│       ├── mockBackend.ts
│       └── pages/
├── build-template/                <-- Ignored local directory
│   ├── Dockerfile
│   ├── deploy.sh
│   ├── icp.yaml
│   ├── package.json
│   ├── scripts/
│   │   ├── prune-unused-images.js
│   │   └── resize-images.js
│   └── src/
│       ├── backend/               <-- Mismatched Template Target (No main.mo)
│       │   ├── canister.yaml
│       │   └── system-idl/
│       └── frontend/              <-- Mismatched Template Target (Skeleton UI)
│           ├── canister.yaml
│           ├── package.json
│           ├── vite.config.js
│           └── src/
│               └── components/ui/ (Shadcn UI files only)
└── build.sh                       <-- Root build script
```

---

## 4. Current Docker Layout

The build template uses the Docker context defined in `build-template/Dockerfile`.

### 4.1 File Copying and Paths
The Dockerfile copy instruction on line 126 is:
```dockerfile
WORKDIR /workdir/build-template
COPY --chown=ubuntu:ubuntu . /workdir/
```
Because the build context is the repository root directory, this copy operations results in the following paths within the container:
- Root backend files: `/workdir/backend/`
- Root frontend files: `/workdir/frontend/`
- Build template files: `/workdir/build-template/`

### 4.2 Working Directory and Entrypoint
- **Working Directory**: `/workdir/build-template` (Line 125 of `Dockerfile`).
- **Entrypoint**: `/workdir/build-template/deploy.sh` (Line 128 of `Dockerfile`).
- **Execution Context**: When the container starts, the shell is positioned inside `/workdir/build-template` and executes the deploy script. Consequently, all relative path resolutions in `deploy.sh` evaluate relative to `/workdir/build-template`.

---

## 5. Current ICP Template Layout

The ICP configuration files are located inside the `build-template` directory.

### 5.1 Canister References in `icp.yaml`
```yaml
canisters:
    - src/frontend
    - src/backend
```
Paths in `icp.yaml` are evaluated relative to the directory containing `icp.yaml` itself (which is `/workdir/build-template`). Therefore, the toolchain searches for:
- Frontend config: `/workdir/build-template/src/frontend/canister.yaml`
- Backend config: `/workdir/build-template/src/backend/canister.yaml`

### 5.2 Relative Path Assumptions in `canister.yaml`
1. **Backend Canister (`src/backend/canister.yaml`)**:
   ```yaml
   commands:
       - $MOC_PATH --implicit-package core --default-persistent-actors ... main.mo -o backend.wasm
       - mv backend.wasm "$ICP_WASM_OUTPUT_PATH"
   ```
   *Assumption*: The compiler (`moc`) is run in the directory `/workdir/build-template/src/backend/` and expects `main.mo` to be inside that exact directory.
   
2. **Frontend Canister (`src/frontend/canister.yaml`)**:
   ```yaml
   commands:
       - pnpm install --frozen-lockfile --prefer-offline ...
       - node ../../scripts/resize-images.js
       - pnpm --filter '@caffeine/template-frontend' build:skip-bindings
   ```
   *Assumption*: The installation and build operations run in `/workdir/build-template/src/frontend/`. It assumes the presence of a local workspace structure with the filter `@caffeine/template-frontend' build:skip-bindings` mapping to this path.

---

## 6. Backend Compile Path Analysis

Tracing the compilation chain from top to bottom reveals the following execution path:
1. `icp.yaml` identifies `src/backend` as a canister root.
2. `src/backend/canister.yaml` executes the compile command.
3. The compile command invokes `$MOC_PATH` with target file `main.mo`.

```
[icp.yaml] ──> [src/backend/canister.yaml] ──> [moc compilation] ──> [Expects: src/backend/main.mo]
                                                                                │ (MISMATCH)
                                                                                ▼
                                                                     [Actual: /workdir/backend/main.mo]
```

### Finding ENV-FIND-001: Backend Compilation Path Mismatch
- **Expected Compilation Target**: `/workdir/build-template/src/backend/main.mo`
- **Actual Runtime Source**: `/workdir/backend/main.mo`
- **Result**: The compilation fails immediately with an error stating that `main.mo` cannot be found, because the build template expects the Motoko code to be located inside the nested template subfolder.

---

## 7. Frontend Build Path Analysis

Tracing the frontend deployment steps in `build-template/src/frontend/canister.yaml` reveals:
1. `icp.yaml` points to `src/frontend`.
2. `src/frontend/canister.yaml` directs `pnpm` to install and build.
3. The build filter targets `@caffeine/template-frontend`.

### Comparison of Template and Actual Frontend Structures
- **Template Frontend (`build-template/src/frontend`)**:
  - Lacks `index.html`.
  - Lacks `tailwind.config.js`.
  - `src/` only contains directories like `components/ui/` containing Shadcn primitives. It has no routing, no dashboard, no invoices pages, and no actual main entry file (`main.tsx`).
  - **Verdict**: The template frontend is an **outdated, generic skeleton** containing only boilerplate code, completely decoupled from the actual application logic.
- **Actual ERP Frontend (`/workdir/frontend`)**:
  - Holds the actual invoice application.
  - Contains Vite, Tailwind, routing, context, hooks, and full production page modules (e.g., `CreateInvoice.tsx`, `Inventory.tsx`, `JobWork.tsx`).

### Finding ENV-FIND-002: Frontend Target Divergence
If compilation is run within the template paths, `pnpm` will build a blank skeleton containing no ERP functionality, leading to a broken validation deployment. The actual ERP source code at `/workdir/frontend` is completely bypassed.

### Finding ENV-FIND-003: Script Working-Directory Dependency
- **Finding**: Image-processing scripts contain relative path assumptions tied to the template layout. These assumptions may resolve incorrectly when invoked from canister-specific build directories.
- **Evidence Status**: Verified path-risk; runtime failure reproduction pending. (The aligned build command has not yet been executed).

---

## 8. deploy.sh Working Directory Analysis

The execution trace of `build-template/deploy.sh` is detailed below:
1. **Line 16: `icp network start -d`**
   - Starts the local Internet Computer replica daemon. Requires a configuration file `.icp` in the working directory to track local replica state.
2. **Line 17: `icp canister create --environment local frontend`**
   - Creates the canister principal for `frontend` using configuration in `icp.yaml`.
3. **Line 18: `icp canister create --environment local backend`**
   - Creates the canister principal for `backend` using configuration in `icp.yaml`.
4. **Line 19: `export BACKEND_CANISTER_ID=$(...)`**
   - Queries the canister settings for the local environment and stores the ID.
5. **Line 23: `icp deploy --environment local frontend backend`**
   - Compiles both canisters using their respective `canister.yaml` files and deploys them to the replica.

### Working Directory Requirements
For `deploy.sh` to execute successfully, it MUST be run from `/workdir/build-template`. Running it from the repository root `/workdir` will fail because `icp.yaml` is not present at the root, which prevents `icp-cli` from identifying the canisters or starting the network with template settings.

---

## 9. Root build.sh Analysis

The root `build.sh` contains the following shell pipeline:
```bash
if [ ! -d "build-template" ]; then echo "Error: build-template folder not found" >&2; exit 1; fi && BUILD_DIR=$(mktemp -d) && cp -rf build-template/* $BUILD_DIR/ && cp -rf . $BUILD_DIR/ && cd $BUILD_DIR && if [ ! -x "/home/ubuntu/.motoko/moc/0.16.3-implicits-26/bin/moc" ]; then echo "Error: Motoko compiler not found at /home/ubuntu/.motoko/moc/0.16.3-implicits-26/bin/moc" >&2; exit 1; fi && if [ ! -d "/home/ubuntu/.motoko/core/implicits-20" ]; then echo "Error: Motoko core library not found at /home/ubuntu/.motoko/core/implicits-20" >&2; exit 1; fi && pnpm install --frozen-lockfile --prefer-offline --child-concurrency 2 --network-concurrency 6 && pnpm --filter '@caffeine/template-frontend' build:skip-bindings && node scripts/prune-unused-images.js && node scripts/resize-images.js && /home/ubuntu/.motoko/moc/0.16.3-implicits-26/bin/moc --implicit-package core --default-persistent-actors -no-check-ir -E M0236 -E M0235 -E M0223 -E M0237 --actor-idl src/backend/system-idl --package core /home/ubuntu/.motoko/core/implicits-20 src/backend/main.mo -o src/backend/backend.wasm && mkdir -p /workdir/src/frontend/ && cp -rf src/frontend/dist/ /workdir/src/frontend/ 2>/dev/null || echo "No frontend dist to copy" && cp -f src/backend/backend.wasm /workdir/src/backend/ 2>/dev/null || echo "No backend wasm to copy"
```

### 9.1 Deconstruction of build.sh
1. **Environment Verification**: Verifies presence of the `build-template` folder.
2. **Directory Isolation**: Creates a temporary directory `$BUILD_DIR` using `mktemp -d`.
3. **Merging Copy Operations**:
   - `cp -rf build-template/* $BUILD_DIR/` copies template configuration into the temp folder root.
   - `cp -rf . $BUILD_DIR/` copies the entire repository (including `backend/` and `frontend/`) into the temp folder.
4. **CWD Transition**: Switches working directory to `$BUILD_DIR`.
5. **Compiler Verification**: Checks if `moc` exists at the absolute container path `/home/ubuntu/.motoko/moc/0.16.3-implicits-26/bin/moc`.
6. **Library Verification**: Checks for `/home/ubuntu/.motoko/core/implicits-20`.
7. **Frontend Build**: Runs `pnpm install` and triggers `build:skip-bindings` specifically for `@caffeine/template-frontend` (which builds the skeleton, not the actual ERP frontend).
8. **Optimization Scripts**: Executes `node scripts/prune-unused-images.js` and `node scripts/resize-images.js` from the `$BUILD_DIR` root directory.
9. **Motoko Compilation**: Runs `moc` directly targeting `src/backend/main.mo`.
10. **Result Transfer**: Copies the generated wasm and dist assets back to `/workdir/src/frontend/` and `/workdir/src/backend/`.

### 9.2 Critical Issues and Compatibility
- **Actual ERP Backend Bypass**: The compile command invokes `src/backend/main.mo`. However, because the root copy command puts the actual backend in `$BUILD_DIR/backend/main.mo` and the template backend in `$BUILD_DIR/src/backend/`, there is no `main.mo` under `$BUILD_DIR/src/backend/`. The build script will fail at the compilation step.
- **Docker Toolchain Compatibility**: The script relies on absolute paths pointing to `/home/ubuntu/.motoko/...` which exist only inside the container. It is not compatible with a developer's host machine (unless the user has replicated the exact directory layout under `/home/ubuntu`).
- **Stale Template Dependency**: The build targets the template package `@caffeine/template-frontend` instead of `@caffeine/erp-frontend` (or similar actual package), leaving the real React source uncompiled.

---

## 10. Alignment Options

To resolve the path mismatches, four structural approaches are analyzed below:

### Option A — Path Mapping / Symlink Alignment
*Concept*: Map the actual root source folders into the build template directory structure inside the container using symbolic links before execution.
- **Security**: Low risk, but can introduce symlink traversal issues if file sharing between host and container is not tightly bounded.
- **Reproducibility**: Poor. Symlinks behave differently on Windows hosts than Linux containers, often causing mounting failures in WSL.
- **Git Traceability**: None. Since `build-template` is ignored, any script creating these symlinks inside `build-template` cannot be tracked in version control.
- **Implementation Complexity**: Low. Simply execute `ln -s /workdir/backend /workdir/build-template/src/backend` and `ln -s /workdir/frontend /workdir/build-template/src/frontend`.
- **Maintenance Cost**: High due to platform-specific symlink resolution behaviors.
- **Impact on Production Build**: None.
- **Rollback**: Deleting the symlinks is trivial.
- **Docker Impact**: Requires adding symlink generation steps inside the container entrypoint.
- **ICP CLI Impact**: Works, but may experience file-watcher bugs when tracking symlinked directories.
- **Frontend Impact**: Maps the actual frontend folder structure.
- **Backend Impact**: Links `main.mo` directly.

### Option B — Copy Actual Runtime Sources into Template Paths
*Concept*: Execute a copy script during container initialization to duplicate `/workdir/backend` and `/workdir/frontend` into `build-template/src/backend` and `build-template/src/frontend`.
- **Security**: Medium risk. Copying files on container run may accidentally copy uncommitted secrets, developer keys (`.pem` files), or local `.env` overrides that bypass `.dockerignore`.
- **Reproducibility**: Medium. Depends on ensuring the copy command runs on every script invocation; otherwise, compilation uses stale cached source files.
- **Git Traceability**: None. The destination paths inside `build-template/` are git-ignored.
- **Implementation Complexity**: Low. Added to `deploy.sh` or the container CMD.
- **Maintenance Cost**: Medium. Copy scripts must handle cleaning up target paths to prevent stale artifacts.
- **Impact on Production Build**: None.
- **Rollback**: Requires removing copied directories.
- **Docker Impact**: Increases container runtime disk usage by duplicating source files.
- **ICP CLI Impact**: None. The CLI reads the copied directories natively.
- **Frontend Impact**: Copied actual source replaces the skeleton UI.
- **Backend Impact**: Copies `main.mo` to the expected path.

### Option C — Modify ICP Canister Configuration to Reference Root Paths
*Concept*: Edit `build-template/icp.yaml` and the corresponding `canister.yaml` files to point directly to `/workdir/backend` and `/workdir/frontend` instead of `src/backend` and `src/frontend`.
- **Security**: High. It avoids duplicating files or using symlinks, eliminating leakage paths.
- **Reproducibility**: Low-Medium. Because the files modified (`icp.yaml` and `canister.yaml`) are located inside the git-ignored `build-template/` directory, these adjustments cannot be pushed to the repository. Every developer must re-apply the changes locally.
- **Git Traceability**: Zero. No configuration changes are tracked in Git.
- **Implementation Complexity**: Low. Requires minor path modifications in yaml files.
- **Maintenance Cost**: Low.
- **Impact on Production Build**: None.
- **Rollback**: Simply checkout or revert the configurations.
- **Docker Impact**: None.
- **ICP CLI Impact**: Directly reads the root source directories.
- **Frontend/Backend Impact**: Works directly on live code.

### Option D — Create a New Tracked Validation Build Configuration (Approved Architecture)
*Concept*: Abandon the ignored `build-template/` directory for validation. Instead, create a dedicated, version-controlled validation config directory at `infrastructure/validation/icp/` containing a tracked `Dockerfile`, a tracked `icp.yaml`, a tracked `deploy-local.sh`, and tracked canister definitions that reference the actual `/workdir/backend` and `/workdir/frontend` directories.
- **Security**: Excellent. Complete visibility of build files, base image tags, and compile commands. No risk of untracked changes being introduced.
- **Reproducibility**: Absolute. The configuration is committed to Git and can be executed identically by any developer or CI/CD runner.
- **Git Traceability**: Complete. All configuration changes are tracked.
- **Implementation Complexity**: Medium. Requires writing custom configurations and copying necessary tools from the template Dockerfile.
- **Maintenance Cost**: Low. The configuration is isolated from template modifications and changes only when the ERP core design updates.
- **Impact on Production Build**: None. Completely isolated.
- **Rollback**: Standard git-revert operations.
- **Docker Impact**: Leverages a separate, tracked Dockerfile.
- **ICP CLI Impact**: Uses the `--config` flag to target `icp.yaml`.
- **Frontend/Backend Impact**: Compiles and builds root paths natively.
- **Detailed Design Requirements**:
  - Compiles `/backend/main.mo` and `/backend/migration.mo` directly.
  - Builds the actual `/frontend` React/Vite application.
  - Avoids duplicating or copying sources into stale template paths inside the container.
  - Utilizes explicit local canister configurations.
  - Contains no production canister IDs, network state, or production secrets/identities.
  - Supports a compile-only validation verification mode.
  - Supports an isolated local replica deployment environment mode.
  - Fully reproducible from a fresh, clean Git clone.

---

## 11. Recommended Enterprise Architecture

The recommended enterprise solution is **Option D — Create a New Tracked Validation Build Configuration**. 

```
[Repository Root]
├── infrastructure/                   <-- CANONICAL RUNTIME LOCATION
│   └── validation/
│       └── icp/
│           ├── Dockerfile            <-- Tracked validation build recipe
│           ├── icp.yaml              <-- Version-controlled validation ICP layout
│           ├── deploy-local.sh       <-- Sandboxed deployment routine
│           ├── backend/
│           │   └── canister.yaml    <-- Point directly to /workdir/backend/main.mo
│           └── frontend/
│               └── canister.yaml    <-- Point directly to /workdir/frontend
├── build-template/                  <-- UNTOUCHED (Local Reference / Ignored)
└── docs/runtime/phase-2/            <-- Document/ADR/Report-only storage
```

### Rationale
- **Location Standard Alignment**: Validates that executable code and Docker/canister runtime files reside in `infrastructure/` rather than polluting `docs/`.
- **Traceability**: Because the `build-template/` folder is explicitly ignored by Git, any modification made to align the template paths remains untracked. This introduces a major configuration drift vulnerability, as developer environments will diverge silently. Option D ensures every change is committed and visible in the Git history.
- **Local Isolation**: The default Caffeine `build-template/` must remain untouched to serve as the baseline template. A dedicated validation configuration protects the local environment from accidental pollution or premature deployment mutations.
- **Supply-Chain Integrity**: Setting up a dedicated Dockerfile allows the team to pin base images by digest (`sha256`) and explicitly specify toolchain versions, closing security gaps present in the default template.

---

## 12. Required Changes Matrix

The following matrix lists the actions required to implement the Recommended Enterprise Architecture (Option D):

| File | Current Role | Proposed Change | Tracked? | Runtime Business Impact | Environment Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`infrastructure/validation/icp/Dockerfile`** | *N/A (New File)* | Replicates build toolchain with explicit path mapping. | Yes | None | Validation only |
| **`infrastructure/validation/icp/icp.yaml`** | *N/A (New File)* | Defines the canisters mapping to root directories. | Yes | None | Validation only |
| **`infrastructure/validation/icp/deploy-local.sh`** | *N/A (New File)* | Sandboxed local replica deployment script. | Yes | None | Validation only |
| **`infrastructure/validation/icp/backend/canister.yaml`** | *N/A (New File)* | Directs `moc` to compile `/workdir/backend/main.mo`. | Yes | None | Validation only |
| **`infrastructure/validation/icp/frontend/canister.yaml`** | *N/A (New File)* | Builds `/workdir/frontend/` actual ERP app. | Yes | None | Validation only |
| **`build-template/**`** | Ignored build container configuration | **No canonical change**. Retained as ignored, non-authoritative reference material. Existing local exploratory edits must not be relied upon by automated validation, release, or deployment procedures. | No | None | None |
| **`backend/**`** | Core Motoko backend source | **No change**. Raw source files remain untouched. | Yes | None | None |
| **`frontend/**`** | React/Vite frontend source | **No change**. Raw source files remain untouched. | Yes | None | None |

---

## 13. Security and Supply-Chain Considerations

### 13.1 Risks of Ignored Build-Template Files
Because the entire `build-template/` folder is in `.gitignore`, it is excluded from Git reviews. This presents several security challenges:
- **Malicious Edits**: A developer or compromised tool could modify `build-template/deploy.sh` to steal identities or leak private keys without it appearing in git diffs.
- **Environment Drift**: The build template could silently drift, leading to validation passes locally that fail in CI/CD.

### 13.2 Docker Build Context and Secret Leaks
The command `COPY --chown=ubuntu:ubuntu . /workdir/` copies the entire directory into the container.
- **Key Vulnerability**: Any uncommitted `.env` files, SSH keys, or `.pem` private keys in the local directory will be baked into the Docker image layers.
- **Remediation**: The `.dockerignore` must be explicitly verified to block all `.pem`, `.key`, and `.env` files.

### 13.3 Toolchain and Download Verification
The template Dockerfile performs several remote downloads without verification:
- `icp-cli` installer script is piped directly from GitHub into shell (`curl ... | sh`).
- `motoko`, `motoko-core`, and `motoko-base` are fetched from remote URLs without checksum validation.
- **Remediation**: The validation Dockerfile must pin all downloads to specific commit digests or verify their SHA256 checksums before execution.

---

## 14. Reproducibility Requirements

To achieve true reproducibility, a new developer must be able to run validation by executing the following steps:
1. **Clone**: `git clone <repository_url>`
2. **Build Validation Image**:
   ```bash
   docker build -t gujarat-erp-validation:latest -f infrastructure/validation/icp/Dockerfile .
   ```
3. **Run Validation Container**:
   ```bash
   docker run --name erp-validator -it gujarat-erp-validation:latest
   ```
4. **Result**: The container boots, runs the compile-only check, starts the local replica, compiles the actual Motoko code, bundles the React application, and serves the frontend—without requiring any manual file movement or relying on ignored local configurations.

---

## 15. Compile-Only Validation Design

The compile-only step validates the Motoko backend codebase without running a local replica or mutating network state.

### 15.1 Compilation Command
```bash
/home/ubuntu/.motoko/moc/0.16.3-implicits-26/bin/moc \
  --implicit-package core \
  --default-persistent-actors \
  -no-check-ir \
  -E M0236 -E M0235 -E M0223 -E M0237 \
  --actor-idl /workdir/infrastructure/validation/icp/backend/system-idl \
  --package base /home/ubuntu/.motoko/base/0.16.1 \
  --package core /home/ubuntu/.motoko/core/implicits-20 \
  /workdir/backend/main.mo \
  -o /tmp/backend-validation.wasm
```

### 15.2 Compilation Constraints
- **Destination**: Output is written to `/tmp/backend-validation.wasm` to prevent modifying active source directories.
- **Zero Mutation**: No deployment configurations or state parameters are altered.
- **Static Check**: The compiler validates types, syntax, patterns, and signature exports.

---

## 16. Local Deployment Design

When validating local deployment, the environment must be isolated to prevent interference with other local projects or mainnet configurations.

### 16.1 Isolated Local Replica Startup
```bash
# Start the network using the dedicated validation config
icp --config infrastructure/validation/icp/icp.yaml network start -d
```

### 16.2 Canister Identity and Creation
- **Deployment Identities**: A dedicated, ephemeral validation identity (`validator-identity`) is created and loaded. The default production administrative keys must never be imported.
- **Command Sequence**:
  ```bash
  icp --config infrastructure/validation/icp/icp.yaml canister create --environment local backend
  icp --config infrastructure/validation/icp/icp.yaml canister create --environment local frontend
  ```

### 16.3 Non-Production Data Seed
- The local backend canister must be initialized using dummy seed data.
- The `migration.mo` logic is triggered using a test upgrade script to confirm schema compatibility without production state reuse.

---

## 17. Browser Validation Design

To verify the combined backend-frontend integration inside the local sandbox:

### 17.1 Runtime Variables
- **Frontend URL**: `http://localhost:3000`
- **Backend Host**: `http://localhost:8081`
- **Canister ID Injection**: The build script writes the newly created canister ID to `/workdir/frontend/env.json` at build time:
  ```json
  {
    "backend_host": "http://localhost:8081",
    "backend_canister_id": "bkyz2-fmaaa-aaaaa-qaaaq-cai"
  }
  ```

### 17.2 Browser Test Matrix
1. **Neutralized Password Recovery Route**:
   - Navigate to `/recover-password`.
   - Submit a request.
   - **Assertion**: UI must display failure message; backend must return `success = false`, and the target user account password must remain unchanged.
2. **Authorized Admin Password Reset**:
   - Log in as the Master Admin (`#Admin`).
   - Trigger password reset for a Staff account.
   - **Assertion**: Reset succeeds.
3. **Unauthorized Resets**:
   - Log in as Staff. Attempt to trigger reset for another user.
   - Log in as Manager. Attempt to reset Master Admin.
   - **Assertion**: Actions are blocked, and backend traps the execution.
4. **Audit Log Inspection**:
   - Access the administrative ledger dashboard.
   - **Assertion**: Reset events are recorded with caller principal, target account, and timestamp. No credentials or hashes are written to the audit log.

---

## 18. Rollback and Cleanup

Following validation, the local environment must be completely cleaned up to restore the repository to a clean state.

### 18.1 Host Cleanup Script
```bash
# 1. Stop local replica network
icp --config infrastructure/validation/icp/icp.yaml network stop || true

# 2. Remove Docker validation containers
docker rm -f erp-validator 2>/dev/null || true

# 3. Clean local replica state folders
rm -rf infrastructure/validation/icp/.icp/
rm -rf .dfx/

# 4. Revert any temporary changes to tracked config files
git checkout -- frontend/package.json

# 5. Verify git stash remains untouched
git stash list
```

### 18.2 Git Stash Verification
The existing stash `stash@{0}` must remain untouched throughout the process to prevent premature merge conflicts or local work loss.

---

## 19. Risks

- **Path Mismatch**: If absolute paths inside the validation container are hardcoded to host paths, compilation will fail on different machines.
- **Stale Ignored Template**: If the ignored template changes but the tracked validation Dockerfile is not updated, validations may give false passes.
- **Accidental Local-State Reuse**: If `.icp` or `.dfx` state folders are not cleaned between runs, old canister IDs can cause deployment errors.
- **Secret Copying**: Copying the workspace into the Docker container can leak sensitive credentials if `.dockerignore` is misconfigured.
- **Unverified Downloads**: Downloading toolchain packages directly from remote servers without SHA verification exposes the system to supply-chain attacks.
- **Container Memory Limits**: Vite production builds require significant memory; running Docker on limited host systems may result in compiler crashes (OOM kills).

---

## 20. Acceptance Criteria

| ID | Description | Verification Method |
| :--- | :--- | :--- |
| **ENV-AC-001** | Actual ERP backend source `/backend` is compiled. | The validation config points directly to `/workdir/backend/main.mo`. |
| **ENV-AC-002** | Actual ERP frontend source `/frontend` is built. | The validation config points directly to `/workdir/frontend`. |
| **ENV-AC-003** | Tracked/reproducible validation configuration is selected. | Option D is selected; configurations are version-controlled under `infrastructure/validation/icp/`. |
| **ENV-AC-004** | No production configurations or source files are modified. | `git status` verifies zero changes to source or core configurations. |
| **ENV-AC-005** | Compile-only design is approved and documented. | Section 15 outlines the exact, non-mutating `moc` command. |
| **ENV-AC-006** | Local deployment design is approved and documented. | Section 16 outlines local replica isolation and test identity setup. |
| **ENV-AC-007** | Security exclusions are verified. | Validation config blocks copying of `.env`, `.pem`, and local files. |
| **ENV-AC-008** | Rollback and cleanup designs are approved. | Section 18 outlines container, network, and state cleanup. |
| **ENV-AC-009** | Git stash is verified as untouched. | `git stash list` confirms `stash@{0}` is preserved. |
| **ENV-AC-010** | Architect review and stakeholder approval are completed. | Section 24 status is signed off. |

---

## 21. Open Questions and Architectural Decisions

### 21.1 Template Frontend Deletion
- **Decision**: Do not delete the template frontend folder during `P2-WP-ENV-002`. Retain it within the ignored `build-template/` directory as reference material. Removal should be considered only after the tracked validation setup has reached verified parity and received final architecture sign-off.

### 21.2 Port Allocation config
- **Decision**: Validation ports must be fully environment-configurable. The ports must not be architectural constants.
- **Suggested variables**:
  - `VALIDATION_BACKEND_PORT`
  - `VALIDATION_FRONTEND_PORT`
  - `VALIDATION_GATEWAY_PORT`
- *Defaults*: Standard non-conflicting default values may be documented later.

### 21.3 Authority of Root build.sh
- **Decision**: Do not retire the root `build.sh` script at this time. It remains supported until the tracked validation environment is fully operational and produces equivalent backend binaries and compiler results. Retiring it requires a separate ADR supported by regression parity evidence.

---

## 22. Architecture Decision Record Draft

### ADR-P2-ENV-002: Tracked ICP Validation Environment

#### Context
The existing Caffeine `build-template/` directory is ignored by Git, meaning any configuration changes made to align the template paths with the actual ERP source will not be saved in version control. Additionally, the default template compiles a blank skeleton frontend instead of the actual ERP React application.

#### Decision
"Create a dedicated, tracked ICP validation environment under `infrastructure/validation/icp` and treat `build-template` as non-canonical reference material."

#### Decision Authority
Architecture Review Board

#### Consequences
- **Traceability**: All verification configuration changes are tracked in Git.
- **Reproducibility**: Any developer can build the exact validation environment from repository files.
- **Location Standards**: Maintains strict separation between documentation (`docs/`) and executable configuration (`infrastructure/`).
- **Isolation**: Prevents configuration drift or local state pollution.
- **Maintenance**: Minor overhead in maintaining a separate Dockerfile, but significantly lower risk of configuration errors.
- **Rollback**: Simplified through standard Git reverts.

#### Status
**APPROVED**

---

## 23. Implementation Constraints

1. **No Force-Adding Ignored Directories**: It is strictly forbidden to force-add `build-template/` or its contents to Git without architectural review.
2. **Local Replica Only**: No remote deployments or mainnet connections are allowed during validation.
3. **No Git Stash Modifications**: Git stash commands (`git stash pop`, `git stash apply`, etc.) must not be run during the execution of this work package.
4. **No Code Duplication**: Do not duplicate core source code files to bypass compilation errors.
5. **No Production Modification**: The validation setup must not modify files in `/backend` or `/frontend` except for generating the temporary `env.json` at build time.

---

## 24. Approval Block

### 24.1 Status Variables
| Status Parameter | Target Value |
| :--- | :--- |
| **Version** | 1.0 |
| **Document Status** | APPROVED — Build Template Alignment Specification Frozen |
| **Architecture Status** | Frozen |
| **Implementation Status**| Authorized but Not Started |
| **Deployment Status** | Blocked Pending Implementation and Validation |
| **ADR Status** | Approved |
| **Approval** | Approved |

### 24.2 Executive Sign-off
"The architecture is approved. No Docker, ICP, or runtime implementation is considered complete until the tracked validation configuration is created, reviewed, compiled, locally deployed, and validated."
