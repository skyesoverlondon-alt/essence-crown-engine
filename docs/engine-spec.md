# Essence Crown – Engine Spec (Technical)

This document defines how the rules engine must behave.  
Code must treat this as the **source of truth**.

---

## 0. Concepts

- Game is a turn-based TCG for 2+ players (default 2).
- Each player:
  - Controls exactly **1 Deity**.
  - Has **Essence** (life total).
  - Has **KL (Kundalini Level)** used to pay card costs each turn.
  - Has **God Charges** (0–3), special counters that power top-tier effects.

Special thresholds:

- **God Threshold = 13 KL**
- **Absolute KL Cap = 31**

---

## 1. Data Model

### 1.1 Zones (enum)

Define a `Zone` enum:

- `DEITY_ZONE`
- `DOMAIN_ZONE`
- `SHARD_ROW`
- `AVATAR_LINE`
- `RELIC_SUPPORT_ZONE`
- `HAND`
- `VEILED_DECK`
- `CRYPT`
- `NULL_ZONE`

Each card is always in exactly one `Zone`.

---

### 1.2 Player

A `Player` object **must** have:

- `id: string`
- `deity: Card` (Deity card; always in `DEITY_ZONE` for that player)
- `essence: number`  
  - Current life. Initialized from `deity.startingEssence`.
- `baseKl: number`  
  - From `deity.baseKl`.
- `currentKl: number`  
  - Recalculated each Start Phase. Bounded `[0, 31]`.
- `godCharges: number` in `[0, 3]`.
- `klThresholdTriggeredThisTurn: boolean`  
  - True once the player has gained a God Charge from crossing 13 KL this turn.
- `hand: Card[]`
- `veiledDeck: Card[]`  // representation: top-of-deck index is your choice, but be consistent.
- `crypt: Card[]`
- `nullZone: Card[]`
- Battlefield zones:
  - `domainZone: Card | null`  // 0 or 1 Domain
  - `shardRow: Card[]`
  - `avatarLine: Card[]`
  - `relicSupportZone: Card[]`
- `turnsTaken: number`

---

### 1.3 Card

A `Card` has static metadata (ideally loaded from JSON):

- `cardId: string`
- `name: string`
- `typeLine: "DEITY" | "DOMAIN" | "SHARD" | "AVATAR" | "SPELL" | "RITE" | "RELIC" | "SUPPORT" | "TOKEN"`
- `subtypes: string[]` (e.g. ["Glow"], ["Void"], ["Gray"])
- `domainTag?: string` (e.g. "Second Sun", "Null Depths")
- `klCost: number` (0+; Deities may have 0)
- `additionalCosts?: CostComponent[]` (Essence payments, sacrifices, discards, etc.)
- Optional stats:
  - `power?: number`  // Avatars/Tokens
  - `guard?: number`
  - `startingEssence?: number` // Deity
  - `baseKl?: number`          // Deity
- `abilities: Ability[]` (structure TBD; for now may be text + tags)
- `isToken: boolean` (true for generated tokens/Echo Avatars)

Runtime fields:

- `owner: Player`
- `controller: Player`
- `zone: Zone`
- `damageMarked: number` (default 0; Avatars only)
- `tapped: boolean` (or `exhausted`; default false)
- `temporaryModifiers: Modifier[]` (for “until end of turn” etc.)

---

## 2. Resources

### 2.1 Essence

- `player.essence` is int.
- Game start: `player.essence = player.deity.startingEssence`.
- Damage/loss:
  - `player.essence -= amount`.
- Healing:
  - `player.essence += amount`.
- On any change to `essence`, engine must check loss condition:
  - If `player.essence <= 0`, that player loses (unless a replacement effect says otherwise).

### 2.2 KL (Kundalini Level)

- `player.currentKl` is int, recalculated once each Start Phase.
- Bounded `[0, 31]`.

#### 2.2.1 KL Recalculation Function

Implement:

