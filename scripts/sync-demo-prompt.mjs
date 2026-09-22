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
// 구조화 출력 스키마 (브라우저 직접 호출 모드). print-schemas.mts 가 zod 에서 만든다.
import { execFileSync } from "node:child_process";
const schemasJson = execFileSync(process.execPath, ["--experimental-strip-types", new URL("./print-schemas.mts", import.meta.url).pathname], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const html3 = readFileSync(demoPath, "utf8");
const sb = "/* SCHEMAS:BEGIN */", se = "/* SCHEMAS:END */";
const sa = html3.indexOf(sb), sz = html3.indexOf(se);
if (sa < 0 || sz < 0) throw new Error("SCHEMAS markers not found in demo");
const finalHtml = html3.slice(0, sa + sb.length) + "\n  const SCHEMAS = " + schemasJson + ";\n  " + html3.slice(sz);
writeFileSync(demoPath, finalHtml);

// GitHub Pages 용 독립 실행 페이지. Artifact 는 html/head/body 뼈대를 씌워 주지만 일반 웹에서는 직접 넣어야 한다.
// title/link/style 은 head 에, div/script 는 body 에 들어간다.
const bodyStart = finalHtml.indexOf('<div class="app"');
const headPart = finalHtml.slice(0, bodyStart), bodyPart = finalHtml.slice(bodyStart);
const pagesHtml = `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="color-scheme" content="light dark">\n<style>body{margin:0}</style>\n${headPart}</head>\n<body>\n${bodyPart}</body>\n</html>\n`;
writeFileSync(new URL("../docs/index.html", import.meta.url), pagesHtml);
console.log(`synced ${core.length} chars of prompt, ${Object.keys(lessons).length} lesson plans and schemas into demo/coco-demo.html; wrote docs/index.html`);
