import { redirect } from "next/navigation";
import Welcome from "@/components/Welcome";
import { currentVisitor } from "@/lib/entry/visitor";
import { balanceStore } from "@/lib/entry/balance";

export const dynamic = "force-dynamic";

/** 꾸그(또는 초대 코드)에서 들어온 뒤 처음 보는 화면. 아이를 맞이하고 오늘 수업을 고른다. */
export default async function WelcomePage() {
  const visitor = await currentVisitor();
  if (!visitor) redirect("/?entry=missing");
  const minutes = await balanceStore.get(visitor.uid);
  return (
    <main className="shell">
      <Welcome visitor={{ name: visitor.name, age: visitor.age, level: visitor.level ?? null, source: visitor.source }} minutes={minutes} />
    </main>
  );
}