```ts
function recalculateKl(player: Player): number {
  let kl = player.baseKl;
  kl += player.shardRow.length; // +1 per Shard by default

  // Static KL bonuses: from domain, relics, deity passives.
  kl += getStaticKlBonuses(player);

  // Start-of-turn KL effects: from abilities that say
  // "At the start of your turn, gain +X KL this turn."
  kl += getStartOfTurnKlEffects(player);

  if (kl > 31) kl = 31;
  if (kl < 0) kl = 0;

  return kl;
}
Engine use:

At Start Phase:

const oldKl = player.currentKl;

const newKl = recalculateKl(player);

player.currentKl = newKl;

checkGodThreshold(player, oldKl, newKl);

2.2.2 Spending KL

To pay a cost requiredKl:

Ensure player.currentKl >= requiredKl.

If not, the action is illegal.

Otherwise: player.currentKl -= requiredKl.

KL is not carried across turns; it is recalculated fresh each Start Phase.

2.3 God Charges

player.godCharges is int in [0, 3].

player.klThresholdTriggeredThisTurn is bool.

2.3.1 Initialization

At game start, for each player:

player.godCharges = 0

player.klThresholdTriggeredThisTurn = false

At the beginning of each Start Phase, set:

player.klThresholdTriggeredThisTurn = false before recalculating KL.

2.3.2 Threshold Function

Implement:

function checkGodThreshold(player: Player, oldKl: number, newKl: number): void {
  if (player.klThresholdTriggeredThisTurn) return;
  if (oldKl < 13 && newKl >= 13) {
    if (player.godCharges < 3) {
      player.godCharges += 1;
    }
    player.klThresholdTriggeredThisTurn = true;
  }
}


Call this:

After Start Phase KL recalculation.

After any effect that increases KL mid-turn (pass in old and new KL values).

2.3.3 Spending God Charges

Global state:

turnNumber: number starts at 1 and increments every turn.

Rule:

God Charges cannot be spent during turns 1–3.

canSpendGodCharges = (turnNumber > 3).

Implement:function canSpendGodCharges(player: Player, amount: number, turnNumber: number): boolean {
  if (turnNumber <= 3) return false;
  if (player.godCharges < amount) return false;
  return true;
}

function spendGodCharges(player: Player, amount: number, turnNumber: number): void {
  if (!canSpendGodCharges(player, amount, turnNumber)) {
    throw new Error("Cannot spend God Charges.");
  }
  player.godCharges -= amount;
}
Abilities that cost God Charges must use these helpers.

3. Game Setup
3.1 Deck & Deity

For each player:

player.deity is chosen from card pool (type DEITY).

player.baseKl = deity.baseKl.

player.essence = deity.startingEssence.

Initialize zones and collections:

hand = []

veiledDeck = [] (then populate & shuffle)

crypt = []

nullZone = []

domainZone = null

shardRow = []

avatarLine = []

relicSupportZone = []

Build veiledDeck according to deckbuilding rules:

40–60 cards, up to 3 copies per non-basic card (engine doesn’t have to enforce this at runtime).

3.2 Initial Draw & Mulligan

Default procedure:

Each player draws exactly 7 cards into hand.

Optional mulligan:

If enabled, engine allows a player to return all cards from hand to veiledDeck, shuffle, and draw 6 instead.

3.3 Turn Order

Choose firstPlayer randomly.

turnNumber = 1.

activePlayer = firstPlayer.

Rule: On turn 1, the active player skips their Draw Step.

4. Turn Structure

Each turn:

1. Start Phase
2. Main Phase 1
3. Combat Phase
4. Main Phase 2
5. End Phase


After these:

activePlayer.turnsTaken += 1

turnNumber += 1

activePlayer becomes the next player.

4.1 Start Phase

Pseudocode:

function startPhase(player: Player, gameState: GameState): void {
  readyAllPermanents(player);

  // Draw Step
  if (!(gameState.turnNumber === 1 && player === gameState.firstPlayer)) {
    drawCard(player, gameState);
  }

  player.klThresholdTriggeredThisTurn = false;

  const oldKl = player.currentKl;
  const newKl = recalculateKl(player);
  player.currentKl = newKl;
  checkGodThreshold(player, oldKl, newKl);

  resolveStartOfTurnTriggers(player, gameState);
}

4.2 Main Phase

During a Main Phase, player may:

Play Shards, Avatars, Relics, Support, Domains from hand.

Cast Spells and Rites from hand.

Activate abilities with appropriate timing and cost.

Engine:

Provide getLegalActions(player, gameState) that lists all possible actions given:

Current KL

Card locations/zones

Timing restrictions (Main Phase, stack empty)

Playing a card (simplified):

function canPlayCard(player: Player, card: Card, gameState: GameState): boolean {
  if (card.owner !== player) return false;
  if (card.zone !== Zone.HAND) return false;
  if (!isMainPhase(gameState, player)) return false;
  if (!isStackEmpty(gameState)) return false; // if you model a stack

  const klCost = getAdjustedKlCost(player, card, gameState);
  if (player.currentKl < klCost) return false;

  if (!areAdditionalCostsPayable(player, card, gameState)) return false;

  return true;
}

function playCard(player: Player, card: Card, gameState: GameState): void {
  if (!canPlayCard(player, card, gameState)) {
    throw new Error("Illegal card play");
  }

  const klCost = getAdjustedKlCost(player, card, gameState);
  player.currentKl -= klCost;
  payAdditionalCosts(player, card, gameState);

  moveCardFromHandToZone(player, card, determineDestinationZone(card));

  resolveOnPlayEffects(card, player, gameState);
}

4.3 Combat Phase

Engine must support:

attackingAvatars: Card[]

blockAssignments: Map<Card, Card[]> (attacker → list of blockers)

Steps:

Declare Attackers

Declare Blockers

Combat Damage

Pseudocode:

function resolveCombatDamage(gameState: GameState): void {
  for (const attacker of gameState.attackingAvatars) {
    const blockers = gameState.blockAssignments.get(attacker) ?? [];
    if (blockers.length === 0) {
      const defendingPlayer = getDefendingPlayer(gameState, attacker);
      dealEssenceDamage(defendingPlayer, attacker.power, gameState);
    } else {
      for (const blocker of blockers) {
        blocker.damageMarked += attacker.powerAssignedTo(blocker);
        attacker.damageMarked += blocker.power;
      }
    }
  }

  for (const unit of allAvatarUnitsOnBattlefield(gameState)) {
    if (unit.damageMarked >= unit.guard) {
      destroyAvatar(unit, gameState);
    }
  }

  resolveCombatTriggers(gameState);
}


End of Combat

Apply triggers like “when this deals combat damage” or “when an Avatar dies.”

At End Phase, reset damageMarked on surviving Avatars to 0.

4.4 End Phase
function endPhase(player: Player, gameState: GameState): void {
  resolveEndOfTurnTriggers(player, gameState);
  clearUntilEndOfTurnEffects(gameState);
}

5. God Charge Spending

Engine-level constraints:

Constraint 1: turnNumber > 3 required to spend any God Charges.

Constraint 2: player.godCharges >= costAmount.

Use helper functions (canSpendGodCharges, spendGodCharges) to enforce.

6. Win / Loss Conditions

Engine must check after relevant events:

Essence changes

Deck draws

Explicit win/loss card effects

Rules:

If player.essence <= 0: that player loses.

If deck-out rule enabled:

If the player attempts to draw from an empty Veiled Deck, that player loses (unless a replacement effect).

A card may explicitly cause a win or loss.

Game ends when:

Exactly one player remains not hasLost, or

Some effect declares a single winner.

7. Domain & Zone Rules

When a DOMAIN card is played:

If domainZone already has a card, move that card to CRYPT.

Then move the new Domain card into DOMAIN_ZONE.

SHARD cards:

When played, move to SHARD_ROW.

AVATAR and TOKEN cards:

When played/created, move to AVATAR_LINE.

RELIC / SUPPORT cards:

When played, move to RELIC_SUPPORT_ZONE.

SPELL and RITE cards:

On resolution, move to CRYPT (unless their text says otherwise).

Nullification:

function nullifyCard(card: Card, gameState: GameState): void {
  removeCardFromCurrentZone(card, gameState);
  if (!card.isToken) {
    addCardToNullZone(card.owner, card);
  } else {
    // tokens cease to exist
  }
}

8. Extensibility

Provide generic hooks:

onStartOfTurn

onEndOfTurn

onCardPlayed

onAvatarDestroyed

onEnterZone

onLeaveZone

Abilities attach to these hooks to implement:

Aspect synergies

Domain synergies

KL-based effects

Essence-based effects

Crypt/Null synergies

Initial engine can:

Focus on core turn flow, resources, zones, and combat.

Stub ability resolution until card scripting is needed.


5. Scroll down and **Commit new file**  
   - Commit message: `docs: add engine spec`.

✅ `engine-spec.md` is in.

---

## STEP 5 – Create `docs/card-schema.md` (how cards look as data)

1. Again: **Add file → Create new file**.
2. Name it: `docs/card-schema.md`.
3. Paste this:

```markdown
# Essence Crown – Card Schema

