import { Zone } from "../engine/zones";
import type { Card } from "../engine/card";
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
} from "../engine/api";

/**
 * Simple card factories
 */

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

function makeShard(ownerId: string, index: number, klCost = 1): Card {
  return {
    cardId: `SHARD-${ownerId}-${index}`,
    name: `Shard ${index}`,
    typeLine: "SHARD",
    subtypes: [],
    domainTag: undefined,
    klCost,
    power: undefined,
    guard: undefined,
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
  };
}

function makeAvatar(
  ownerId: string,
  index: number,
  power: number,
  guard: number,
  klCost = 2
): Card {
  return {
    cardId: `AVATAR-${ownerId}-${index}`,
    name: `Avatar ${index}`,
    typeLine: "AVATAR",
    subtypes: [],
    domainTag: undefined,
    klCost,
    power,
    guard,
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
  };
}

function makeVeiledDeck(ownerId: string): Card[] {
  const deck: Card[] = [];

  // 3 shards
  for (let i = 0; i < 3; i++) {
    deck.push(makeShard(ownerId, i));
  }

  // 3 avatars with different stats
  deck.push(makeAvatar(ownerId, 0, 2, 2, 2));
  deck.push(makeAvatar(ownerId, 1, 3, 2, 3));
  deck.push(makeAvatar(ownerId, 2, 4, 3, 4));

  return deck;
}

/**
 * Initialize a simple 2-player game using the API.
 */
function createDemoGame(): GameState {
  const p1Deity = makeDeity("P1", 23, 3);
  const p2Deity = makeDeity("P2", 21, 3);

  const p1Setup: PlayerSetup = {
    id: "P1",
    deity: p1Deity,
    veiledDeck: makeVeiledDeck("P1"),
  };

  const p2Setup: PlayerSetup = {
    id: "P2",
    deity: p2Deity,
    veiledDeck: makeVeiledDeck("P2"),
  };

  return createGameFromSetups([p1Setup, p2Setup], "P1");
}

/**
 * Simple AI: play one shard (if any) and one avatar (if affordable), then attack with all untapped avatars.
 */

function takeTurnActions(state: GameState): void {
  const active = getActivePlayer(state);
  const opponent = getOpponent(state, active.id);

  console.log(
    `Player ${active.id} | Essence: ${active.essence} | KL: ${active.currentKl} | GodCharges: ${active.godCharges}`
  );
  console.log(
    `  Hand: ${active.hand.map((c) => `${c.name} [${c.typeLine}]`).join(", ") || "(empty)"}`
  );

  // Try to play one Shard from hand
  const shardInHand = active.hand.find((c) => c.typeLine === "SHARD");
  if (shardInHand) {
    try {
      playShard(state, active.id, shardInHand.cardId);
      console.log(`  Played Shard: ${shardInHand.name}`);
    } catch (err: any) {
      console.log(`  Tried to play Shard but failed: ${err.message}`);
    }
  }

  // Try to play one Avatar from hand
  const avatarInHand = active.hand.find((c) => c.typeLine === "AVATAR");
  if (avatarInHand) {
    try {
      playAvatar(state, active.id, avatarInHand.cardId);
      console.log(`  Played Avatar: ${avatarInHand.name}`);
    } catch (err: any) {
      console.log(`  Tried to play Avatar but failed: ${err.message}`);
    }
  }

  // Attack with all untapped avatars that have power > 0
  const attackers = active.avatarLine.filter(
    (c) => !c.tapped && (c.power ?? 0) > 0
  );

  if (attackers.length > 0) {
    const assignments = attackers.map((card) => ({
      attackerCardId: card.cardId,
    }));

    resolveCombat(state, active.id, opponent.id, assignments);

    console.log(
      `  Attacked with ${attackers.length} Avatar(s). Opponent Essence is now ${opponent.essence}.`
    );
  } else {
    console.log("  No attacks declared.");
  }

  console.log("");
}

/**
 * Run a short demo game.
 */
function runDemo(): void {
  const state = createDemoGame();

  console.log("=== Essence Crown Demo ===");
  console.log("");

  // Play 4 full turns (2 rounds)
  const maxTurns = 4;

  for (let i = 0; i < maxTurns; i++) {
    startTurn(state);
    const active = getActivePlayer(state);
    console.log(`--- Turn ${state.turnNumber} (Player ${active.id}) ---`);
    takeTurnActions(state);

    const p1 = state.players.find((p) => p.id === "P1")!;
    const p2 = state.players.find((p) => p.id === "P2")!;

    console.log(
      `Status after Turn ${state.turnNumber}: P1 Essence ${p1.essence}, P2 Essence ${p2.essence}`
    );
    console.log("-------------------------------------------");
    console.log("");

    // If someone hits 0 Essence, stop early
    if (p1.essence <= 0 || p2.essence <= 0) {
      console.log("Game over (Essence hit 0).");
      break;
    }
  }

  const p1 = state.players.find((p) => p.id === "P1")!;
  const p2 = state.players.find((p) => p.id === "P2")!;
  console.log("=== Final State ===");
  console.log(`P1 Essence: ${p1.essence}`);
  console.log(`P2 Essence: ${p2.essence}`);
}

runDemo();
