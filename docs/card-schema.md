Essence Crown – Card Schema

This file defines how cards are represented as data (e.g., JSON) so the engine can load them.

1. Base JSON Shape

Each card is represented as an object with a consistent shape. Example:

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
      "description": "At the start of your turn, if you control at least one Glow Avatar, gain +1 KL this turn."
    }
  ],
  "isToken": false
}


This is an example record. Real cards should follow the same field structure.

2. Core Fields
2.1 Identification & Typing

cardId: string
Unique identifier for the card (e.g., "EC-001", "EC-045").

name: string
Display name of the card (e.g., "Second Sun Herald").

typeLine: string
A single type keyword, one of:

"DEITY"

"DOMAIN"

"SHARD"

"AVATAR"

"SPELL"

"RITE"

"RELIC"

"SUPPORT"

"TOKEN"

subtypes: string[]
Tags for Aspects, races, roles, etc. Examples:

["Glow"]

["Void"]

["Gray", "Avatar"]

domainTag?: string
Optional realm/Domain name this card belongs to, e.g.:

"Second Sun"

"Null Depths"

"Shardwilds"

2.2 Costs & Stats

klCost: number
KL (Kundalini Level) cost to play the card (0 or more).

Deities often have 0 because they start on the board, not cast from hand.

power?: number
Attack value for combat units (Avatars, Tokens, sometimes Support).

guard?: number
Defensive threshold (toughness) for combat units.
If damage marked on the unit ≥ guard in a combat, the unit is destroyed.

startingEssence?: number
For Deity cards only:

Used to set the player’s starting Essence (life total).

baseKl?: number
For Deity cards only:

Used in the KL recalculation formula as the Deity’s Base KL.

2.3 Abilities

abilities: Ability[]
List of abilities printed on the card. For now, the engine can treat them as descriptive text and simple labels.

Minimal shape:

{
  "id": "some-unique-ability-id",
  "label": "Short name for UI",
  "description": "Full rules text exactly as it appears on the card."
}


Later, this can be extended with fields like:

trigger (e.g., "START_OF_TURN", "ON_PLAY", "ON_ATTACK")

effectType

effectParams

But the first version of the engine only needs label + description to exist.

2.4 Token Flag

isToken: boolean

true for Token / Echo Avatar cards created by effects.

false for normal, physical deck cards.

Engine behavior:

When a token leaves the battlefield, it usually ceases to exist instead of going to Crypt or Null.

Non-token cards move between normal zones (Veiled Deck, Hand, Battlefield, Crypt, Null).

3. Engine Expectations (V1)

For the initial engine implementation, code should:

Be able to load card data from a JSON file or similar structure using this schema.

At minimum, correctly use these fields:

cardId

name

typeLine

subtypes

domainTag

klCost

power

guard

startingEssence

baseKl

isToken

Treat abilities as:

an array of objects with label and description, used for display and future logic.

Cards may have extra metadata fields (rarity, art URL, set code, etc.), but the engine must not rely on those for rules.

4. Future Extensions (Optional)

Later versions of the schema can safely add:

Rarity & Set info

rarity: "Common" | "Uncommon" | "Rare" | "Mythic"

setCode: string (e.g., "EC1" for the first Essence Crown set)

Art / Asset references

imageUrl: string

cardBackUrl: string

Structured abilities

trigger: string

conditions: object

effects: object[]

When extending, keep the existing fields and shapes compatible so older JSON and engine code still work.