This file defines how cards are represented as data (e.g., JSON) so the engine can load them.

## 1. Base JSON Shape

Each card is represented as an object:

```jsonc
{
  "cardId": "EC-001",
  "name": "Second Sun Herald",
  "typeLine": "DEITY",
  "subtypes": ["Glow", "Gray"],
  "domainTag": "Second Sun",
  "klCost": 0,
  "power": null,
  "guard": null,
  "startingEssence": 23,
  "baseKl": 3,
  "abilities": [
    {
      "id": "second-sun-solar-flow",
      "label": "Solar Flow",
      "description": "At the start of your turn, if you control at least one Glow Avatar, gain +1 KL this turn.",
      "trigger": "START_OF_TURN",
      "effectType": "KL_MOD",
      "effectParams": {
        "amount": 1,
        "condition": "youControlGlowAvatar"
      }
    }
  ],
  "isToken": false
}

2. Core Fields

cardId: string
Unique code (e.g., "EC-001").

name: string
Display name.

typeLine: string
Enumerated values:

"DEITY", "DOMAIN", "SHARD", "AVATAR", "SPELL", "RITE", "RELIC", "SUPPORT", "TOKEN"

subtypes: string[]
Aspects, races, tags (e.g., ["Glow"], ["Void"]).

domainTag?: string
If present, indicates the Domain this card belongs to (e.g., "Second Sun").

klCost: number
KL cost to play this card (0+). Deities often have 0 because they start on the board.

power?: number
Combat attack stat, for Avatars/Tokens.

guard?: number
Combat defense/toughness stat, for Avatars/Tokens.

startingEssence?: number
For Deities only; used to set player’s starting Essence.

baseKl?: number
For Deities only; used in KL recalculation formula.

abilities: Ability[]
Implementation detail; Codex can start with:

label: string

description: string (rules text)

optional structured trigger/effect fields later.

isToken: boolean
True for tokens/Echo Avatars. Token destruction usually removes them from the game instead of sending to Crypt/Null.

3. Future Extensions

Later, the schema can be extended with:

rarity, setCode, art fields.

More structured Ability definitions (conditions, triggers, effects) that Codex can interpret programmatically.

For now, the engine implementation should:

Support loading card data from JSON following this shape.

At least use:

typeLine

subtypes

domainTag

klCost

power / guard

startingEssence / baseKl

isToken

Treat abilities as descriptive text or stub for future logic.


4. Commit (`docs: add card schema`).

✅ Card schema done.

---

## STEP 6 – Create `docs/codex-tasks.md` (your “orders” to Codex)

1. Add file → `docs/codex-tasks.md`.
2. Paste:

```markdown
# Codex Task Guide – Essence Crown Engine

