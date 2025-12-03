import { Zone } from "../src/engine/zones";
import type { Card } from "../src/engine/card";
import type { Player } from "../src/engine/player";
import type { GameState } from "../src/engine/gameState";
import {
  playDomain,
  playShard,
  playAvatar,
  playRelicOrSupport,
  sendToCrypt,
  sendToNull,
} from "../src/engine/movement";

function makeDeity(ownerId: string, baseKl = 3): Card {
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

function makeBasePlayer(id: string): Player {
  const deity = makeDeity(id, 10); // plenty of KL to start
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

function makeGameState(singlePlayerId = "P1"): GameState {
  const player = makeBasePlayer(singlePlayerId);
  return {
    players: [player],
    activePlayerId: singlePlayerId,
    firstPlayerId: singlePlayerId,
    turnNumber: 1,
  };
}

function addCardToHand(
  state: GameState,
  playerId: string,
  card: Card
): void {
  const player = state.players.find((p) => p.id === playerId)!;
  card.ownerId = playerId;
  card.controllerId = playerId;
  card.zone = Zone.HAND;
  player.hand.push(card);
}

describe("Movement: playing cards from hand to board", () => {
  test("playDomain moves card from hand to domainZone and spends KL", () => {
    const state = makeGameState("P1");
    const player = state.players[0];

    const domainCard: Card = {
      cardId: "DOM-1",
      name: "Test Domain",
      typeLine: "DOMAIN",
      subtypes: [],
      domainTag: "Second Sun",
      klCost: 3,
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

    addCardToHand(state, "P1", domainCard);

    const startingKl = player.currentKl;

    playDomain(state, "P1", "DOM-1");

    expect(player.domainZone).not.toBeNull();
    expect(player.domainZone!.cardId).toBe("DOM-1");
    expect(player.hand.find((c) => c.cardId === "DOM-1")).toBeUndefined();
    expect(player.domainZone!.zone).toBe(Zone.DOMAIN_ZONE);
    expect(player.currentKl).toBe(startingKl - domainCard.klCost);
  });

  test("playShard moves card from hand to shardRow and spends KL", () => {
    const state = makeGameState("P1");
    const player = state.players[0];

    const shardCard: Card = {
      cardId: "SHARD-1",
      name: "Test Shard",
      typeLine: "SHARD",
      subtypes: [],
      domainTag: undefined,
      klCost: 2,
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

    addCardToHand(state, "P1", shardCard);

    const startingKl = player.currentKl;

    playShard(state, "P1", "SHARD-1");

    expect(player.shardRow.length).toBe(1);
    expect(player.shardRow[0].cardId).toBe("SHARD-1");
    expect(player.hand.find((c) => c.cardId === "SHARD-1")).toBeUndefined();
    expect(player.shardRow[0].zone).toBe(Zone.SHARD_ROW);
    expect(player.currentKl).toBe(startingKl - shardCard.klCost);
  });

  test("playAvatar moves card from hand to avatarLine and spends KL", () => {
    const state = makeGameState("P1");
    const player = state.players[0];

    const avatarCard: Card = {
      cardId: "AV-1",
      name: "Test Avatar",
      typeLine: "AVATAR",
      subtypes: ["Glow"],
      domainTag: undefined,
      klCost: 4,
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

    addCardToHand(state, "P1", avatarCard);

    const startingKl = player.currentKl;

    playAvatar(state, "P1", "AV-1");

    expect(player.avatarLine.length).toBe(1);
    expect(player.avatarLine[0].cardId).toBe("AV-1");
    expect(player.hand.find((c) => c.cardId === "AV-1")).toBeUndefined();
    expect(player.avatarLine[0].zone).toBe(Zone.AVATAR_LINE);
    expect(player.currentKl).toBe(startingKl - avatarCard.klCost);
  });

  test("playRelicOrSupport moves card from hand to relicSupportZone", () => {
    const state = makeGameState("P1");
    const player = state.players[0];

    const relicCard: Card = {
      cardId: "REL-1",
      name: "Test Relic",
      typeLine: "RELIC",
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

    addCardToHand(state, "P1", relicCard);

    const startingKl = player.currentKl;

    playRelicOrSupport(state, "P1", "REL-1");

    expect(player.relicSupportZone.length).toBe(1);
    expect(player.relicSupportZone[0].cardId).toBe("REL-1");
    expect(player.hand.find((c) => c.cardId === "REL-1")).toBeUndefined();
    expect(player.relicSupportZone[0].zone).toBe(Zone.RELIC_SUPPORT_ZONE);
    expect(player.currentKl).toBe(startingKl - relicCard.klCost);
  });
});

describe("Movement: sending cards to Crypt and Null", () => {
  test("sendToCrypt moves card from avatarLine to crypt", () => {
    const state = makeGameState("P1");
    const player = state.players[0];

    const avatarCard: Card = {
      cardId: "AV-CRYPT",
      name: "Avatar going to Crypt",
      typeLine: "AVATAR",
      subtypes: [],
      domainTag: undefined,
      klCost: 0,
      power: 2,
      guard: 2,
      startingEssence: undefined,
      baseKl: undefined,
      abilities: [],
      isToken: false,

      ownerId: "P1",
      controllerId: "P1",
      zone: Zone.AVATAR_LINE,
      damageMarked: 0,
      tapped: false,
      temporaryModifiers: [],
    };

    player.avatarLine.push(avatarCard);

    sendToCrypt(state, "P1", "AV-CRYPT");

    expect(player.avatarLine.find((c) => c.cardId === "AV-CRYPT")).toBeUndefined();
    expect(player.crypt.length).toBe(1);
    expect(player.crypt[0].cardId).toBe("AV-CRYPT");
    expect(player.crypt[0].zone).toBe(Zone.CRYPT);
  });

  test("sendToNull moves card from domainZone to nullZone and clears domain", () => {
    const state = makeGameState("P1");
    const player = state.players[0];

    const domainCard: Card = {
      cardId: "DOM-NULL",
      name: "Domain to Null",
      typeLine: "DOMAIN",
      subtypes: [],
      domainTag: "Void",
      klCost: 0,
      power: undefined,
      guard: undefined,
      startingEssence: undefined,
      baseKl: undefined,
      abilities: [],
      isToken: false,

      ownerId: "P1",
      controllerId: "P1",
      zone: Zone.DOMAIN_ZONE,
      damageMarked: 0,
      tapped: false,
      temporaryModifiers: [],
    };

    player.domainZone = domainCard;

    sendToNull(state, "P1", "DOM-NULL");

    expect(player.domainZone).toBeNull();
    expect(player.nullZone.length).toBe(1);
    expect(player.nullZone[0].cardId).toBe("DOM-NULL");
    expect(player.nullZone[0].zone).toBe(Zone.NULL_ZONE);
  });

  test("sendToNull can move card directly from hand", () => {
    const state = makeGameState("P1");
    const player = state.players[0];

    const spellCard: Card = {
      cardId: "SPELL-NULL",
      name: "Spell to Null",
      typeLine: "SPELL",
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
      zone: Zone.HAND,
      damageMarked: 0,
      tapped: false,
      temporaryModifiers: [],
    };

    addCardToHand(state, "P1", spellCard);
    expect(player.hand.length).toBe(1);

    sendToNull(state, "P1", "SPELL-NULL");

    expect(player.hand.find((c) => c.cardId === "SPELL-NULL")).toBeUndefined();
    expect(player.nullZone.length).toBe(1);
    expect(player.nullZone[0].cardId).toBe("SPELL-NULL");
    expect(player.nullZone[0].zone).toBe(Zone.NULL_ZONE);
  });
});
