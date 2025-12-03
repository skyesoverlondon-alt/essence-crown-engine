# Codex Task Guide – Essence Crown Engine

This file contains **prompt templates** and a suggested order of tasks for Codex (or any code-focused model) working on this repo.

Always remind Codex:

- The rules in `docs/engine-spec.md` and `docs/rules-core.md` are **ground truth**.
- Do **not** invent new rules; if something is unclear, favor minimal implementation and follow the spec.

---

## Phase 1 – Core Data Structures & Turn Skeleton

### Task 1 – Implement core types and GameState

**Prompt to give Codex:**

> You are implementing the Essence Crown TCG engine in this repo.  
> Read `docs/engine-spec.md` and `docs/card-schema.md` and follow them exactly.  
>  
> Phase 1 – Task 1:  
> 1. Create `src/engine/` and implement the following TypeScript files:
>    - `src/engine/zones.ts` – `Zone` enum with all zones listed in the spec.
>    - `src/engine/card.ts` – `Card` interface/type with static and runtime fields from the spec and schema.
>    - `src/engine/player.ts` – `Player` type with all fields defined in the spec.
>    - `src/engine/gameState.ts` – `GameState` type holding:
>      - `players: Player[]`
>      - `activePlayerId: string`
>      - `firstPlayerId: string`
>      - `turnNumber: number`
>      - any other global flags required by the spec.
> 2. Ensure all types match the shapes described in `docs/engine-spec.md` and `docs/card-schema.md` (no extra invented rules).
> 3. Add basic Jest tests in `tests/engine-basic.test.ts` that:
>    - Construct a `GameState` with two players and one Deity each.
>    - Initialize `essence` and `baseKl` from the Deity cards.
>    - Assert that these values are correctly set on `Player`.

---

### Task 2 – Implement KL & God Charge logic

**Prompt to give Codex:**

> Phase 1 – Task 2: Implement KL and God Charge rules.  
> Read sections 2.2 (KL) and 2.3 (God Charges) in `docs/engine-spec.md`.  
>  
> 1. In `src/engine/resources.ts`, implement:
>    - `recalculateKl(player: Player): number`
>    - `checkGodThreshold(player: Player, oldKl: number, newKl: number): void`
>    - `canSpendGodCharges(player: Player, amount: number, turnNumber: number): boolean`
>    - `spendGodCharges(player: Player, amount: number, turnNumber: number): void`
> 2. Make sure `recalculateKl`:
>    - Starts from `player.baseKl`.
>    - Adds +1 per Shard in `player.shardRow`.
>    - Adds static KL bonuses from Domain/Relics/Deity (stub helper allowed).
>    - Adds start-of-turn KL effects (stub helper allowed).
>    - Caps KL between 0 and 31.
> 3. Make sure `checkGodThreshold`:
>    - Uses the “old < 13 && new >= 13” rule.
>    - Grants at most 1 Threshold God Charge per turn.
>    - Respects the max of 3 God Charges.
> 4. Integrate this into the Start Phase logic in `src/engine/turn.ts`:
>    - Reset `klThresholdTriggeredThisTurn` at the start of the Start Phase.
>    - Recalculate KL.
>    - Call `checkGodThreshold`.
> 5. Add Jest tests in `tests/resources.test.ts` that:
>    - Verify crossing from 12 to 13 KL grants exactly 1 God Charge.
>    - Verify increasing KL further in the same turn does NOT give another Threshold charge.
>    - Verify God Charges cannot be spent on turns 1–3 but can be spent on turn 4+.
>    - Verify KL never exceeds 31.

---

## Phase 2 – Zones, Card Movement, and Setup

### Task 3 – Implement zones & card movement

**Prompt to give Codex:**

> Phase 2 – Task 3: Zones and card movement.  
> Read the zone and domain rules in `docs/engine-spec.md`.  
>  
> 1. In `src/engine/zones.ts`, add helpers for:
>    - Getting all cards in a specific zone for a player.
>    - Moving a card from one zone to another.
> 2. In `src/engine/movement.ts`, implement:
>    - `playDomain(player: Player, card: Card, gameState: GameState)`:
>      - Requires card.typeLine === "DOMAIN" and card in HAND.
>      - Pays KL cost (use existing cost helpers).
>      - If `player.domainZone` is occupied, move the old Domain to `CRYPT`.
>      - Move new Domain into `DOMAIN_ZONE`.
>    - `playShard(player: Player, card: Card, gameState: GameState)`:
>      - Move card to `SHARD_ROW`.
>    - `playAvatarOrToken(player: Player, card: Card, gameState: GameState)`:
>      - Move card to `AVATAR_LINE`.
>    - `playRelicOrSupport(player: Player, card: Card, gameState: GameState)`:
>      - Move card to `RELIC_SUPPORT_ZONE`.
>    - `nullifyCard(card: Card, gameState: GameState)`:
>      - Remove card from its current zone.
>      - If `card.isToken` is true, it ceases to exist (do not place in Crypt/Null).
>      - Otherwise, place it in the owner’s `NULL_ZONE`.
> 3. Add Jest tests in `tests/movement.test.ts` for:
>    - Playing a new Domain moves any existing Domain to Crypt and the new Domain into Domain Zone.
>    - Shards go to Shard Row, Avatars/Tokens to Avatar Line, Relics/Support to Relic/Support Zone.
>    - `nullifyCard` sends non-token cards to Null Zone and completely removes tokens.