This file contains **prompt templates** and a suggested order of tasks for Codex.

Always remind Codex:

- The rules in `docs/engine-spec.md` and `docs/rules-core.md` are **ground truth**.
- Do **not** invent new rules; if something is unclear, favor minimal implementation.

---

## Phase 1 – Core Data Structures & Turn Skeleton

### Task 1 – Implement core types and GameState

**Prompt:**

> You are implementing the Essence Crown TCG engine.
> Read `docs/engine-spec.md` and `docs/card-schema.md` and follow them exactly.
> 
> 1. Create `src/engine/` and implement the following TypeScript files:
>    - `src/engine/zones.ts` – Zone enum.
>    - `src/engine/card.ts` – Card interface/type with static and runtime fields.
>    - `src/engine/player.ts` – Player type with fields defined in the spec.
>    - `src/engine/gameState.ts` – GameState type holding:
>      - players[]
>      - activePlayerId
>      - firstPlayerId
>      - turnNumber
>      - any global flags we need.
> 2. Ensure all types match the shapes described in `docs/engine-spec.md`.
> 3. Add basic Jest tests in `tests/engine-basic.test.ts` that:
>    - Construct a GameState with two players and Deities.
>    - Assert that initial essence and baseKl are set correctly.

---

### Task 2 – Implement KL & God Charge logic

