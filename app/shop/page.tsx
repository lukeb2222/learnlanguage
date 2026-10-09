"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/components/UserProvider";
import { Mascot } from "@/components/ui";
import { MAX_FREEZES, OUTFITS, SHOP_ITEMS } from "@/lib/game";
import { sfx } from "@/lib/sound";

export default function ShopPage() {
  return (
    <AppShell>
      <Shop />
    </AppShell>
  );
}

function Shop() {
  const { user, action } = useUser();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!user) return null;

  async function buy(id: string, name: string) {
    try {
      await action({ type: "buy", item: id });
      sfx.complete();
      setMsg({ ok: true, text: `${name} — done!` });
    } catch (e) {
      sfx.wrong();
      setMsg({ ok: false, text: (e as Error).message });
    }
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center gap-4">
        <Mascot size={80} outfit={user.avatar.outfit} />
        <div>
          <h1 className="text-3xl font-bold">Shop</h1>
          <p className="text-ink/60">Spend the gems you earn. No real money, ever. You have 💎 {user.stats.gems}.</p>
        </div>
      </div>
      {msg && <div className={`mb-4 animate-pop rounded-2xl p-3 text-center font-bold ${msg.ok ? "bg-mint-100 text-mint-600" : "bg-coral-100 text-coral-600"}`}>{msg.text}</div>}

      <h2 className="mb-3 text-xl font-bold">Power-ups</h2>
      <div className="card mb-8 divide-y-2 divide-grape-100">
        {SHOP_ITEMS.map((it) => (
          <div key={it.id} className="flex items-center gap-4 p-5">
            <span className="text-5xl">{it.icon}</span>
            <div className="flex-1">
              <div className="font-bold">{it.name}</div>
              <div className="text-sm text-ink/60">{it.desc}</div>
              {it.id === "freeze" && (
                <div className="mt-1 text-xs font-bold text-sky2-600">
                  {user.stats.streakFreezes}/{MAX_FREEZES} equipped
                </div>
              )}
            </div>
            <button className="btn btn-ghost shrink-0 px-4 py-2 text-sky2-600" onClick={() => buy(it.id, it.name)}>
              💎 {it.price}
            </button>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-xl font-bold">Outfits for Glo</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {OUTFITS.map((o) => {
          const owned = user.ownedItems.includes(o.id);
          const equipped = user.avatar.outfit === o.id;
          return (
            <div key={o.id} className={`card flex flex-col items-center p-4 ${equipped ? "border-grape-400" : ""}`}>
              <Mascot size={70} outfit={o.id} />
              <div className="mt-2 text-center text-sm font-bold">{o.name}</div>
              <button
                className={`btn mt-2 w-full px-2 py-1.5 text-xs ${equipped ? "btn-ghost" : owned ? "btn-primary" : "btn-ghost text-sky2-600"}`}
                disabled={equipped}
                onClick={() => (owned ? action({ type: "equipOutfit", item: o.id }) : buy(o.id, o.name))}
              >
                {equipped ? "Equipped" : owned ? "Equip" : `💎 ${o.price}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