---

## Phase 3 – Turn Structure & Combat

### Task 4 – Implement full turn loop

**Prompt to give Codex:**

> Phase 3 – Task 4: Turn structure.  
> Read the Turn Structure section in `docs/engine-spec.md`.  
>  
> 1. In `src/engine/turn.ts`, implement:
>    - `startTurn(gameState: GameState): void`
>    - `startPhase(player: Player, gameState: GameState): void`
>    - `mainPhase(player: Player, gameState: GameState): void`
>    - `combatPhase(player: Player, gameState: GameState): void`
>    - `endPhase(player: Player, gameState: GameState): void`
> 2. `startTurn` should:
>    - Advance `gameState.turnNumber`.
>    - Rotate `activePlayerId` to the next player.
>    - Call `startPhase` for the active player.
> 3. `startPhase` should:
>    - Ready all permanents.
>    - Handle draw step (skip draw if this is turn 1 and this player is the first player).
>    - Reset `klThresholdTriggeredThisTurn`.
>    - Recalculate KL and apply `checkGodThreshold`.
>    - Resolve start-of-turn triggers (can be stubbed).
> 4. For now, `mainPhase`, `combatPhase`, and `endPhase` can be simple skeletons that call existing helpers and will be expanded later.
> 5. Add Jest tests in `tests/turn.test.ts` that:
>    - Verify the first player skips their first draw.
>    - Verify KL is recalculated and capped at 31 at the start of the turn.
>    - Verify crossing 13 KL in Start Phase grants exactly one God Charge.

---

### Task 5 – Implement basic combat

**Prompt to give Codex:**

> Phase 3 – Task 5: Basic combat.  
> Read the combat rules in `docs/engine-spec.md`.  
>  
> 1. In `src/engine/combat.ts`, implement:
>    - Data structures for:
>      - `attackingAvatars: Card[]`
>      - `blockAssignments: Map<Card, Card[]>` (attacker → list of blockers).
>    - Functions:
>      - `declareAttackers(...)`
>      - `declareBlockers(...)`
>      - `resolveCombatDamage(gameState: GameState): void`
> 2. `resolveCombatDamage` must:
>    - For each unblocked attacker:
>      - Deal Essence damage to the defending Deity equal to its `power`.
>    - For each blocked attacker:
>      - Apply simultaneous damage:
>        - Each attacker deals damage equal to its `power` to its blockers (use simple even or ordered assignment as per spec or a basic rule).
>        - Each blocker deals damage equal to its `power` to the attacker.
>    - Mark damage on units (`damageMarked`).
>    - Destroy any Avatar whose `damageMarked >= guard`, sending it to Crypt (or Null if some replacement effect is used later).
> 3. Ensure End Phase clears `damageMarked` on surviving Avatars.
> 4. Add Jest tests in `tests/combat.test.ts`:
>    - Unblocked attackers damage the defending player’s Essence.
>    - Blocked attackers and blockers damage each other.
>    - Avatars die when damage ≥ Guard, and survivors have damage cleared at end of turn.

---

## Phase 4 – Abilities & Synergies (Later)

**High-level prompt for later, once core engine is stable:**

> Phase 4 – Abilities and synergies.  
> Extend the engine to support card abilities based on the hooks described in `docs/engine-spec.md`:
> - Implement generic hooks such as:
>   - `onStartOfTurn`
>   - `onEndOfTurn`
>   - `onCardPlayed`
>   - `onAvatarDestroyed`
>   - `onEnterZone`
>   - `onLeaveZone`
> - Add a simple ability resolution system that:
>   - Reads `abilities` from card data.
>   - For now, can hard-code a few example cards (Deities, Domains, Avatars) to demonstrate:
>     - KL bonuses
>     - Essence damage/healing
>     - God Charge gain/spend
>     - Crypt/Null interactions
> 
> Do not change the core rules in `docs/engine-spec.md` or `docs/rules-core.md`. Only implement abilities that are compatible with those rules.

For now, focus Codex on **Phase 1–3** so you get a solid, rules-correct engine skeleton for Essence Crown.