**Prompt:**

> Read `docs/engine-spec.md`, focusing on sections 2.2 (KL) and 2.3 (God Charges).
> 
> Implement in `src/engine/resources.ts`:
> - `recalculateKl(player: Player): number`
> - `checkGodThreshold(player: Player, oldKl: number, newKl: number)`
> - `canSpendGodCharges(player: Player, amount: number, turnNumber: number): boolean`
> - `spendGodCharges(player: Player, amount: number, turnNumber: number): void`
> 
> Then:
> - Update `src/engine/turn.ts` to:
>   - Reset `klThresholdTriggeredThisTurn` at the start of the Start Phase.
>   - Call `recalculateKl` and `checkGodThreshold` in Start Phase.
> 
> Write tests in `tests/resources.test.ts` that:
> - Verify crossing from 12 to 13 KL grants exactly 1 God Charge.
> - Verify crossing from 13 to higher does not grant another charge.
> - Verify God Charges cannot be spent on turns 1–3, but can be spent on turn 4+.

---

## Phase 2 – Zones, Card Movement, and Setup

### Task 3 – Implement zones & card movement

**Prompt:**

> Using `docs/engine-spec.md`, implement functions under `src/engine/zones.ts` and `src/engine/movement.ts` to:
> - Move a card between zones.
> - Play a Domain card (handle replacing existing Domain).
> - Play a Shard (move to SHARD_ROW).
> - Play an Avatar/Token (move to AVATAR_LINE).
> - Play a Relic/Support (move to RELIC_SUPPORT_ZONE).
> - Nullify a card (`nullifyCard`), with special handling for tokens (tokens cease to exist).
> 
> Add Jest tests that:
> - Ensure playing a new Domain moves the old Domain to Crypt.
> - Ensure Shards/Avatars/Relics go to correct zones.
> - Ensure `nullifyCard` puts non-token cards into Null zone, but removes tokens entirely.

---

## Phase 3 – Turn Structure & Combat

### Task 4 – Implement full turn loop

**Prompt:**

> Implement in `src/engine/turn.ts`:
> - A `startTurn(gameState: GameState)` function that:
>   - Advances `turnNumber`.
>   - Sets `activePlayer`.
>   - Calls `startPhase` per engine-spec, including:
>     - readyAllPermanents
>     - draw card (skip first player first turn)
>     - reset KL threshold flag
>     - recalculate KL
>     - check God Threshold
>     - resolve start-of-turn triggers.
> - `mainPhase`, `combatPhase`, and `endPhase` skeletons that call the correct helpers.
> 
> Add Jest tests that:
> - Verify draw skipping for first player.
> - Verify KL recalculation and God Threshold behavior at Start Phase.

---

### Task 5 – Implement basic combat

**Prompt:**

> Implement basic combat logic as defined in `docs/engine-spec.md`:
> - Support declaring attackers (ready Avatars only).
> - Support declaring blockers (ready Avatars only).
> - Implement `resolveCombatDamage`:
>   - Attacker vs blockers.
>   - Destroy Avatars with damage >= guard.
>   - Deal Essence damage to Deity if attacker is unblocked.
> 
> Add tests that:
> - Verify unblocked attackers damage the Deity.
> - Verify blocked attackers and blockers deal damage to each other.
> - Verify Avatars die when damage >= guard.

---

## Phase 4 – Abilities & Synergies (Later)

After the core engine is stable, Codex can be asked to:

- Implement ability hooks (onStartOfTurn, onCardPlayed, etc.).
- Implement specific cards (Deities, Domains, Avatars) with abilities that manipulate KL, Essence, God Charges, and zones.

For now, focus on **Phase 1–3** to get a playable skeleton of Essence Crown.
