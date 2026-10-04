import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const DIRS = [
  "app",
  "components",
  "lib",
  "actions",
  "services",
  "hooks",
  "utils",
];
const EXTS = new Set([".ts", ".tsx"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (EXTS.has(path.extname(e.name))) out.push(full);
  }
  return out;
}

function strip(text) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.JSX,
    text,
  );
  const ranges = [];
  let t;
  while ((t = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
    if (
      t === ts.SyntaxKind.SingleLineCommentTrivia ||
      t === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      ranges.push([scanner.getTokenStart(), scanner.getTokenEnd()]);
    }
  }
  for (let i = ranges.length - 1; i >= 0; i--) {
    text = text.slice(0, ranges[i][0]) + text.slice(ranges[i][1]);
  }
  return text;
}

let count = 0;
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const before = fs.readFileSync(file, "utf8");
    const after = strip(before);
    if (after !== before) {
      fs.writeFileSync(file, after);
      count++;
    }
  }
}
console.log(`Stripped comments from ${count} files.`);
