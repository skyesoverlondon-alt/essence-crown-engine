import { Zone } from "../src/engine/zones";
import type { Card } from "../src/engine/card";
import type { Player } from "../src/engine/player";
import type { GameState } from "../src/engine/gameState";

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

function makeEmptyPlayer(id: string, deity: Card): Player {
  return {
    id,
    deity,
    essence: deity.startingEssence ?? 0,
    baseKl: deity.baseKl ?? 0,
    currentKl: deity.baseKl ?? 0,
    godCharges: 0,
    klThresholdTriggeredThisTurn: false,

    hand: [],
    veiledDeck: [],
    crypt: [],
    nullZone: [],
    domainZone: null,
    shardRow: [],
    avatarLine: [],
    relicSupportZone: [],

    turnsTaken: 0,
  };
}

describe("Essence Crown engine core types", () => {
  test("players and game state initialize correctly from deity cards", () => {
    const deity1 = makeDeityCard("EC-D1", "Second Sun Herald", 23, 3, "P1");
    const deity2 = makeDeityCard("EC-D2", "Null Regent", 21, 2, "P2");

    const player1 = makeEmptyPlayer("P1", deity1);
    const player2 = makeEmptyPlayer("P2", deity2);

    const gameState: GameState = {
      players: [player1, player2],
      activePlayerId: "P1",
      firstPlayerId: "P1",
      turnNumber: 1,
    };

    // Essence and KL should be derived from deities
    expect(player1.essence).toBe(23);
    expect(player1.baseKl).toBe(3);
    expect(player1.currentKl).toBe(3);

    expect(player2.essence).toBe(21);
    expect(player2.baseKl).toBe(2);
    expect(player2.currentKl).toBe(2);

    // Game state wiring
    expect(gameState.players).toHaveLength(2);
    expect(gameState.activePlayerId).toBe("P1");
    expect(gameState.firstPlayerId).toBe("P1");
    expect(gameState.turnNumber).toBe(1);
  });
});
