from pathlib import Path
import json, re, shutil

root = Path(".")
seed = Path("_quasar-seed")
if not (seed / "package.json").exists():
    raise RuntimeError("Quasar official generator did not produce package.json")
if not (seed / "quasar.config.ts").exists():
    raise RuntimeError("Missing official quasar.config.ts; check scaffold presets")

# Adopt the true scaffold configuration rather than hand-writing a pseudo-Quasar setup.
for name in ("quasar.config.ts", "index.html", "tsconfig.json"):
    shutil.copy2(seed / name, root / name)

# Add scaffold-only root files. Keep app-specific Tailwind, PostCSS and existing assets.
for item in seed.iterdir():
    if item.name in ("node_modules", ".git", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "src", "public", "quasar.config.ts", "index.html", "tsconfig.json", "package.json"):
        continue
    if item.is_file() and not (root / item.name).exists():
        shutil.copy2(item, root / item.name)

# Bring in generated Quasar directories and TypeScript app definitions but never replace
# existing Vue pages, business components, stores, assets or layouts.
seed_src = seed / "src"
for item in seed_src.rglob("*"):
    if not item.is_file():
        continue
    rel = item.relative_to(seed_src)
    if rel.parts[0] in ("pages", "layouts", "components", "assets", "router", "stores"):
        continue
    dest = root / "src" / rel
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(item, dest)
# Pinia bootstrap and Quasar CSS variables belong to the official starter.
for rel in ("stores/index.ts", "css/quasar.variables.sass", "css/quasar.variables.scss"):
    src = seed_src / rel
    if src.exists():
        dest = root / "src" / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)

# Existing Tailwind and font SCSS must remain unchanged and loaded by Quasar.
css = root / "src/css/app.scss"
css.parent.mkdir(parents=True, exist_ok=True)
css.write_text("@import '../styles/tailwind.scss';\n", encoding="utf-8")
# Use the original active design palette for Quasar's default theme.
sass = root / "src/css/quasar.variables.sass"
if sass.exists():
    body = sass.read_text(encoding="utf-8")
    body = re.sub(r"(?m)^(\$primary\s*:\s*).*$", r"\g<1>#242F9B", body)
    sass.write_text(body, encoding="utf-8")

# Use Quasar's generated entry point with the old application router and guards.
router = root / "src/router/index.ts"
text = router.read_text(encoding="utf-8")
if "defineRouter" not in text:
    text = "import { defineRouter } from '#q-app/wrappers'\n" + text
if "export default router" in text:
    text = text.replace("const router = createRouter({", "export default defineRouter(() => {\nconst router = createRouter({", 1)
    text = text.replace("export default router", "return router\n})", 1)
else:
    raise RuntimeError("Existing Vue router layout changed unexpectedly")
router.write_text(text, encoding="utf-8")
boot = root / "src/boot/telegram.ts"
boot.parent.mkdir(parents=True, exist_ok=True)
boot.write_text(
    "import { defineBoot } from '#q-app/wrappers'\n"
    "import { initTelegram } from '../plugins/telegram'\n"
    "export default defineBoot(() => { void initTelegram() })\n",
    encoding="utf-8",
)

# Patch only extension points exposed by official Quasar configuration.
qconfig = root / "quasar.config.ts"
conf = qconfig.read_text(encoding="utf-8")
# Insert a new boot dependency into generated boot array.
conf, boot_count = re.subn(r"\bboot:\s*\[", "boot: ['telegram', ", conf, count=1)
if boot_count != 1:
    raise RuntimeError("Official Quasar config did not expose boot array")
conf, env_count = re.subn(
    r"\bbuild:\s*\{",
    "build: {\n      env: { clientPrefix: ['QCLI_', 'VITE_'] },",
    conf,
    count=1,
)
if env_count != 1:
    raise RuntimeError("Official Quasar config did not expose build configuration")
# Ensure the generated config imports our app.scss; it already normally does.
if "app.scss" not in conf:
    conf, css_count = re.subn(r"\bcss:\s*\[", "css: ['app.scss', ", conf, count=1)
    if css_count != 1:
        raise RuntimeError("Official Quasar config did not expose css array")
qconfig.write_text(conf, encoding="utf-8")

# Keep original third-party integrations while adopting Quasar's known compatible
# package versions for Vue, vue-router and Pinia.
previous = json.loads((root / "package.json").read_text(encoding="utf-8"))
generated = json.loads((seed / "package.json").read_text(encoding="utf-8"))
for section in ("dependencies", "devDependencies"):
    generated.setdefault(section, {})
    for name, version in previous.get(section, {}).items():
        if name not in generated[section] and name not in ("vite", "vite-plugin-pwa", "@vitejs/plugin-vue", "@vitejs/plugin-basic-ssl", "@vue/tsconfig"):
            generated[section][name] = version

# Ensure npm can run Quasar commands using the repo's local CLI.
generated["name"] = "finclub-online"
generated["productName"] = "FinClub Online"
generated.setdefault("scripts", {})
generated["scripts"]["dev"] = "quasar dev"
generated["scripts"]["build"] = "quasar build"
generated["scripts"]["preview"] = "quasar serve dist/spa"
(root / "package.json").write_text(json.dumps(generated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# Merge scaffold ignore patterns with existing exclusions; avoid any secret output.
ignore = root / ".gitignore"
current = ignore.read_text(encoding="utf-8") if ignore.exists() else ""
starter = (seed / ".gitignore").read_text(encoding="utf-8") if (seed / ".gitignore").exists() else ""
extra = "\n".join(x for x in starter.splitlines() if x.strip() and x not in current)
ignore.write_text(current + "\n# Official Quasar CLI build artifacts\n" + extra + "\n.quasar/\n_quasar-seed/\n", encoding="utf-8")

# Remove obsolete Vite project entry/configuration, not source views or business code.
for obsolete in ("vite.config.ts", "tsconfig.app.json", "tsconfig.node.json", "src/main.ts"):
    f = root / obsolete
    if f.exists():
        f.unlink()
readme = root / "QUASAR_SETUP.md"
readme.write_text(
    "# FinClub Online — Quasar CLI + Vite\n\n"
    "App ID (Capacitor): \`ru.finclubonline\`. App display name: \`FinClub Online\`.\n\n"
    "Initialized from the official Quasar CLI generator in a fresh branch based on \`main\`.\n"
    "Existing views, components, layout, Pinia stores, router guards, Firebase modules, "
    "API clients, Inter fonts and Tailwind styles have been retained.\n\n"
    "Commands: \`npm install\`, \`npm run dev\`, \`npm run build\` (SPA).\n\n"
    "**PWA mode is intentionally not enabled; \`src-pwa\` is not created.**\n"
    "The old custom Firebase/Workbox worker source remains in the repository as "
    "legacy code; Firebase background notifications require separate service-worker "
    "integration and device testing before they can be considered operational.\n\n"
    "The generated Capacitor scaffolding stores its native \`appId\` in "
    "\`src-capacitor/capacitor.config.*\`. No Android or iOS binary is built here.\n",
    encoding="utf-8",
)
