import type { Card } from "../src/engine/card";
import type { Player } from "../src/engine/player";
import { Zone } from "../src/engine/zones";
import {
  recalculateKl,
  checkGodThreshold,
  canSpendGodCharges,
  spendGodCharges,
  GOD_THRESHOLD_KL,
  ABSOLUTE_KL_CAP,
} from "../src/engine/resources";

function makeDummyDeity(
  cardId: string,
  name: string,
  startingEssence: number,
  baseKl: number,
  ownerId: string
): Card {
  return {
    cardId,
    name,
    typeLine: "DEITY",
    subtypes: [],
    domainTag: undefined,
    klCost: 0,
    power: undefined,
    guard: undefined,
    startingEssence,
    baseKl,
    abilities: [],
    isToken: false,

    ownerId,
    controllerId: ownerId,
    zone: Zone.DEITY_ZONE,
    damageMarked: 0,
    tapped: false,
    temporaryModifiers: [],
  };
}

function makePlayerWithShards(
  id: string,
  baseKl: number,
  shardCount: number
): Player {
  const deity = makeDummyDeity(
    `D-${id}`,
    `Deity-${id}`,
    20,
    baseKl,
    id
  );

  const shardCard: Card = {
    cardId: "SHARD",
    name: "Test Shard",
    typeLine: "SHARD",
    subtypes: [],
    domainTag: undefined,
    klCost: 0,
    power: undefined,
    guard: undefined,
    startingEssence: undefined,
    baseKl: undefined,
    abilities: [],
    isToken: false,

    ownerId: id,
    controllerId: id,
    zone: Zone.SHARD_ROW,
    damageMarked: 0,
    tapped: false,
    temporaryModifiers: [],
  };

  return {
    id,
    deity,
    essence: deity.startingEssence ?? 0,
    baseKl,
    currentKl: baseKl,
    godCharges: 0,
    klThresholdTriggeredThisTurn: false,

    hand: [],
    veiledDeck: [],
    crypt: [],
    nullZone: [],
    domainZone: null,
    shardRow: Array.from({ length: shardCount }, () => ({ ...shardCard })),
    avatarLine: [],
    relicSupportZone: [],

    turnsTaken: 0,
  };
}

describe("KL recalculation", () => {
  test("KL = baseKl + number of shards", () => {
    const player = makePlayerWithShards("P1", 3, 2); // baseKl 3 + 2 shards = 5
    const newKl = recalculateKl(player);
    expect(newKl).toBe(5);
  });

  test("KL is capped at ABSOLUTE_KL_CAP", () => {
    const highBase = 25;
    const manyShards = 10; // 25 + 10 = 35 > 31 -> clamp to 31
    const player = makePlayerWithShards("P2", highBase, manyShards);
    const newKl = recalculateKl(player);
    expect(newKl).toBe(ABSOLUTE_KL_CAP);
  });

  test("KL is clamped to a minimum of 0", () => {
    const player = makePlayerWithShards("P3", -10, 0); // weird negative base KL
    const newKl = recalculateKl(player);
    expect(newKl).toBe(0);
  });
});

describe("God threshold (13 KL) and charges", () => {
  test("crossing the threshold grants 1 God Charge and sets flag", () => {
    const player = makePlayerWithShards("P1", 12, 0);
    player.currentKl = 12;
    player.godCharges = 0;
    player.klThresholdTriggeredThisTurn = false;

    const oldKl = 12;
    const newKl = GOD_THRESHOLD_KL; // 13

    checkGodThreshold(player, oldKl, newKl);

    expect(player.godCharges).toBe(1);
    expect(player.klThresholdTriggeredThisTurn).toBe(true);
  });

  test("threshold only grants one charge per turn", () => {
    const player = makePlayerWithShards("P1", 12, 1);
    player.currentKl = 12;
    player.godCharges = 0;
    player.klThresholdTriggeredThisTurn = false;

    // First crossing
    checkGodThreshold(player, 12, GOD_THRESHOLD_KL);
    expect(player.godCharges).toBe(1);
    expect(player.klThresholdTriggeredThisTurn).toBe(true);

    // Even if KL goes higher after, no extra charge this turn
    checkGodThreshold(player, GOD_THRESHOLD_KL, 20);
    expect(player.godCharges).toBe(1);
  });

  test("cannot exceed max God Charges", () => {
    const player = makePlayerWithShards("P1", 12, 1);
    player.currentKl = 5;
    player.godCharges = 3; // already max
    player.klThresholdTriggeredThisTurn = false;

    checkGodThreshold(player, 5, GOD_THRESHOLD_KL + 5);
    expect(player.godCharges).toBe(3);
    expect(player.klThresholdTriggeredThisTurn).toBe(true);
  });
});

describe("Spending God Charges", () => {
  test("cannot spend before turn 4", () => {
    const player = makePlayerWithShards("P1", 10, 1);
    player.godCharges = 2;

    const canSpendTurn3 = canSpendGodCharges(player, 1, 3);
    expect(canSpendTurn3).toBe(false);

    expect(() => spendGodCharges(player, 1, 3)).toThrow();
    expect(player.godCharges).toBe(2);
  });

  test("cannot spend more charges than you have", () => {
    const player = makePlayerWithShards("P1", 10, 1);
    player.godCharges = 1;

    const canSpend = canSpendGodCharges(player, 2, 4);
    expect(canSpend).toBe(false);

    expect(() => spendGodCharges(player, 2, 4)).toThrow();
    expect(player.godCharges).toBe(1);
  });

  test("valid spend on or after turn 4 decrements charges", () => {
    const player = makePlayerWithShards("P1", 10, 1);
    player.godCharges = 2;

    const canSpend = canSpendGodCharges(player, 2, 4);
    expect(canSpend).toBe(true);

    spendGodCharges(player, 2, 4);
    expect(player.godCharges).toBe(0);
  });
});
