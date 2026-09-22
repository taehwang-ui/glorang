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
// 수업 계획도 함께 복사한다 (lessons.ts 의 LESSONS 마커 사이 객체 리터럴).
const lt = readFileSync(new URL("../src/lib/tutor/lessons.ts", import.meta.url), "utf8");
const lm = lt.match(/\/\* LESSONS:BEGIN \*\/[\s\S]*?= (\{[\s\S]*?\});\s*\/\* LESSONS:END \*\//);
if (!lm) throw new Error("LESSONS markers not found in lessons.ts");
const lessons = new Function("return (" + lm[1] + ")")();
const html2 = readFileSync(demoPath, "utf8");
const lb = "/* LESSONS:BEGIN */", le = "/* LESSONS:END */";
const la = html2.indexOf(lb), lz = html2.indexOf(le);
if (la < 0 || lz < 0) throw new Error("LESSONS markers not found in demo");
writeFileSync(demoPath, html2.slice(0, la + lb.length) + "\n  const LESSON_PLANS = " + JSON.stringify(lessons) + ";\n  " + html2.slice(lz));
console.log(`synced ${core.length} chars of prompt and ${Object.keys(lessons).length} lesson plans into demo/coco-demo.html`);
