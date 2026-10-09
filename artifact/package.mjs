// Turns the Vite single-file build into an Artifact page body: the publisher
// adds its own <!doctype>/<html>/<head>/<body>, so emit only the content, with
// <title> first (it must sit in the first 8 KB).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "artifact-dist/index.html"), "utf8");
const pick = (re) => [...src.matchAll(re)].map((m) => m[0]);

const title = pick(/<title>[\s\S]*?<\/title>/g)[0] ?? "<title>Lingora</title>";
const links = pick(/<link\b[^>]*>/g).join("\n");
const styles = pick(/<style\b[^>]*>[\s\S]*?<\/style>/g).join("\n");
const scripts = pick(/<script\b[^>]*>[\s\S]*?<\/script>/g).join("\n");

const out = `${title}\n${links}\n${styles}\n<div id="root"></div>\n${scripts}\n`;
fs.writeFileSync(path.join(root, "artifact-dist/lingora.html"), out);
console.log(`artifact-dist/lingora.html ${(out.length / 1024).toFixed(0)} KB`);
