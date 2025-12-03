# Essence Crown – Core Rules v2
*(KL = Energy, Essence = Life, God Charges = Divine Overdrive)*

---

## 0. Plain-Language Core Ideas

- **Essence** = your Deity’s life total. If it hits **0**, you lose.
- **KL (Kundalini Level)** = your energy / mana each turn. You spend KL to play almost all cards.
- **13 KL (“God Threshold”)** = the special level where your Deity’s power “awakens”.
  - The first time each turn your KL reaches **13 or more** (from 12 or less), you gain **1 God Charge** (up to 3).
- **31 KL (“Absolute KL Cap”)** = the hard maximum for your KL.
  - Your KL can never go above **31**. If an effect would push it higher, you stay at **31** instead.
- **God Charges** = stored divine boosters on your Deity.
  - You gain them when you cross **13 KL** or via card effects.
  - You can never hold more than **3**.
  - You cannot spend any God Charges until **after turn 3** of the game.

---

## 1. Components

A game of **Essence Crown** uses:

- **1 Deity card per player**
- **Domain cards**
- A **Veiled Deck** (main deck) for each player
- Card types in the Veiled Deck:
  - Shards
  - Avatars
  - Spells (Aspect Spells)
  - Rites
  - Relics
  - Support / Companion
  - Additional Essence/Resource cards if desired
- Tokens / Echo Avatars for generated units
- Trackers:
  - Essence tracker (dial, dice, or printed track)
  - KL tracker (0–31)
  - God Charge tracker (0–3)
  - Optional: turn counter

---

## 2. Core Resources

### 2.1 Essence – Life Force

- Your Deity has a printed **Essence** value (e.g., 23).
- This is your **life total**.
- If your Essence is ever **0 or less**, you lose the game.

Essence changes through:

- **Damage**: “Deal 3 Essence damage to a Deity” → subtract 3 Essence.
- **Loss**: “You lose 2 Essence” → subtract 2 directly.
- **Healing**: “Heal 4 Essence to your Deity” → add 4 (up to any cap your format uses).

**Essence as Cost**

- Essence is **not** your main resource.
- You only pay Essence when a card explicitly says so, e.g.:
  - “As an additional cost to cast this spell, pay 3 Essence.”
  - “You may pay up to 5 Essence; this spell deals that much extra damage.”
- Paying Essence lowers your life total: risky but powerful.

---

### 2.2 KL – Kundalini Level (Energy)

KL is the only default energy you spend on card costs.

- A card’s **Cost** is a **KL cost** unless the text specifically adds Essence or something else.
- Every turn, at your **Start Phase**, you recalculate your **current KL** for that turn.

#### 2.2.1 KL Sources

Your KL each turn is determined by:

- Your Deity’s **Base KL**
- The number of **Shards** you control
- Static bonuses from:
  - Domain
  - Relics / Support
  - Passive Deity abilities
- “Start of turn” KL effects  
  (e.g., “At the start of your turn, gain +1 KL this turn.”)

**Default formula:**

```text
KL_new = Base KL
       + number of Shards you control
       + static KL bonuses (Domain/Relics/etc.)
       + start-of-turn KL effects
       (then capped at 31)
