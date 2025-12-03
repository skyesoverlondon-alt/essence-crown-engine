Essence Crown: Shard Wars – Rules Engine Specification (B-Spec)
1. Purpose

Build a reusable rules engine for my card game, Essence Crown: Shard Wars.

The engine should:

Load cards from a CSV/spreadsheet (the card list I already have).

Track game state (players, decks, hands, Essence totals, battlefield, etc.).

Enforce legal vs illegal moves (turn order, phases, costs).

Apply card effects (Essence damage, healing, drawing cards, buffs, etc.).

Detect win/lose conditions (at minimum, Deity Essence reaching 0).

The engine does not need to handle graphics, UI, or networking.
It is a pure game logic module that other code (UI, AI, campaign) will call.

2. Card Data Model (Input From CSV / Spreadsheet)

The engine must be able to read a list of cards from a CSV or JSON array where each row/item has these fields:

CardID – unique ID like EC-001, EC-045, etc.

Name – display name, e.g. "Second Sun Herald".

Rarity – e.g. Common, Adept, Mythic.

Type – a text string like:

Deity — Glow / Gray

Avatar — Void

Avatar — Glow / Gray

Spell — Glow

Relic

Shard

Domain

Rite

Essence

Cost – numeric cost to play this card (generic resource, e.g. “shards”).

Essence – for Deity cards, this is their starting life total (e.g. 23). Usually empty for non-Deity cards.

Domain – flavor/affiliation like "Second Sun", "Nullgrid", "New Earth", etc.

RulesText – human-readable rules text and effects.

imageUrl or URL – URL to the artwork.

Power – numeric attack value for Avatars (can be empty for non-creature cards).

Toughness – numeric defense/health for Avatars (can be empty for non-creature cards).

2.1. Normalization

When the engine loads this data, it must build an in-memory card library, e.g.:

cardLibrary[CardID] = {
  id: CardID,
  name,
  rarity,
  typeRaw,      // original Type string
  baseType,     // parsed from typeRaw: "Deity", "Avatar", "Spell", "Relic", "Shard", "Domain", "Rite", "Essence", etc.
  aspects,      // parsed aspects such as ["Glow", "Gray", "Void", "Beast"] from typeRaw
  cost,         // number (default 0 if blank)
  essenceValue, // number (for Deities; 0 or null for others)
  domain,       // text
  rulesText,    // text
  imageUrl,     // url or empty string
  power,        // number or null
  toughness     // number or null
}


Parsing rule for Type:

Split on '—':

Left side → baseType (e.g. "Deity", "Avatar", "Spell", "Domain", "Relic", "Shard", "Rite", "Essence").

Right side (if present) → aspects string (e.g. "Glow / Gray").

Split aspects string on '/' and trim whitespace to get an array like ["Glow", "Gray"].

3. Game Concepts
3.1. Players

The engine is built for 2 players (Player vs Enemy/AI) by default, but design it so more players could be added later if needed.

Each player has:

id (e.g. "P1", "P2", "AI").

name (display name).

A Deity:

Chosen from a Deity card (baseType === "Deity").

Provides starting Essence/max Essence.

A deck:

A list of CardIDs, which the engine will convert into card instances and shuffle.

Zones:

DECK

HAND

NEW_EARTH (battlefield)

GRAVEYARD

EXILE

DEITY (zone for the Deity instance)

Resources:

EssenceCurrent and EssenceMax (from their Deity card, or scenario override).

A generic resource pool (call it ResourcePoints or shards) used to pay card Cost.

Optionally KL or other game currencies, which can be added later.

3.2. Zones and Card Instances

The engine must work with card instances (physical copies in play), not just definitions.

Each card instance:

instanceId – unique ID like "EC-004#17".

cardId – links back to the card definition in cardLibrary.

ownerId – which player owns this instance.

zone – which zone it’s currently in:

"DECK", "HAND", "NEW_EARTH", "GRAVEYARD", "EXILE", "DEITY".

tapped – boolean, if you support exhausted state.

damage – damage currently on the card (if relevant).

tempBuffs – temporary modifications like { power: +1, toughness: +0 } until end of turn.

Each player has zone arrays holding instanceIds, e.g.:

player.zones = {
  DECK:        [instanceId1, instanceId2, ...],
  HAND:        [instanceIdX, ...],
  NEW_EARTH:   [instanceIdY, ...],
  GRAVEYARD:   [...],
  EXILE:       [...],
  // DEITY zone handled by a single deityInstanceId reference
}

4. Turn & Phase Structure

