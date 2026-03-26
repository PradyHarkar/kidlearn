import { v4 as uuidv4 } from "uuid";
import { COUNTRY_CONFIGS } from "@/lib/curriculum";
import { getItem, putItem, queryItems, TABLES, updateItem } from "@/lib/dynamodb";
import type {
  Child,
  Country,
  RewardCatalogItem,
  RewardRedemption,
  RewardTransaction,
} from "@/types";

const REWARD_CATALOG: RewardCatalogItem[] = [
  { rewardId: "au-apple-500", title: "Apple Gift Card", provider: "Apple", pointsCost: 500, currency: "AUD", valueMinor: 500, active: true },
  { rewardId: "au-amazon-1000", title: "Amazon Gift Card", provider: "Amazon", pointsCost: 1000, currency: "AUD", valueMinor: 1000, active: true },
  { rewardId: "us-amazon-500", title: "Amazon Gift Card", provider: "Amazon", pointsCost: 500, currency: "USD", valueMinor: 500, active: true },
  { rewardId: "us-target-1000", title: "Target Gift Card", provider: "Target", pointsCost: 1000, currency: "USD", valueMinor: 1000, active: true },
  { rewardId: "in-amazon-500", title: "Amazon Gift Card", provider: "Amazon", pointsCost: 500, currency: "INR", valueMinor: 500, active: true },
  { rewardId: "in-flipkart-1000", title: "Flipkart Gift Card", provider: "Flipkart", pointsCost: 1000, currency: "INR", valueMinor: 1000, active: true },
  { rewardId: "uk-amazon-500", title: "Amazon Gift Card", provider: "Amazon", pointsCost: 500, currency: "GBP", valueMinor: 500, active: true },
  { rewardId: "uk-tesco-1000", title: "Tesco Gift Card", provider: "Tesco", pointsCost: 1000, currency: "GBP", valueMinor: 1000, active: true },
];

function childBalance(child: Child): number {
  return Math.max(0, (child.rewardPoints || 0) - (child.rewardPointsRedeemed || 0));
}

export function getRewardCatalog(country: Country): RewardCatalogItem[] {
  const currency = COUNTRY_CONFIGS[country].currency;
  return REWARD_CATALOG.filter((reward) => reward.currency === currency && reward.active);
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

export async function getRewardSummary(userId: string) {
  const children = await queryItems(
    TABLES.CHILDREN,
    "userId = :userId",
    { ":userId": userId }
  ) as Child[];

  const balances = children.map((child) => ({
    childId: child.childId,
    childName: child.childName,
    balance: childBalance(child),
    rewardPoints: child.rewardPoints || 0,
    rewardPointsRedeemed: child.rewardPointsRedeemed || 0,
  }));

  return {
    balances,
    totalAvailable: balances.reduce((sum, balance) => sum + balance.balance, 0),
  };
}

export async function transferRewardPoints(
  userId: string,
  sourceChildId: string,
  targetChildId: string,
  points: number
) {
  if (sourceChildId === targetChildId) {
    throw new Error("Source and target child must be different");
  }

  const source = await loadChildForUser(userId, sourceChildId);
  const target = await loadChildForUser(userId, targetChildId);

  if (childBalance(source) < points) {
    throw new Error("Source child does not have enough points");
  }

  const sourceRewardPoints = Math.max(0, (source.rewardPoints || 0) - points);
  const targetRewardPoints = (target.rewardPoints || 0) + points;
  const timestamp = new Date().toISOString();

  await updateItem(
    TABLES.CHILDREN,
    { userId, childId: sourceChildId },
    "SET rewardPoints = :rewardPoints",
    { ":rewardPoints": sourceRewardPoints }
  );

  await updateItem(
    TABLES.CHILDREN,
    { userId, childId: targetChildId },
    "SET rewardPoints = :rewardPoints",
    { ":rewardPoints": targetRewardPoints }
  );

  await appendRewardTransaction({
    childId: sourceChildId,
    transactionId: `${timestamp}#${uuidv4()}`,
    userId,
    type: "merged_out",
    pointsDelta: -points,
    balanceAfter: sourceRewardPoints - (source.rewardPointsRedeemed || 0),
    relatedChildId: targetChildId,
    note: "Parent-approved sibling transfer",
    createdAt: timestamp,
  });

  await appendRewardTransaction({
    childId: targetChildId,
    transactionId: `${timestamp}#${uuidv4()}`,
    userId,
    type: "merged_in",
    pointsDelta: points,
    balanceAfter: targetRewardPoints - (target.rewardPointsRedeemed || 0),
    relatedChildId: sourceChildId,
    note: "Parent-approved sibling transfer",
    createdAt: timestamp,
  });
}

export async function redeemReward(
  userId: string,
  targetChildId: string,
  rewardId: string,
  sourceChildIds: string[]
): Promise<RewardRedemption> {
  const targetChild = await loadChildForUser(userId, targetChildId);
  const country = (targetChild.country as Country) ?? "AU";
  const reward = getRewardCatalog(country).find((item) => item.rewardId === rewardId);
  if (!reward) {
    throw new Error("Reward not found");
  }

  const uniqueSourceIds = Array.from(new Set(sourceChildIds.length ? sourceChildIds : [targetChildId]));
  const sourceChildren = await Promise.all(uniqueSourceIds.map((childId) => loadChildForUser(userId, childId)));
  const available = sourceChildren.reduce((sum, child) => sum + childBalance(child), 0);

  if (available < reward.pointsCost) {
    throw new Error("Not enough points across selected children");
  }

  let remaining = reward.pointsCost;
  const timestamp = new Date().toISOString();
  const redemptionId = uuidv4();

  for (const child of sourceChildren) {
    const balance = childBalance(child);
    const spend = Math.min(balance, remaining);
    if (spend <= 0) continue;

    await updateItem(
      TABLES.CHILDREN,
      { userId, childId: child.childId },
      "SET rewardPointsRedeemed = :redeemed",
      { ":redeemed": (child.rewardPointsRedeemed || 0) + spend }
    );

    await appendRewardTransaction({
      childId: child.childId,
      transactionId: `${timestamp}#${uuidv4()}`,
      userId,
      type: "redeemed",
      pointsDelta: -spend,
      balanceAfter: childBalance({
        ...child,
        rewardPointsRedeemed: (child.rewardPointsRedeemed || 0) + spend,
      }),
      rewardId,
      redemptionId,
      note: reward.title,
      createdAt: timestamp,
    });

    remaining -= spend;
    if (remaining <= 0) break;
  }

  const redemption: RewardRedemption = {
    childId: targetChildId,
    redemptionId,
    userId,
    rewardId,
    rewardTitle: reward.title,
    pointsSpent: reward.pointsCost,
    status: "pending",
    mergedFromChildIds: uniqueSourceIds.length > 1 ? uniqueSourceIds : undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await putItem(TABLES.REDEMPTIONS, redemption);
  return redemption;
}
