import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const repo = path.resolve(import.meta.dirname, "../../../..");
const require = createRequire(repo + "/package.json");
const ts = require("typescript");
const src = repo + "/components/mobiles/1";
const out = path.resolve(process.argv[2]);
const reactDir = path.dirname(require.resolve("react/package.json"));
const domDir = path.dirname(require.resolve("react-dom/package.json"));
const map = { "react": reactDir + "/index.js", "react/jsx-runtime": path.join(out, "__jsx-shim.mjs"), "react-dom/server": domDir + "/server.node.js" };
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "__jsx-shim.mjs"), fs.readFileSync(path.join(import.meta.dirname, "jsx-shim.mjs"), "utf8").replace("__REACT__", reactDir));
fs.writeFileSync(path.join(out, "__paths.json"), JSON.stringify({ react: reactDir + "/index.js", server: domDir + "/server.node.js" }));
for (const file of walk(src)) {
  const rel = path.relative(src, file);
  if (/\.test\.ts$/.test(rel) || rel.startsWith("tools/")) continue;
  const dest = path.join(out, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (file.endsWith(".module.css")) { fs.writeFileSync(dest + ".js", "export default new Proxy({}, { get: (_, k) => String(k) });\n"); continue; }
  if (!/\.tsx?$/.test(file)) continue;
  let js = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, verbatimModuleSyntax: false } }).outputText;
  js = js.replace(/from\s+"([^"]+)"/g, (m, spec) => {
    if (map[spec]) return `from "${map[spec]}"`;
    if (!spec.startsWith(".")) return m;
    if (spec.endsWith(".module.css")) return `from "${spec}.js"`;
    const base = path.resolve(path.dirname(file), spec.replace(/\.tsx?$/, ""));
    if (fs.existsSync(base + ".ts") || fs.existsSync(base + ".tsx")) return `from "${spec.replace(/\.tsx?$/, "")}.js"`;
    return `from "${spec}/index.js"`;
  });
  fs.writeFileSync(dest.replace(/\.tsx?$/, ".js"), js);
}