The game is turn-based. The engine must track:

currentTurnNumber (starting at 1).

currentPlayerId (whose turn it is).

currentPhase (which step of the turn we’re in).

Phases per turn (basic v1):

START

MAIN

ATTACK

END

4.1. Phase Responsibilities

START Phase:

Untap / ready any tapped cards (if desired).

Process “start of turn” triggers later (optional).

Draw 1 card automatically by default (this can be configurable).

MAIN Phase:

Active player may:

Play cards from their hand (subject to costs and legality).

Activate abilities allowed in MAIN phase.

ATTACK Phase:

Active player may:

Declare attacks with Avatars on New Earth (for v1, simplest is always “attack enemy Deity directly”).

Engine processes attack damage to the defending Deity.

END Phase:

Clean up end-of-turn effects:

Remove temporary buffs (“until end of turn”).

Reset flags if needed.

Then pass the turn:

Next player’s START phase begins.

Increment turnNumber if full round finished.

4.2. Phase Management API

Engine must provide a function:

advancePhase()

Behavior:

If currentPhase is not END:
Move to the next phase in the order: START → MAIN → ATTACK → END.

If currentPhase is END:

Run end-of-turn cleanup.

Switch currentPlayerId to the other player.

Set phase to START.

Increment currentTurnNumber as appropriate.

Execute start-of-turn effects (e.g. draw 1 card).

5. Actions the Engine Must Support (External API)

These are the core functions external code (UI, AI, campaign) should be able to call.

5.1. startGame(config)

Starts a new game.

config includes:

{
  players: [
    {
      id: "P1",
      name: "Some Name",
      deityId: "EC-001",
      deckList: ["EC-003","EC-004", ...],
      startingEssenceOverride: 23,       // optional
      startingResources: { ResourcePoints: 0, KL: 3 } // optional
    },
    {
      id: "AI",
      name: "Enemy Name",
      deityId: "EC-002",
      deckList: [...],
      startingEssenceOverride: 23,
      startingResources: { ResourcePoints: 0, KL: 3 }
    }
  ],
  startingPlayerId: "P1"
}


Engine must:

Create a card instance for each card in each player’s deck.

Create a Deity instance for each player using deityId.

Place the Deity instance into that player’s DEITY zone.

Initialize Essence:

EssenceMax = Deity’s essenceValue from card (or use startingEssenceOverride if provided; or a global default if both missing).

EssenceCurrent = EssenceMax.

Initialize resources:

ResourcePoints, KL, etc. from startingResources (or defaults).

Shuffle each player’s DECK zone.

Draw an initial hand (for example, 5 cards) into HAND.

Set:

currentTurnNumber = 1

currentPlayerId = startingPlayerId

currentPhase = "START"

5.2. playCard(playerId, instanceId, options)

Attempts to play a card from hand.

Engine must do:

Check that:

playerId exists.

It is currently playerId’s turn (currentPlayerId).

currentPhase is MAIN (for v1, only MAIN phase play is allowed).

The instanceId is actually in player.zones.HAND.

Look up the card’s definition from cardLibrary using cardId.

Check resources:

Player must have ResourcePoints >= card.cost.

If illegal, return error (or throw) with a clear reason string.

If legal:

Subtract card.cost from ResourcePoints.

Remove instanceId from HAND.

Move it to the appropriate zone:

baseType in {"Avatar", "Relic", "Shard", "Domain", "Essence", "Rite"} → NEW_EARTH.

baseType == "Spell" → resolve effect and then move to GRAVEYARD.

Any unknown baseType can be treated as a Spell for now and sent to graveyard after effect.

Trigger the card’s On Play ability:

Generic text parsing for standard phrases.

Card-specific scripts for special behaviors.

5.3. attackDeity(attackerPlayerId, attackerInstanceId)

Handles a simple direct attack from an Avatar to the opposing Deity.

Engine must:

Verify:

attackerPlayerId exists.

It is that player’s turn.

currentPhase is ATTACK.

attackerInstanceId is in that player’s NEW_EARTH.

For v1, no summoning sickness/blocking required (can be added later).

Get the card’s Power including temporary buffs.

Identify the opponent player (any player who isn’t attackerPlayerId, assuming 2 players).

Reduce opponent’s EssenceCurrent by the attack power.

Log the attack (for debugging/logging).

Trigger any onAttack abilities for that card.

After damage, check win/lose conditions.

5.4. drawCards(playerId, count)

Draws cards from the player’s deck into hand.

Engine must:

For count times:

