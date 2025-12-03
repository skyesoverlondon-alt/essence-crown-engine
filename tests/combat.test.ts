import { Zone } from "../src/engine/zones";
import type { Card } from "../src/engine/card";
import type { Player } from "../src/engine/player";
import type { GameState } from "../src/engine/gameState";
import { resolveCombat } from "../src/engine/combat";

function makeDeity(ownerId: string): Card {
  return {
    cardId: `DEITY-${ownerId}`,
    name: `Deity of ${ownerId}`,
    typeLine: "DEITY",
    subtypes: [],
    domainTag: undefined,
    klCost: 0,
    power: undefined,
    guard: undefined,
    startingEssence: 20,
    baseKl: 3,
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

function makeBasePlayer(id: string): Player {
  const deity = makeDeity(id);
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

function makeGameState(): GameState {
  const p1 = makeBasePlayer("P1");
  const p2 = makeBasePlayer("P2");
  return {
    players: [p1, p2],
    activePlayerId: "P1",
    firstPlayerId: "P1",
    turnNumber: 1,
  };
}

function addAvatarToLine(
  player: Player,
  cardId: string,
  power: number,
  guard: number
): Card {
  const avatar: Card = {
    cardId,
    name: `Avatar ${cardId}`,
    typeLine: "AVATAR",
    subtypes: [],
    domainTag: undefined,
    klCost: 0,
    power,
    guard,
    startingEssence: undefined,
    baseKl: undefined,
    abilities: [],
    isToken: false,

    ownerId: player.id,
    controllerId: player.id,
    zone: Zone.AVATAR_LINE,
    damageMarked: 0,
    tapped: false,
    temporaryModifiers: [],
  };
  player.avatarLine.push(avatar);
  return avatar;
}

describe("Combat resolution", () => {
  test("unblocked attacker deals Essence damage to defending player", () => {
    const state = makeGameState();
    const attackerPlayer = state.players.find((p) => p.id === "P1")!;
    const defenderPlayer = state.players.find((p) => p.id === "P2")!;

    addAvatarToLine(attackerPlayer, "AV-1", 3, 2);

    const startingEssence = defenderPlayer.essence;

    resolveCombat(state, "P1", "P2", [
      { attackerCardId: "AV-1" }, // no blocker
    ]);

    expect(defenderPlayer.essence).toBe(startingEssence - 3);

    // Attacker should still be on board, tapped
    const updatedAv = attackerPlayer.avatarLine.find((c) => c.cardId === "AV-1");
    expect(updatedAv).toBeDefined();
    expect(updatedAv!.tapped).toBe(true);
  });

  test("blocked attackers trade and both die to Crypt", () => {
    const state = makeGameState();
    const attackerPlayer = state.players.find((p) => p.id === "P1")!;
    const defenderPlayer = state.players.find((p) => p.id === "P2")!;

    // Attacker: 3/2
    addAvatarToLine(attackerPlayer, "AV-A", 3, 2);
    // Blocker: 2/2
    addAvatarToLine(defenderPlayer, "AV-B", 2, 2);

    resolveCombat(state, "P1", "P2", [
      { attackerCardId: "AV-A", blockerCardId: "AV-B" },
    ]);

    // Both should be gone from avatarLine
    expect(
      attackerPlayer.avatarLine.find((c) => c.cardId === "AV-A")
    ).toBeUndefined();
    expect(
      defenderPlayer.avatarLine.find((c) => c.cardId === "AV-B")
    ).toBeUndefined();

    // Both should be in their respective Crypts
    expect(
      attackerPlayer.crypt.find((c) => c.cardId === "AV-A")
    ).toBeDefined();
    expect(
      defenderPlayer.crypt.find((c) => c.cardId === "AV-B")
    ).toBeDefined();
  });

  test("mixed combat: one blocked attacker trades, one unblocked hits Essence", () => {
    const state = makeGameState();
    const attackerPlayer = state.players.find((p) => p.id === "P1")!;
    const defenderPlayer = state.players.find((p) => p.id === "P2")!;

    // Blocked attacker: 3/2
    addAvatarToLine(attackerPlayer, "AV-BLOCKED", 3, 2);
    // Unblocked attacker: 4/3
    addAvatarToLine(attackerPlayer, "AV-UNBLOCKED", 4, 3);

    // Blocker: 3/2
    addAvatarToLine(defenderPlayer, "AV-DEF", 3, 2);

    const startingEssence = defenderPlayer.essence;

    resolveCombat(state, "P1", "P2", [
      { attackerCardId: "AV-BLOCKED", blockerCardId: "AV-DEF" },
      { attackerCardId: "AV-UNBLOCKED" }, // hits face
    ]);

    // Blocked pair should trade and die to Crypt
    expect(
      attackerPlayer.avatarLine.find((c) => c.cardId === "AV-BLOCKED")
    ).toBeUndefined();
    expect(
      defenderPlayer.avatarLine.find((c) => c.cardId === "AV-DEF")
    ).toBeUndefined();
    expect(
      attackerPlayer.crypt.find((c) => c.cardId === "AV-BLOCKED")
    ).toBeDefined();
    expect(
      defenderPlayer.crypt.find((c) => c.cardId === "AV-DEF")
    ).toBeDefined();

    // Unblocked attacker should still be alive and tapped
    const unblocked = attackerPlayer.avatarLine.find(
      (c) => c.cardId === "AV-UNBLOCKED"
    );
    expect(unblocked).toBeDefined();
    expect(unblocked!.tapped).toBe(true);

    // Defender should have taken 4 Essence damage
    expect(defenderPlayer.essence).toBe(startingEssence - 4);
  });
});
