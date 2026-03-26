import { v4 as uuidv4 } from "uuid";
import { getItem, putItem, updateItem, TABLES } from "@/lib/dynamodb";
import type { Child, RewardShopItem, RewardShopPurchase, RewardTransaction } from "@/types";

const SHOP_ITEMS: RewardShopItem[] = [
  {
    itemId: "avatar-space-hero",
    title: "Space Hero Avatar",
    description: "A shiny explorer avatar for brave learners.",
    category: "avatar",
    icon: "🚀",
    pointsCost: 120,
    active: true,
  },
  {
    itemId: "theme-ocean-wave",
    title: "Ocean Wave Theme",
    description: "A calm blue theme with ocean bubbles.",
    category: "theme",
    icon: "🌊",
    pointsCost: 180,
    active: true,
  },
  {
    itemId: "sticker-gold-star",
    title: "Gold Star Sticker Pack",
    description: "Collectible stars for the profile board.",
    category: "sticker",
    icon: "⭐",
    pointsCost: 80,
    active: true,
  },
  {
    itemId: "avatar-jungle-explorer",
    title: "Jungle Explorer Avatar",
    description: "A bold explorer avatar with a trail hat.",
    category: "avatar",
    icon: "🧭",
    pointsCost: 160,
    active: true,
  },
];

function childBalance(child: Child): number {
  return Math.max(0, (child.rewardPoints || 0) - (child.rewardPointsRedeemed || 0));
}

export function getRewardShopItems() {
  return SHOP_ITEMS.filter((item) => item.active);
}

async function loadChildForUser(userId: string, childId: string): Promise<Child> {
  const child = await getItem(TABLES.CHILDREN, { userId, childId });
  if (!child) {
    throw new Error("Child not found");
  }
  return child as Child;
}

async function appendRewardTransaction(transaction: RewardTransaction): Promise<void> {
  await putItem(TABLES.REWARD_TRANSACTIONS, transaction);
}

export async function redeemShopItem(
  userId: string,
  childId: string,
  itemId: string
): Promise<RewardShopPurchase> {
  const child = await loadChildForUser(userId, childId);
  const item = getRewardShopItems().find((entry) => entry.itemId === itemId);
  if (!item) {
    throw new Error("Shop item not found");
  }

  const balance = childBalance(child);
  if (balance < item.pointsCost) {
    throw new Error("Not enough points");
  }

  const timestamp = new Date().toISOString();
  const purchaseId = uuidv4();
  const updatedRedeemed = (child.rewardPointsRedeemed || 0) + item.pointsCost;

  await updateItem(
    TABLES.CHILDREN,
    { userId, childId },
    "SET rewardPointsRedeemed = :redeemed",
    { ":redeemed": updatedRedeemed }
  );

  await appendRewardTransaction({
    childId,
    transactionId: `${timestamp}#${uuidv4()}`,
    userId,
    type: "redeemed",
    pointsDelta: -item.pointsCost,
    balanceAfter: childBalance({ ...child, rewardPointsRedeemed: updatedRedeemed }),
    rewardId: item.itemId,
    redemptionId: purchaseId,
    note: item.title,
    createdAt: timestamp,
  });

  return {
    childId,
    purchaseId,
    userId,
    itemId: item.itemId,
    itemTitle: item.title,
    pointsSpent: item.pointsCost,
    status: "fulfilled",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
