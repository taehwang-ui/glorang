// 꾸그 [시작하기] 링크를 흉내내는 테스트용 토큰 생성기.
// 사용: GGUGE_HANDOFF_SECRET=... node scripts/make-handoff-token.mjs --name Mina --age 8 --minutes 60 --uid parent-123 --base http://localhost:3000
import { createHmac, randomBytes } from "node:crypto";

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith("--") ? [a.slice(2), arr[i + 1]] : [])).filter((p) => p.length));
const secret = process.env.GGUGE_HANDOFF_SECRET;
if (!secret || secret.length < 16) {
  console.error("GGUGE_HANDOFF_SECRET (16자 이상) 환경변수가 필요합니다.");
  process.exit(1);
}
const now = Math.floor(Date.now() / 1000);
const payload = {
  v: 1,
  uid: args.uid ?? "parent-demo",
  child: { name: args.name ?? "Mina", age: Number(args.age ?? 8), ...(args.level ? { level: args.level } : {}) },
  minutes: Number(args.minutes ?? 60),
  iat: now,
  exp: now + Number(args.ttl ?? 600),
  nonce: randomBytes(12).toString("base64url"),
};
const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
const sig = createHmac("sha256", secret).update(body).digest("base64url");
const token = `${body}.${sig}`;
const base = (args.base ?? "http://localhost:3000").replace(/\/$/, "");
console.log(`${base}/start?token=${token}`);
