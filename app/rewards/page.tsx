"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Mascot } from "@/components/mascot/Mascot";
import type { Child, Country, RewardCatalogItem, RewardShopItem } from "@/types";

interface RewardBalance {
  childId: string;
  childName: string;
  balance: number;
  rewardPoints: number;
  rewardPointsRedeemed: number;
}

export default function RewardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [balances, setBalances] = useState<RewardBalance[]>([]);
  const [catalog, setCatalog] = useState<RewardCatalogItem[]>([]);
  const [shopItems, setShopItems] = useState<RewardShopItem[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [working, setWorking] = useState(false);
  const [shopWorking, setShopWorking] = useState(false);
  const [transferForm, setTransferForm] = useState({
    sourceChildId: "",
    targetChildId: "",
    points: "20",
  });
  const [redeemForm, setRedeemForm] = useState({
    targetChildId: "",
    rewardId: "",
    sourceChildIds: [] as string[],
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [router, status]);

  useEffect(() => {
    if (status === "authenticated") {
      void loadData();
    }
  }, [status]);

  const loadData = async () => {
    setLoading(true);
    try {
      const country = (session?.user?.country as Country) ?? "AU";
      const [childrenRes, summaryRes, catalogRes, shopRes] = await Promise.all([
        fetch("/api/children"),
        fetch("/api/rewards/summary"),
        fetch(`/api/rewards/catalog?country=${country}`),
        fetch("/api/rewards/shop"),
      ]);

      const childrenData = await childrenRes.json();
      const summaryData = await summaryRes.json();
      const catalogData = await catalogRes.json();
      const shopData = await shopRes.json();
      const nextCatalog = catalogData.catalog || catalogData.rewards || [];

      if (!childrenRes.ok) throw new Error(childrenData.error || "Failed to load children");
      if (!summaryRes.ok) throw new Error(summaryData.error || "Failed to load reward summary");
      if (!catalogRes.ok) throw new Error(catalogData.error || "Failed to load rewards catalog");

      const nextChildren = childrenData.children || [];
      const nextBalances = summaryData.balances || [];

      setChildren(nextChildren);
      setBalances(nextBalances);
      setCatalog(nextCatalog);
      setShopItems(shopData.items || []);
      setTotalAvailable(summaryData.totalAvailable || 0);

      setTransferForm((current) => ({
        sourceChildId: current.sourceChildId || nextChildren[0]?.childId || "",
        targetChildId: current.targetChildId || nextChildren[1]?.childId || nextChildren[0]?.childId || "",
        points: current.points || "20",
      }));

      setRedeemForm((current) => ({
        targetChildId: current.targetChildId || nextChildren[0]?.childId || "",
        rewardId: current.rewardId || nextCatalog[0]?.rewardId || "",
        sourceChildIds: current.sourceChildIds.length ? current.sourceChildIds : nextChildren[0]?.childId ? [nextChildren[0].childId] : [],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load rewards";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRedeemSource = (childId: string) => {
    setRedeemForm((current) => ({
      ...current,
      sourceChildIds: current.sourceChildIds.includes(childId)
        ? current.sourceChildIds.filter((id) => id !== childId)
        : [...current.sourceChildIds, childId],
    }));
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.sourceChildId === transferForm.targetChildId) {
      toast.error("Choose two different children for a points transfer");
      return;
    }
    setWorking(true);
    try {
      const res = await fetch("/api/rewards/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceChildId: transferForm.sourceChildId,
          targetChildId: transferForm.targetChildId,
          points: Number(transferForm.points),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to transfer points");

      toast.success("Points moved between children");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to transfer points";
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorking(true);
    try {
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(redeemForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to redeem reward");

      toast.success(`${data.redemption.rewardTitle} redemption created`);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to redeem reward";
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handleShopRedeem = async (childId: string, itemId: string) => {
    setShopWorking(true);
    try {
      const res = await fetch("/api/rewards/shop/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to redeem shop item");

      toast.success(`${data.purchase.itemTitle} unlocked`);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to redeem shop item";
      toast.error(message);
    } finally {
      setShopWorking(false);
    }
  };

  const selectedReward = catalog.find((item) => item.rewardId === redeemForm.rewardId) || null;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 to-blue-500">
        <div className="text-center text-white">
          <div className="spinner mx-auto mb-4" />
          <p className="font-black text-xl">Loading rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-100">
      <header className="bg-white shadow-card px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between sm:items-center">
        <div>
          <p className="text-sm font-bold text-emerald-600 uppercase tracking-[0.2em]">Family Rewards</p>
          <h1 className="text-xl sm:text-2xl font-black text-gray-800">Gift cards and shop items powered by learning points</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-secondary text-sm py-2 px-4">Back</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-500 to-cyan-600 rounded-4xl p-5 sm:p-6 text-white flex flex-col xl:flex-row gap-5 xl:gap-6 justify-between"
        >
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-white/80">Available Now</p>
            <h2 className="text-3xl sm:text-4xl font-black mt-2">{totalAvailable} family points</h2>
            <p className="font-semibold text-white/85 mt-2 max-w-2xl">
              Each completed 20-question set earns 20 points for that child. Parents can combine siblings&apos; points and
              redeem gift cards from one place.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <Mascot mood="celebrating" size="md" />
          </div>
        </motion.section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {balances.map((balance) => (
            <div key={balance.childId} className="bg-white rounded-3xl shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-black text-gray-800">{balance.childName}</h3>
                <span className="text-sm font-black text-emerald-700 bg-emerald-50 rounded-full px-3 py-1">
                  {balance.balance} pts
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-center">
                  <p className="text-2xl font-black text-blue-700">{balance.rewardPoints}</p>
                  <p className="text-xs font-bold text-blue-600">Earned</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 text-center">
                  <p className="text-2xl font-black text-amber-700">{balance.rewardPointsRedeemed}</p>
                  <p className="text-xs font-bold text-amber-600">Redeemed</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
          <div className="bg-white rounded-4xl shadow-card p-5 sm:p-6">
            <h2 className="text-2xl font-black text-gray-800 mb-2">Combine sibling points</h2>
            <p className="text-sm font-semibold text-gray-500 mb-5">
              Move points from one child to another before redeeming a shared family reward.
            </p>

            <form onSubmit={handleTransfer} className="space-y-4">
              {children.length < 2 && (
                <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 text-sm font-semibold text-amber-700">
                  Add a second child profile before moving points between siblings.
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Move from</label>
                <select
                  value={transferForm.sourceChildId}
                  onChange={(e) => setTransferForm((current) => ({ ...current, sourceChildId: e.target.value }))}
                  className="input-field"
                >
                  {balances.map((balance) => (
                    <option key={balance.childId} value={balance.childId}>
                      {balance.childName} ({balance.balance} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Move to</label>
                <select
                  value={transferForm.targetChildId}
                  onChange={(e) => setTransferForm((current) => ({ ...current, targetChildId: e.target.value }))}
                  className="input-field"
                >
                  {children.map((child) => (
                    <option key={child.childId} value={child.childId}>
                      {child.childName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Points</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={transferForm.points}
                  onChange={(e) => setTransferForm((current) => ({ ...current, points: e.target.value }))}
                  className="input-field"
                />
              </div>

              <button
                type="submit"
                disabled={working || children.length < 2 || !transferForm.sourceChildId || !transferForm.targetChildId}
                className="w-full btn-primary disabled:opacity-60"
              >
                {working ? "Working..." : "Transfer Points"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-4xl shadow-card p-5 sm:p-6">
            <h2 className="text-2xl font-black text-gray-800 mb-2">Redeem gift cards</h2>
            <p className="text-sm font-semibold text-gray-500 mb-5">
              Pick the child who will receive the reward and choose which siblings&apos; points should contribute.
            </p>

            <form onSubmit={handleRedeem} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Reward</label>
                <select
                  value={redeemForm.rewardId}
                  onChange={(e) => setRedeemForm((current) => ({ ...current, rewardId: e.target.value }))}
                  className="input-field"
                >
                  {catalog.map((reward) => (
                    <option key={reward.rewardId} value={reward.rewardId}>
                      {reward.title} ({reward.pointsCost} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Redeem for</label>
                <select
                  value={redeemForm.targetChildId}
                  onChange={(e) => setRedeemForm((current) => ({ ...current, targetChildId: e.target.value }))}
                  className="input-field"
                >
                  {children.map((child) => (
                    <option key={child.childId} value={child.childId}>
                      {child.childName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Use points from</label>
                <div className="flex flex-wrap gap-2">
                  {balances.map((balance) => {
                    const selected = redeemForm.sourceChildIds.includes(balance.childId);
                    return (
                      <button
                        key={balance.childId}
                        type="button"
                        onClick={() => toggleRedeemSource(balance.childId)}
                        className={`rounded-full px-4 py-2 border-2 font-bold text-sm transition-colors ${
                          selected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-white text-gray-600"
                        }`}
                      >
                        {balance.childName} ({balance.balance})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Selected reward</p>
                <p className="text-2xl font-black text-slate-800 mt-2">{selectedReward?.title || "Choose a reward"}</p>
                <p className="text-sm font-semibold text-slate-500 mt-1">
                  Cost: {selectedReward?.pointsCost || 0} points
                </p>
              </div>

              <button
                type="submit"
                disabled={working || !redeemForm.targetChildId || !redeemForm.rewardId || redeemForm.sourceChildIds.length === 0}
                className="w-full btn-primary disabled:opacity-60"
              >
                {working ? "Working..." : "Redeem Reward"}
              </button>
            </form>
          </div>
        </section>

        <section className="bg-white rounded-4xl shadow-card p-5 sm:p-6">
          <h2 className="text-2xl font-black text-gray-800 mb-4">Gift card catalog</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {catalog.map((reward) => (
              <div key={reward.rewardId} className="rounded-3xl border-2 border-slate-100 p-4 bg-gradient-to-br from-white to-slate-50">
                <p className="text-sm font-black text-cyan-600 uppercase tracking-[0.2em]">{reward.provider}</p>
                <h3 className="text-xl font-black text-slate-800 mt-2">{reward.title}</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">Requires {reward.pointsCost} points</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-4xl shadow-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-black text-gray-800">Reward shop</h2>
              <p className="text-sm font-semibold text-gray-500">Spend points on avatars, themes, and sticker packs.</p>
            </div>
            <span className="text-sm font-black text-purple-700 bg-purple-50 rounded-full px-3 py-1">
              {shopItems.length} items
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {shopItems.map((item) => (
              <div key={item.itemId} className="rounded-3xl border-2 border-purple-100 p-4 bg-gradient-to-br from-white to-purple-50">
                <div className="text-4xl mb-2">{item.icon}</div>
                <p className="text-sm font-black text-purple-600 uppercase tracking-[0.2em]">{item.category}</p>
                <h3 className="text-xl font-black text-slate-800 mt-2">{item.title}</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">{item.description}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-slate-700">{item.pointsCost} pts</span>
                  <button
                    onClick={() => handleShopRedeem(redeemForm.targetChildId || children[0]?.childId || "", item.itemId)}
                    disabled={shopWorking || !children.length}
                    className="btn-primary text-sm py-2 px-4 disabled:opacity-60"
                  >
                    {shopWorking ? "Working..." : "Buy for child"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
