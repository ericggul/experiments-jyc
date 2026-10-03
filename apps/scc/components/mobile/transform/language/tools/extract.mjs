// Static inventory of the visible interface strings in clone/1–13.
// Usage (from apps/scc): node components/mobile/transform/language/tools/extract.mjs > /tmp/strings.json
// Template literals become patterns with indexed holes: `${n}개` → "{0}개".
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../clone");

const hiddenAttributes = new Set(["className", "aria-label", "alt", "key", "href", "src", "type", "name", "autoComplete", "pattern", "accept", "role", "id", "lang", "d", "viewBox", "style", "htmlFor", "aria-describedby", "aria-labelledby", "fill", "stroke", "loading", "data-person", "min", "max", "step", "value", "defaultValue", "title", "strokeLinecap", "strokeLinejoin", "aria-hidden", "aria-current", "form", "aria-live", "aria-pressed", "aria-expanded", "aria-invalid", "data-feed", "target", "rel", "crossOrigin", "preload", "inputMode", "enterKeyHint"]);
const visibleProperties = new Set(["name", "label", "title", "brand", "category", "options", "amenities", "status", "area", "town", "theme", "condition", "size", "neighborhood", "action", "time", "deadline", "client", "distance", "extra", "region", "seller", "views", "followers", "likes", "handle"]);
const proseProperties = new Set(["description", "body", "bio", "alt", "note", "caption", "sound", "bring", "address", "src", "image", "photo", "poster", "tone", "initials", "color", "mark", "id"]);
const visibleCalls = /^set(Notice|Error|Toast|FormError|StorageNote)$|^(empty|setCustomValidity)$/;

const hasWords = (text) => /[\p{L}]/u.test(text);
const clean = (text) => text.replace(/\s+/g, " ").trim();

function templatePattern(node) {
  let text = node.head.text;
  node.templateSpans.forEach((span, index) => { text += `{${index}}` + span.literal.text; });
  return text;
}

function contextOf(node) {
  // Walk up until a decisive ancestor says whether this string is rendered.
  let child = node;
  for (let parent = node.parent; parent; child = parent, parent = parent.parent) {
    if (ts.isJsxAttribute(parent)) {
      const name = parent.name.getText();
      return hiddenAttributes.has(name) || name.startsWith("on") ? null : `attr:${name}`;
    }
    if (ts.isBinaryExpression(parent) && /^(===|!==|==|!=)$/.test(parent.operatorToken.getText())) return null;
    if (ts.isElementAccessExpression(parent) && parent.argumentExpression === child) return null;
    if (ts.isCallExpression(parent)) {
      const callee = parent.expression.getText();
      if (visibleCalls.test(callee.split(".").at(-1))) return `call:${callee}`;
      if (/includes|find|filter|getItem|setItem|toLocale|Intl|NumberFormat|split|replace|padStart|slice|get$|querySelector|photo|useState|setTab|setView|setMode|setModal|setSort|setCategory|setFilter|navigate|nav$|setSheet|setFeed|setSearchKind|setProfileKind|setMessage|setQuery/.test(callee)) return null;
      continue;
    }
    if (ts.isPropertyAssignment(parent)) {
      const key = parent.name.getText().replace(/['"]/g, "");
      if (proseProperties.has(key)) return null;
      if (visibleProperties.has(key)) return `prop:${key}`;
      if (parent.initializer === child && /^[a-z]+$/.test(key)) { /* record literal such as {catalog:'발견'}[view] */ continue; }
      return null;
    }
    if (ts.isTypeNode(parent) || ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isCaseClause(parent)) return null;
    if (ts.isJsxExpression(parent)) { if (ts.isJsxAttribute(parent.parent)) continue; return "jsx"; }
    if (ts.isArrayLiteralExpression(parent)) continue;
    if (ts.isVariableDeclaration(parent)) return /people|neighborhoods|areas|sizes|activities|categories|themes/.test(parent.name.getText()) ? `const:${parent.name.getText()}` : null;
  }
  return null;
}

const inventory = {};
for (const clone of fs.readdirSync(root).filter((name) => /^\d+$/.test(name)).sort((a, b) => a - b)) {
  const found = new Map();
  const files = [path.join(root, clone, "screen/index.tsx"), ...fs.readdirSync(path.join(root, clone, "model")).filter((file) => /\.ts$/.test(file) && !/test/.test(file)).map((file) => path.join(root, clone, "model", file))];
  for (const file of files) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const add = (text, context) => {
      const value = clean(text);
      if (!value || !hasWords(value) || value.length > 160) return;
      if (/^(https?:|\/|#|\.|[a-z]+[A-Z][a-zA-Z]*$|[a-z0-9-]+\.(mp4|webp|png)$)/.test(value)) return;
      const words = value.replace(/\{\d+\}/g, "");
      if (!hasWords(words) || /-option-|-request-|-amenity-/.test(value)) return;
      if (/^[\d.,:%+]+[KMkmhdBs]?$|^[A-Z]{1,2}$/.test(words.trim())) return;
      if (!/text|attr:placeholder|call:/.test(context) && /^[a-z][a-z0-9.-]*$/.test(value)) return;
      if (context === "prop:handle") return;
      if (!found.has(value)) found.set(value, new Set());
      found.get(value).add(context);
    };
    const visit = (node) => {
      if (ts.isJsxText(node)) add(node.text, "jsx-text");
      else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) { const context = contextOf(node); if (context) add(node.text, context); }
      else if (ts.isTemplateExpression(node)) { const context = contextOf(node); if (context) add(templatePattern(node), `template:${context}`); }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  inventory[clone] = Object.fromEntries([...found].map(([text, contexts]) => [text, [...contexts].join(",")]));
}
process.stdout.write(JSON.stringify(inventory, null, 1));
