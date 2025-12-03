import { Zone } from "../src/engine/zones";
import type { Card } from "../src/engine/card";
import {
  createGameFromSetups,
  type PlayerSetup,
  getActivePlayer,
  getOpponent,
  startTurn,
  playShard,
  playAvatar,
  resolveCombat,
  type GameState,
} from "../src/engine/api";

function makeDeity(
  ownerId: string,
  startingEssence: number,
  baseKl: number
): Card {
  return {
    cardId: `DEITY-${ownerId}`,
    name: `Deity of ${ownerId}`,
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

function makeVeiledDeck(ownerId: string, count: number): Card[] {
  return Array.from({ length: count }, (_, idx) => ({
    cardId: `VD-${ownerId}-${idx}`,
    name: `Veiled Card ${idx}`,
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

    ownerId,
    controllerId: ownerId,
    zone: Zone.VEILED_DECK,
    damageMarked: 0,
    tapped: false,
    temporaryModifiers: [],
  }));
}

describe("Engine API surface", () => {
  test("createGameFromSetups and startTurn wiring", () => {
    const p1Deity = makeDeity("P1", 23, 3);
    const p2Deity = makeDeity("P2", 21, 2);

    const p1Setup: PlayerSetup = {
      id: "P1",
      deity: p1Deity,
      veiledDeck: makeVeiledDeck("P1", 5),
    };

    const p2Setup: PlayerSetup = {
      id: "P2",
      deity: p2Deity,
      veiledDeck: makeVeiledDeck("P2", 5),
    };

    const state: GameState = createGameFromSetups([p1Setup, p2Setup], "P1");

    expect(state.players).toHaveLength(2);
    expect(state.firstPlayerId).toBe("P1");
    expect(state.turnNumber).toBe(0);
    expect(state.activePlayerId).toBe("");

    // First call to startTurn: sets turnNumber = 1, P1 active
    startTurn(state);

    const active1 = getActivePlayer(state);
    const opp1 = getOpponent(state, active1.id);

    expect(state.turnNumber).toBe(1);
    expect(active1.id).toBe("P1");
    expect(opp1.id).toBe("P2");

    // Second call to startTurn: turnNumber = 2, P2 active
    startTurn(state);
    const active2 = getActivePlayer(state);
    const opp2 = getOpponent(state, active2.id);

    expect(state.turnNumber).toBe(2);
    expect(active2.id).toBe("P2");
    expect(opp2.id).toBe("P1");
  });

  test("playShard, playAvatar and resolveCombat via API", () => {
    const p1Deity = makeDeity("P1", 23, 10); // give plenty of KL
    const p2Deity = makeDeity("P2", 21, 10);

    const p1Setup: PlayerSetup = {
      id: "P1",
      deity: p1Deity,
      veiledDeck: [],
    };

    const p2Setup: PlayerSetup = {
      id: "P2",
      deity: p2Deity,
      veiledDeck: [],
    };

    const state = createGameFromSetups([p1Setup, p2Setup], "P1");

    // We'll manually put an Avatar and Shard in P1's hand so we can play them
    const p1 = getActivePlayer(state); // at turnNumber 0, activePlayerId is empty, but getActivePlayer isn't used yet

    const player1 = state.players.find((p) => p.id === "P1")!;
    const player2 = state.players.find((p) => p.id === "P2")!;

    const shardCard: Card = {
      cardId: "SHARD-API-1",
      name: "API Shard",
      typeLine: "SHARD",
      subtypes: [],
      domainTag: undefined,
      klCost: 1,
      power: undefined,
      guard: undefined,
      startingEssence: undefined,
      baseKl: undefined,
      abilities: [],
      isToken: false,

      ownerId: "P1",
      controllerId: "P1",
      zone: Zone.HAND,
      damageMarked: 0,
      tapped: false,
      temporaryModifiers: [],
    };

    const avatarCard: Card = {
      cardId: "AV-API-1",
      name: "API Avatar",
      typeLine: "AVATAR",
      subtypes: [],
      domainTag: undefined,
      klCost: 2,
      power: 3,
      guard: 2,
      startingEssence: undefined,
      baseKl: undefined,
      abilities: [],
      isToken: false,

      ownerId: "P1",
      controllerId: "P1",
      zone: Zone.HAND,
      damageMarked: 0,
      tapped: false,
      temporaryModifiers: [],
    };

    player1.hand.push(shardCard, avatarCard);

    // Start the first turn (P1)
    startTurn(state);

    // Play Shard and Avatar using the API
    const startingKl = player1.currentKl;
    playShard(state, "P1", "SHARD-API-1");
    playAvatar(state, "P1", "AV-API-1");

    expect(player1.shardRow.length).toBe(1);
    expect(player1.avatarLine.length).toBe(1);
    // KL should have been reduced by total cost = 1 + 2 = 3
    expect(player1.currentKl).toBe(startingKl - 3);

    const startingEssenceP2 = player2.essence;

    // Avatar attacks unblocked via API
    resolveCombat(state, "P1", "P2", [{ attackerCardId: "AV-API-1" }]);

    expect(player2.essence).toBe(startingEssenceP2 - 3);
    const avatarOnBoard = player1.avatarLine.find(
      (c) => c.cardId === "AV-API-1"
    );
    expect(avatarOnBoard).toBeDefined();
    expect(avatarOnBoard!.tapped).toBe(true);
  });
});
