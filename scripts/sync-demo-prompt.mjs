// src/lib/tutor/prompt.ts 의 TUTOR_CORE_PROMPT 를 demo/coco-demo.html 에 복사한다.
// 사용: node scripts/sync-demo-prompt.mjs   (선생님 지침을 바꾼 뒤 실행)
import { readFileSync, writeFileSync } from "node:fs";

const ts = readFileSync(new URL("../src/lib/tutor/prompt.ts", import.meta.url), "utf8");
const m = ts.match(/export const TUTOR_CORE_PROMPT = `([\s\S]*?)`;/);
if (!m) throw new Error("TUTOR_CORE_PROMPT not found");
const core = m[1];

const demoPath = new URL("../demo/coco-demo.html", import.meta.url);
const html = readFileSync(demoPath, "utf8");
const begin = "/* PROMPT:BEGIN */", end = "/* PROMPT:END */";
const a = html.indexOf(begin), b = html.indexOf(end);
if (a < 0 || b < 0) throw new Error("PROMPT markers not found in demo");
const escaped = core.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const next = html.slice(0, a + begin.length) + "\n  const CORE = `" + escaped + "`;\n  " + html.slice(b);
writeFileSync(demoPath, next);
console.log(`synced ${core.length} chars into demo/coco-demo.html`);