Take the top card instance from the player’s DECK (or stop if deck is empty).

Move it into HAND.

Optionally log when a player attempts to draw from an empty deck.

This function is also used internally for start-of-turn draws and card effects.

5.5. Essence and Resource Manipulation (Helper APIs)

Engine should provide internal or context helper functions for ability scripts:

dealEssenceDamage(playerId, amount)

Reduce that player’s Deity EssenceCurrent by amount, minimum 0.

After change, immediately call win/lose check.

healEssence(playerId, amount)

Increase EssenceCurrent by amount, but not above EssenceMax.

modifyResource(playerId, delta)

Increase or decrease generic ResourcePoints by delta (e.g. ramp effects).

Additional helpers can be added later for KL or other resources.

6. Ability System (Card Effects)

The engine must support card effects via:

Generic text parsing for common templates.

Explicit scripted abilities keyed by CardID.

6.1. Generic Text Parsing (Simple Templates)

For v1, the engine should be able to recognize and automatically resolve a few standard RulesText patterns:

Examples:

"Deal X Essence damage to target Deity."
→ Parse X as a number and apply to the chosen Deity (for now, assume “target Deity” is always the enemy Deity unless target selection is provided).

"On Play: Deal X Essence damage to target Deity."
→ When the card is played, do the same as above.

"Both Deities gain X Essence."
→ Heal both players’ Deity Essence by X.

"Draw X cards."
→ Draw X cards for the controller.

"Draw a card."
→ Draw 1 card for the controller.

The engine does not need to cover every possible sentence in RulesText. The goal is to handle the most common, simple patterns automatically.

6.2. Scripted Abilities Map (Card-Specific Logic)

For more complex cards, the engine must support a scripted abilities map, something like:

AbilityScripts[CardID] = {
  onPlay(ctx) { ... },
  onAttack(ctx) { ... },
  onStartOfTurn(ctx) { ... },   // optional later
  onEndOfTurn(ctx) { ... }      // optional later
};


Where ctx (context) provides:

ctx.engine – reference to the engine instance.

ctx.state – full game state.

ctx.sourceInstance – the card instance triggering the ability.

ctx.sourceCard – the card definition from the library.

ctx.controllerId – which player controls this card.

Optional ctx.extra – any extra data passed in.

And helper methods inside ctx, such as:

ctx.log(message) – log to engine log/console.

ctx.getPlayerState(playerId)

ctx.getOpponentId() – for 2-player games.

ctx.dealEssenceDamage(playerId, amount)

ctx.healEssence(playerId, amount)

ctx.drawCards(playerId, count)

ctx.buffAvatar(instanceId, powerDelta, toughnessDelta)

The AbilityScripts map is where complex Deity effects, “God Code” abilities, KL manipulation, etc. can be implemented beyond what the generic parser can understand.

7. Win / Lose Conditions (Default)

Default global rule:

If any player’s Deity Essence (EssenceCurrent) falls to 0 or below, that player loses.

Engine should:

Set a gameOver = true flag.

Set winnerId to the other player’s ID (if one exists).

Optionally keep a log entry like "GAME OVER: P1 wins. P2's Deity hit 0 Essence.".

Campaign/scenario code can add additional win/lose conditions on top of this, but this is the baseline.

8. Campaign / Story Layer (Thin Layer on Top)

The campaign/story mode is intentionally kept outside the rules engine.

The engine only needs to support being configured by some higher-level “scenario” code.

A campaign system will:

Define chapters or scenarios, each specifying:

Player Deity ID + deck list.

Enemy Deity ID + deck list.

Starting Essence or resources overrides.

Special rules for the scenario.

Call startGame(config) with these parameters.

Hook into phase/turn transitions and call ability helpers or custom logic for story events.

Basic example of a scenario structure (for the campaign layer, not inside the engine itself):

const Chapter1 = {
  id: "ch1_second_sun_awakens",
  title: "Chapter I – The Second Sun Herald",
  setup: {
    player: {
      deityId: "EC-001",
      deckList: [ /* CardIDs */ ],
      startingEssenceOverride: 23
    },
    enemy: {
      deityId: "EC-002",
      deckList: [ /* CardIDs */ ],
      startingEssenceOverride: 23
    },
    startingPlayerId: "P1"
  },
  // additional story and scenario rules can be defined here
};


The campaign system (outside the engine) can:

On certain turns or phases, call engine helpers to:

Give extra cards.

Adjust resources.

Log story text.

Modify win/lose conditions.

The rules engine does not need to understand the narrative; it just enforces the core game rules.
