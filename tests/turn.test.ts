import { Zone } from "../src/engine/zones";
import type { Card } from "../src/engine/card";
import type { Player } from "../src/engine/player";
import type { GameState } from "../src/engine/gameState";
import { startTurn } from "../src/engine/turn";
import { GOD_THRESHOLD_KL } from "../src/engine/resources";

function makeDeityCard(
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

function makePlayerWithDeck(
  id: string,
  deity: Card,
  deckSize: number
): Player {
  const deckCardTemplate: Card = {
    cardId: "VD-CARD",
    name: "Veiled Test Card",
    typeLine: "AVATAR",
    subtypes: [],
    domainTag: undefined,
    klCost: 0,
    power: 1,
    guard: 1,
    startingEssence: undefined,
    baseKl: undefined,
    abilities: [],
    isToken: false,

    ownerId: id,
    controllerId: id,
    zone: Zone.VEILED_DECK,
    damageMarked: 0,
    tapped: false,
    temporaryModifiers: [],
  };

  const veiledDeck: Card[] = Array.from({ length: deckSize }, (_, idx) => ({
    ...deckCardTemplate,
    cardId: `VD-${id}-${idx}`,
  }));

  return {
    id,
    deity,
    essence: deity.startingEssence ?? 0,
    baseKl: deity.baseKl ?? 0,
    currentKl: deity.baseKl ?? 0,
    godCharges: 0,
    klThresholdTriggeredThisTurn: false,

    hand: [],
    veiledDeck,
    crypt: [],
    nullZone: [],
    domainZone: null,
    shardRow: [],
    avatarLine: [],
    relicSupportZone: [],

    turnsTaken: 0,
  };
}

describe("Turn structure - startTurn and startPhase", () => {
  test("Turn 1: first player becomes active and does not draw", () => {
    const deity1 = makeDeityCard("D1", "Deity 1", 20, 3, "P1");
    const deity2 = makeDeityCard("D2", "Deity 2", 20, 3, "P2");

    const player1 = makePlayerWithDeck("P1", deity1, 3);
    const player2 = makePlayerWithDeck("P2", deity2, 3);

    const gameState: GameState = {
      players: [player1, player2],
      activePlayerId: "", // will be set by startTurn
      firstPlayerId: "P1",
      turnNumber: 0, // before the first turn
    };

    startTurn(gameState);

    expect(gameState.turnNumber).toBe(1);
    expect(gameState.activePlayerId).toBe("P1");

    const updatedP1 = gameState.players.find((p) => p.id === "P1")!;
    const updatedP2 = gameState.players.find((p) => p.id === "P2")!;

    // First player on turn 1 should NOT draw a card
    expect(updatedP1.hand.length).toBe(0);
    expect(updatedP1.veiledDeck.length).toBe(3);

    // Second player unchanged
    expect(updatedP2.hand.length).toBe(0);
    expect(updatedP2.veiledDeck.length).toBe(3);
  });

  test("Turn 2: second player becomes active and does draw", () => {
    const deity1 = makeDeityCard("D1", "Deity 1", 20, 3, "P1");
    const deity2 = makeDeityCard("D2", "Deity 2", 20, 3, "P2");

    const player1 = makePlayerWithDeck("P1", deity1, 3);
    const player2 = makePlayerWithDeck("P2", deity2, 3);

    const gameState: GameState = {
      players: [player1, player2],
      activePlayerId: "",
      firstPlayerId: "P1",
      turnNumber: 0,
    };

    // Turn 1: P1 active, no draw
    startTurn(gameState);

    // Turn 2: P2 active, should draw
    startTurn(gameState);

    expect(gameState.turnNumber).toBe(2);
    expect(gameState.activePlayerId).toBe("P2");

    const updatedP1 = gameState.players.find((p) => p.id === "P1")!;
    const updatedP2 = gameState.players.find((p) => p.id === "P2")!;

    // P1 still has no cards in hand
    expect(updatedP1.hand.length).toBe(0);

    // P2 should have drawn 1 card
    expect(updatedP2.hand.length).toBe(1);
    expect(updatedP2.veiledDeck.length).toBe(2);
  });

  test("Start Phase recalculates KL and triggers God Charge at threshold", () => {
    // P1 has baseKl 12 and one shard, so recalc should give 13 and trigger God Charge
    const deity1 = makeDeityCard("D1", "Deity 1", 20, 12, "P1");
    const deity2 = makeDeityCard("D2", "Deity 2", 20, 3, "P2");

    const player1 = makePlayerWithDeck("P1", deity1, 0);
    const player2 = makePlayerWithDeck("P2", deity2, 0);

    // Give P1 one shard in shardRow
    const shardCard: Card = {
      cardId: "SHARD-1",
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

      ownerId: "P1",
      controllerId: "P1",
      zone: Zone.SHARD_ROW,
      damageMarked: 0,
      tapped: false,
      temporaryModifiers: [],
    };
    player1.shardRow.push(shardCard);

    player1.currentKl = 12;
    player1.godCharges = 0;
    player1.klThresholdTriggeredThisTurn = false;

    const gameState: GameState = {
      players: [player1, player2],
      activePlayerId: "",
      firstPlayerId: "P1",
      turnNumber: 0,
    };

    // First turn: P1 active, Start Phase should recalc KL and cross threshold
    startTurn(gameState);

    const updatedP1 = gameState.players.find((p) => p.id === "P1")!;
    expect(updatedP1.currentKl).toBe(GOD_THRESHOLD_KL); // 12 + 1 shard = 13
    expect(updatedP1.godCharges).toBe(1);
    expect(updatedP1.klThresholdTriggeredThisTurn).toBe(true);
  });
});
