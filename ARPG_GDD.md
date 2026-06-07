# GAME DESIGN DOCUMENT
# Project Codename: ASHFALL
### Version 1.0 | 2D Isometric Action RPG

---

## DOCUMENT PURPOSE & AI INSTRUCTIONS

This document is the authoritative design specification for **ASHFALL**, a 2D isometric ARPG.  
It is structured for direct consumption by an AI code-generation system.

**How to read this document:**
- Each section is self-contained and can be implemented independently.
- Implementation Notes appear throughout in `> AI NOTE:` blocks — prioritize these.
- Data tables define exact values; treat them as constants unless balance requires adjustment.
- Where `[PLACEHOLDER]` appears, the AI should use reasonable defaults and flag them for review.
- The word **MUST** = non-negotiable requirement. **SHOULD** = strongly recommended. **MAY** = optional.

---

## TABLE OF CONTENTS

1. Game Overview
2. Core Design Pillars
3. Technical Architecture & Stack
4. Visual Direction & Art Style
5. Controls & Input
6. Camera & Perspective
7. Player Classes
8. Combat System
9. Character Progression
10. Item System
11. Crafting System
12. Gambling System
13. World & Level Design
14. Enemy System
15. Boss Design
16. HUD & User Interface
17. Audio Design
18. Save & Persistence
19. Content Roadmap
20. Appendices

---

## 1. GAME OVERVIEW

| Field | Value |
|---|---|
| Working Title | Ashfall |
| Genre | 2D Isometric Action RPG (ARPG) |
| Target Platform | Web Browser (primary) and/or Desktop (secondary) |
| Perspective | Isometric 2D (fixed angle) |
| Art Style | Stylized pixel art — dark fantasy |
| Player Count | Single-player (multiplayer considered for later) |
| Primary Inspirations | Path of Exile, Diablo II/IV, Hero Siege, Torchlight II |
| Core Loop | Kill enemies → loot/craft items → become stronger → deeper zones → repeat |
| Session Length | 30–90 minutes per session |

### 1.1 Elevator Pitch

> Ashfall is a dark-fantasy 2D isometric ARPG featuring brutal real-time combat, deep loot-driven progression, and Path of Exile–inspired crafting and gambling systems. The world is drenched in shadow, corruption, and consequence. Players choose a class, descend into increasingly dangerous procedurally influenced zones, and grow powerful through skill, strategy, and the relentless pursuit of the perfect item.

---

## 2. CORE DESIGN PILLARS

These pillars MUST guide every design decision. When in conflict, use this priority order.

### Pillar 1: "One More Run" Compulsion
Every session must end with the player wanting to immediately start another. Loot drops, crafting potential, and progression hooks must always leave a dangling carrot.

### Pillar 2: Meaningful Build Depth
Skill choices, passive trees, and itemization MUST create genuinely different playstyles. No two builds should feel identical at endgame.

### Pillar 3: Loot is the Story
Items tell the world's story through their names, flavour text, and affixes. A legendary drop should feel like a narrative event.

### Pillar 4: Satisfying Combat Feel
Every attack, spell, and kill must feel visceral and responsive. Hit feedback (screen shake, sound, particle effects, enemy reaction) is as important as the numbers.

### Pillar 5: Mastery of Chaos
Crafting and gambling systems should feel simultaneously accessible and deep. Players should be able to stumble into powerful results early, but mastery should reward hundreds of hours.

---

## 3. TECHNICAL ARCHITECTURE & STACK

### 3.1 Recommended Stack (AI May Substitute)

> AI NOTE: The following is a recommended starting point. If you have strong reasons to use a different stack (e.g., a framework with better isometric support or one you can implement more correctly), document your choice and proceed. The requirements below MUST be met regardless of stack.

#### Option A — Browser-First (Recommended for Accessibility)
| Layer | Technology |
|---|---|
| Game Engine | Phaser 3 (v3.70+) |
| Language | TypeScript |
| Bundler | Vite |
| Physics | Phaser Arcade Physics (built-in) |
| Audio | Phaser Sound Manager + Howler.js fallback |
| Storage | localStorage for save data |
| Rendering | WebGL (Canvas fallback) |

#### Option B — Desktop with Web Export
| Layer | Technology |
|---|---|
| Game Engine | Godot 4.x |
| Language | GDScript or C# |
| Export Targets | Web (HTML5) + Windows/macOS/Linux |
| Physics | Godot built-in 2D physics |
| Storage | Godot's FileAccess / JSON |

#### Option C — AI's Own Choice
If neither option above is optimal, the AI MUST:
- Document the chosen stack clearly
- Ensure all functional requirements in this GDD are implementable
- Ensure web browser playability OR desktop executable output

### 3.2 Non-Negotiable Technical Requirements

- Target frame rate: **60 FPS** minimum
- Screen resolution: **1920x1080** native, scaled gracefully to smaller screens
- Isometric rendering: **staggered tile grid** or **diamond grid** (see Section 6)
- Asset format: **PNG sprites** with transparency; spritesheets where possible
- Save format: **JSON** (human-readable, debug-friendly)
- No server required for single-player (all data client-side)

### 3.3 Project Structure (Suggested)

```
/src
  /core           — Game loop, scene manager, event bus
  /entities       — Player, enemies, projectiles, items
  /systems        — Combat, loot, crafting, gambling, progression
  /ui             — HUD, menus, inventory, tooltip system
  /world          — Tilemap, procedural generation, zone manager
  /data           — JSON config files (items, enemies, skills, affixes)
  /audio          — Sound and music management
  /utils          — Math helpers, RNG, object pooling
/assets
  /sprites        — All pixel art assets
  /tilemaps       — Tiled map files or procedural seed configs
  /audio          — SFX and music tracks
  /fonts          — Pixel fonts
/data
  /items.json     — Item base types
  /affixes.json   — All affix definitions
  /enemies.json   — Enemy stats and behaviour
  /skills.json    — All skills and modifiers
```

### 3.4 Data-Driven Design Principle

> AI NOTE: ALL game balance values (enemy stats, item drops, affix weights, crafting costs) MUST be stored in external JSON config files, NOT hardcoded in game logic. This allows tuning without code changes. Game systems read from config at runtime.

---

## 4. VISUAL DIRECTION & ART STYLE

### 4.1 Overall Aesthetic

- **Style:** Stylized pixel art — detailed, atmospheric, not retro-minimal
- **Reference titles:** Hero Siege, Hades, Diablo (dark palette), Darkest Dungeon (tone)
- **Mood:** Dark fantasy, corrupted world, ancient evil, flickers of hope
- **Key visual contrast:** Dark, desaturated environments vs. vivid, saturated ability/particle effects

### 4.2 Colour Palette Principles

| Element | Palette Guidance |
|---|---|
| Environment | Deep blues, greens, greys, browns; heavily shadowed |
| Enemies | Desaturated purples, greens, reds — decayed and malevolent |
| UI | Dark charcoal (#1a1a1a) with gold (#c8a84b) and bone-white (#e8dcc8) accents |
| Magic Effects | Vibrant contrast to environment — cyan, violet, orange, electric blue |
| Fire/Explosion | Warm amber and red with bright white cores |
| Common Item | Grey/white text (#aaaaaa) |
| Magic Item | Blue (#6666ff) |
| Rare Item | Yellow (#ffff44) |
| Unique Item | Orange (#d47000) |
| Legendary Item | Red-orange gradient (#ff4400 → #ff9900) |
| Set Item | Green (#44cc44) |

### 4.3 Sprite Specifications

| Asset Type | Base Resolution | Notes |
|---|---|---|
| Isometric Tile | 64×32 px | 2:1 ratio, standard isometric |
| Player Character | 48×48 px | 8-directional or 4-directional + actions |
| Enemy (small) | 32×32 px | Goblins, skeletons, etc. |
| Enemy (medium) | 48×48 px | Demons, cultists, etc. |
| Enemy (large) | 96×96 px | Ogres, greater demons |
| Boss | 128×128 px or larger | Per-boss specification |
| Projectile | 16×16 px | Arrow, bolt, orb |
| Item (world) | 24×24 px | Dropped on ground |
| Item (inventory) | 32×32 px or 32×64 px | Single or double slot |
| UI Elements | Variable | See HUD section |

### 4.4 Animation Requirements

All characters MUST have the following animation states:

**Player:**
- idle (4-frame loop)
- walk/run (8-frame loop, 4 or 8 directions)
- attack_melee (6–8 frames)
- attack_ranged (5 frames: draw → aim → release → recover)
- cast_skill (variable per skill)
- hit_stagger (3 frames)
- death (8 frames, no loop)
- interact (4 frames)

**Enemies:**
- idle (2–4 frame loop)
- walk (4–6 frame loop)
- attack (4–8 frames)
- hit (2 frames)
- death (6–8 frames, no loop)
- special (varies by type)

### 4.5 Tile Art Guidelines

- All tiles MUST tile seamlessly on their respective axes
- Elevation indicated by tile stacking (1 height unit = 16px vertical offset in isometric space)
- Shadow baked into tiles, not cast dynamically (for performance)
- Ambient occlusion baked into tile corners
- Interactive objects (doors, chests, levers) require open/closed/interacted states

### 4.6 Particle Effects

> AI NOTE: Particle systems are CRITICAL to making combat feel satisfying. Implement even with placeholder art.

| Effect | Description |
|---|---|
| Hit spark | 4–6 small particles, colour matches damage type |
| Blood splatter | 3–5 red pixel drops on enemy hit |
| Death burst | Large particle explosion on enemy death |
| Critical hit | Larger spark burst + brief screen flash |
| Skill cast | Element-appropriate particles (flames, ice shards, lightning) |
| Item drop | Small golden sparkle on drop, pulse on ground |
| Experience orb | Small glowing orb that flies to player |
| Level up | Ring of light expanding outward from player |

---

## 5. CONTROLS & INPUT

> AI NOTE: Controls MUST be rebindable via Settings menu. Store bindings in save data.

### 5.1 Keyboard Controls (Default)

| Action | Default Key |
|---|---|
| Move Up | W |
| Move Down | S |
| Move Left | A |
| Move Right | D |
| Skill Slot 1 | Q |
| Skill Slot 2 | E |
| Skill Slot 3 | R |
| Skill Slot 4 | F |
| Potion (Health) | 1 |
| Potion (Mana) | 2 |
| Open Inventory | I or Tab |
| Open Character Sheet | C |
| Open Skill Tree | P or K |
| Open Map | M |
| Interact / Pick Up | Space or F |
| Auto-Pick Up (hold) | Shift |
| Pause / Menu | Escape |
| Quick Save | F5 |
| Quick Load | F9 |

### 5.2 Mouse Controls

| Action | Input |
|---|---|
| Attack (Basic) | Left Mouse Button (hold to repeat) |
| Aim Direction | Mouse cursor position (world-space) |
| Move to Location | Right Mouse Button (optional, secondary movement) |
| Interact / Pick Up | Left Click on item/NPC |
| Context Menu | Right Click on item in inventory |
| Drag Item | Left Click + Drag in inventory |

### 5.3 Movement Model

- WASD produces **8-directional movement** (WASD combinations)
- Player character faces the **mouse cursor** at all times (aim direction)
- Movement and aiming are **fully independent** (player can strafe in any direction while aiming any direction)
- **Movement speed** is a flat stat modified by items and passives (base: 200 units/sec)
- No acceleration/deceleration — movement is immediate (ARPG feel, not platformer)
- Player MUST NOT be blocked by enemies (push/overlap, not hard collision)

### 5.4 Attack Behaviour

- Basic attack fires/swings **toward mouse cursor**
- Holding LMB repeats basic attack at attack speed interval
- Skill activation is **immediate** on key press (no charge unless skill specifies)
- Skills that require targeting show a **range indicator** or **aim reticle**

---

## 6. CAMERA & PERSPECTIVE

### 6.1 Isometric Setup

- **Projection:** 2:1 isometric (tiles are 64px wide × 32px tall)
- **Angle:** Fixed — no camera rotation
- **Camera behaviour:** Smooth follow, always centred on player
- **Camera lead:** Slight offset toward mouse cursor (up to 64px) to show more of the aimed direction
- **Zoom:** Fixed zoom level (1x or 2x pixel-perfect); zoom-in/out optional quality-of-life feature

### 6.2 Depth Sorting

> AI NOTE: Correct depth sorting is essential for isometric rendering. All sprites MUST be sorted by their isometric Y position (bottom of sprite). Implement a z-index sorting pass every frame.

- Sort all rendered objects by `(tile_row + tile_col)` or by world Y coordinate
- Player, enemies, and objects render OVER tiles at the same depth level
- Large objects (multi-tile) sort by their bottommost tile
- Projectiles render ABOVE all sprites
- UI renders above everything

### 6.3 Lighting

- **No dynamic per-pixel lighting** (performance cost)
- **Ambient light** per zone: colour-graded via global overlay (e.g., blue-grey for crypts, orange-red for hellfire zones)
- **Point light simulation:** small radial gradient sprites placed at torches, glowing items, fire effects
- **Player torch/aura:** Optional soft radial light around player
- **Darkness mechanic:** Optional — zones outside torch radius are dimmer (simple opacity overlay)

---

## 7. PLAYER CLASSES

> AI NOTE: Implement Melee and Ranged classes FIRST. All other classes are listed for future implementation — do not implement them yet, but design all shared systems to be class-agnostic.

### 7.1 Class Overview

| Class | Status | Archetype | Resource |
|---|---|---|---|
| Ironclad | ✅ IMPLEMENT FIRST | Melee warrior, tanks, controls space | Rage |
| Ranger | ✅ IMPLEMENT FIRST | Ranged, mobile, precise | Stamina |
| Hexblade | 🔒 Future | Curse-based melee/magic hybrid | Void Essence |
| Pyromancer | 🔒 Future | Elemental caster, AoE fire | Mana |
| Shadowstep | 🔒 Future | Rogue, assassination, traps | Energy |
| Warden | 🔒 Future | Nature magic, summoner | Spirit |

---

### 7.2 Class: Ironclad

**Flavour:** *"The world breaks against them. They do not break."*

The Ironclad is a relentless frontline warrior who wields heavy weapons and wears the thickest armour. They thrive in the middle of the fray, soaking damage while delivering devastating blows. Their resource — Rage — builds as they take and deal damage, fuelling powerful abilities.

#### Stats at Level 1

| Stat | Base Value |
|---|---|
| Health | 120 |
| Rage (max) | 100 |
| Rage Regen | 0 (decays when out of combat) |
| Armour | 15 |
| Move Speed | 185 units/sec |
| Strength | 18 |
| Dexterity | 8 |
| Intelligence | 5 |

#### Rage Mechanic

- Rage DOES NOT regenerate passively — it builds from hits dealt and hits received
- Rage generates: +5 per basic attack landed, +8 per hit taken
- Rage decays: -10 per second when out of combat (no enemy hit in 4 seconds)
- Skills consume Rage; if insufficient Rage, skills are locked
- Visual indicator: Rage gauge glows orange/red; character eyes glow at full Rage

#### Skills (Starting Kit — Levels 1-20)

| Slot | Skill Name | Rage Cost | Description |
|---|---|---|---|
| Basic Attack | Crushing Blow | 0 (generates 5) | Melee swing in front of player, 110% weapon damage. Knockback small enemies. |
| Q | Seismic Slam | 30 | Ground slam, shockwave travels forward 3 tiles, 150% weapon damage in line. |
| E | Iron Fortress | 40 | 2-second shield absorbing up to [Armour × 3] damage. Cannot attack while active. |
| R | Berserker's Charge | 35 | Dash 4 tiles toward cursor, hit all enemies in path for 180% damage, brief stun. |
| F | Whirlwind | 60 | Spin continuously dealing 80% damage/hit to all nearby enemies. Drains 15 Rage/sec while active. |

#### Weapons Usable
- Two-handed swords, axes, mauls (primary)
- One-handed swords + shield (secondary, defensive build)
- Cannot equip bows, staves, or wands

#### Passives (Class-Specific Passive Nodes — see Section 9)
Starting passive bonuses at level 1:
- +20% damage when above 50 Rage
- +15% armour
- Gain 3 Rage per second while attacking

---

### 7.3 Class: Ranger

**Flavour:** *"The arrow was already in the air before you knew she was watching."*

The Ranger is a swift, precise combatant who excels at long-range damage, mobility, and control. Their resource — Stamina — regenerates quickly, rewarding aggressive positioning and movement. They wear light armour and are fragile compared to the Ironclad, but their damage output and kiting ability are unmatched early.

#### Stats at Level 1

| Stat | Base Value |
|---|---|
| Health | 80 |
| Stamina (max) | 100 |
| Stamina Regen | 15 per second (always) |
| Evasion | 12 |
| Move Speed | 220 units/sec |
| Strength | 7 |
| Dexterity | 20 |
| Intelligence | 8 |

#### Stamina Mechanic

- Stamina regenerates passively at a flat rate
- Skills consume Stamina; basic attack generates +3 Stamina per hit
- At 0 Stamina, basic attacks still work but skills are locked until Stamina recovers
- Sprinting (hold Shift) costs 20 Stamina/sec but increases move speed by 50%
- Visual indicator: Stamina bar is green/teal; shows as a secondary bar under health

#### Skills (Starting Kit — Levels 1-20)

| Slot | Skill Name | Stamina Cost | Description |
|---|---|---|---|
| Basic Attack | Quickshot | 0 (generates 3) | Fire an arrow toward cursor. 100% weapon damage, long range. |
| Q | Multishot | 25 | Fire 5 arrows in a 30° arc simultaneously. 80% damage each. |
| E | Explosive Arrow | 35 | Fires an arrow that embeds and detonates after 0.5 sec, 200% AoE damage in 2-tile radius. |
| R | Vaulting Escape | 20 | Backflip 3 tiles away from cursor. Brief invulnerability (0.3 sec) during leap. |
| F | Rain of Arrows | 50 | Mark a 4×4 tile area; after 1 sec, 12 arrows rain down over 2 seconds. 120% each. |

#### Weapons Usable
- Bows (primary)
- Crossbows (slower attack, higher damage per shot)
- Daggers (melee fallback, reduced efficiency)
- Cannot equip heavy armour, shields, or two-handed melee

#### Passives (Class-Specific Passive Nodes)
Starting passive bonuses at level 1:
- +15% projectile speed
- +10% movement speed
- Critical strike chance +5%

---

### 7.4 Shared Class Systems

The following systems apply to ALL classes identically:

- Attribute system (Strength, Dexterity, Intelligence)
- Skill tree / passive tree structure
- Item equip slots
- Levelling curve
- Crafting and gambling access
- Death and respawn

---

## 8. COMBAT SYSTEM

### 8.1 Core Combat Loop

```
Player input (LMB / skill key)
  → Direction resolved (toward mouse cursor)
  → Attack animation plays
  → Hit detection (at frame specified per animation)
  → Damage calculation
  → Hit feedback (particles, sound, enemy reaction, screen shake)
  → Loot / XP resolution (if enemy dies)
```

### 8.2 Damage Calculation

```
Final Damage = Base Damage 
             × Skill Multiplier 
             × (1 + Added Damage Flat) 
             × (1 + Increased Damage %) 
             × Critical Multiplier 
             - Enemy Mitigation
```

**Where:**
- `Base Damage` = weapon damage range (min–max, rolled per hit)
- `Skill Multiplier` = defined per skill (e.g., 1.5 for 150%)
- `Added Damage Flat` = sum of all "+X to Y Damage" affixes
- `Increased Damage %` = additive sum of all "% increased damage" affixes
- `Critical Multiplier` = 1.0 normally; (CritMultiplier) on crit (default: 1.5)
- `Enemy Mitigation` = armour or elemental resistance calculation

#### Enemy Mitigation Formula
```
Physical Reduction = Armour / (Armour + 5 × AttackerLevel × 10)
Elemental Resistance = flat % reduction (capped at 75%)
```

### 8.3 Damage Types

| Type | Resisted By | Colour Code |
|---|---|---|
| Physical | Armour | Grey |
| Fire | Fire Resistance | Orange-red |
| Cold | Cold Resistance | Ice blue |
| Lightning | Lightning Resistance | Yellow |
| Chaos | Chaos Resistance | Purple |
| Poison | Poison Resistance | Green |
| Void | Uncapped (special) | Dark violet |

> AI NOTE: All damage types share the same calculation pipeline. Add a `damageType` property to each hit event. Implement resistances as a % modifier applied before the armour step.

### 8.4 Critical Strikes

| Property | Default | Notes |
|---|---|---|
| Critical Strike Chance | 5% (base) | Increases via affixes and passives |
| Critical Strike Multiplier | 150% | Increases via affixes and passives |
| Critical Hit Visual | Large spark burst + red damage number | MUST be visually distinct |

### 8.5 Status Effects (Ailments)

| Ailment | Trigger | Effect | Duration |
|---|---|---|---|
| Ignite | Fire damage crit or proc | 15% of fire hit as burn/sec | 4 sec |
| Freeze | Cold damage (threshold) | Enemy cannot move or act | 1–3 sec |
| Shock | Lightning damage crit | Enemy takes +20% increased damage | 4 sec |
| Poison | Chaos/Poison damage | 10% of hit as damage/sec (stacks) | 5 sec per stack |
| Bleed | Physical crit | 8% of physical damage/sec | 5 sec |
| Curse | Skill-applied | Varies — debuffs, vulnerability, slow | Per skill |

> AI NOTE: Implement a status effect system as a component on each entity. Each ailment is a timed buff/debuff object with a tick function. Multiple stacks of the same ailment run independently.

### 8.6 Hit Reaction & Feedback

- **Stagger threshold:** Enemies have a stagger HP threshold. Hits above threshold cause brief stagger animation.
- **Knockback:** Optional per skill/affix. Pushes enemy in hit direction over 0.2 seconds.
- **Screen shake:** Triggered by: player taking damage (small), large explosions (medium), boss attacks (large). Magnitude defined per event. MUST be disableable in settings.
- **Damage numbers:** Floating text above hit position. Colours match damage type. Crits are larger font + exclamation. Player damage taken is red.
- **Hit flash:** Enemy sprite briefly flashes white (2 frames) on any hit.
- **Death FX:** Enemy plays death animation + death particle burst + loot spawns.

### 8.7 Enemy AI Behaviour

> AI NOTE: Keep AI simple but responsive. Complex AI is secondary to performance and quantity.

| State | Trigger | Behaviour |
|---|---|---|
| Idle | No player in range | Wanders slowly, plays idle animation |
| Alert | Player enters detection range | Moves toward player |
| Attack | Player within attack range | Executes attack pattern |
| Flee | HP below 15% (certain enemy types) | Runs from player |
| Dead | HP = 0 | Death animation, remove from world after 3 seconds |

**Detection Ranges (by enemy tier):**
- Small: 5 tile radius
- Medium: 7 tile radius
- Large/Elite: 9 tile radius
- Boss: Always alert while room active

---

## 9. CHARACTER PROGRESSION

### 9.1 Levelling

- **Max Level:** 100
- **Experience required** scales exponentially; see formula:
  ```
  XP_required(level) = 100 × level^2.2
  ```
- Each level grants:
  - +5 max Health
  - +2 max Class Resource
  - +1 Passive Point (for passive tree)
  - Every 5 levels: +1 Skill Point (to unlock new skills or upgrade existing)

### 9.2 Attributes

| Attribute | Effect per point |
|---|---|
| Strength | +2 max Health, +1 Physical Damage (melee), -1 Rage/Stamina cost per 10 pts |
| Dexterity | +1% Evasion, +0.5% Attack Speed, +0.5% Critical Strike Chance |
| Intelligence | +2 max Mana/Class Resource, +1 Elemental/Skill Damage, +1% Elemental Resistance per 5 pts |

Items have attribute requirements. If not met, item cannot be equipped.

### 9.3 Passive Skill Tree

Inspired by Path of Exile's passive tree. A large web of interconnected nodes.

**Node Types:**

| Type | Description | Example |
|---|---|---|
| Small Node | Minor bonus, connection filler | +10 HP, +5% damage |
| Notable | Larger bonus, named | "War Forged: +20% armour, +10% physical damage" |
| Keystone | Build-defining mechanic, major trade-off | "Juggernaut: Cannot be stunned. Take 10% more damage." |
| Class Start | Each class starts in different section of tree | Ironclad near Strength cluster; Ranger near Dexterity |

**Tree Layout:**
- Roughly 500–800 nodes total (scale based on implementation capacity)
- Organised into thematic clusters: Strength, Dexterity, Intelligence, hybrid areas
- Class-specific notable/keystone nodes in their class start region
- All classes share the same tree — class only determines starting position

**Allocation:**
- Each level grants 1 passive point
- Points allocate nodes on the tree (adjacent or connected to already-owned nodes)
- Refund: Orb of Regret (crafting currency) refunds 1 passive point

### 9.4 Active Skills

- Active skills are **socketed into items** (similar to PoE skill gems)
- Each active skill is a Skill Gem with its own level (1–20)
- Skill Gems level up via XP, or using Gemcutter's Prism (crafting currency)
- Skills can be linked with Support Gems that modify them (up to 5 links per socket group)
- Item sockets determine how many skills can be linked

#### Support Gem Examples

| Name | Effect |
|---|---|
| Added Fire Damage | Adds [X–Y] fire damage to supported skill |
| Faster Attacks | +20% attack speed to supported skill |
| Area of Effect | +25% AoE radius to supported skill |
| Life Leech | 1.5% of damage dealt returned as health |
| Chain | Projectile hits chain to nearest enemy (up to 2 times) |
| Pierce | Projectile passes through enemies |

---

## 10. ITEM SYSTEM

### 10.1 Item Rarities

| Rarity | Max Affixes | Colour | Drop Frequency |
|---|---|---|---|
| Normal (White) | 0 | #aaaaaa | Very common |
| Magic (Blue) | 2 (1 prefix, 1 suffix) | #6666ff | Common |
| Rare (Yellow) | 6 (3 prefix, 3 suffix) | #ffff44 | Uncommon |
| Unique (Orange) | Fixed affixes (unique per item) | #d47000 | Rare |
| Legendary (Red-Gold) | Fixed + 1 random variable | gradient #ff4400→#ff9900 | Very rare |
| Set Item (Green) | Set bonuses when equipped together | #44cc44 | Rare |

### 10.2 Item Slots

| Slot | Item Types |
|---|---|
| Helm | Helmets, Hoods, Circlets |
| Body Armour | Plate armour, Chest, Robes |
| Gloves | Gauntlets, Gloves, Bracers |
| Boots | Greaves, Boots, Sandals |
| Belt | Belts, Sashes |
| Ring (×2) | Rings |
| Amulet | Amulets, Pendants |
| Main Hand | Weapons (class-restricted) |
| Off Hand | Shield, Quiver, Focus, or second weapon |

### 10.3 Item Base Types

Each base type has:
- Implicit modifier (always present, not an affix)
- Armour/evasion/energy shield value range
- Attribute requirements
- Socket count (1–6 slots, more sockets = rarer base)

**Example Base Types:**

| Base | Type | Implicit | Armour Range | Req. |
|---|---|---|---|---|
| Iron Plate | Body (Armour) | +5 Armour | 80–120 | STR 25 |
| Leather Coat | Body (Evasion) | +4 Evasion | 50–80 | DEX 20 |
| Chain Mail | Body (Hybrid) | +3 Armour, +3 Evasion | 60–90 each | STR 15, DEX 15 |
| War Axe | Two-Hand Melee | +10% increased damage | 40–80 phys | STR 30 |
| Hunting Bow | Two-Hand Ranged | +15% projectile speed | 25–45 phys | DEX 25 |
| Tower Shield | Off-Hand | +8 Block chance | 100 Armour | STR 20 |

### 10.4 Affix System

Affixes are split into Prefixes (modify damage/health/resources) and Suffixes (modify speed/resistance/utility).

**Affix Tiers:** Each affix has 5 tiers (T1 = weakest, T5 = strongest). Higher tier affixes require higher item level to drop.

**Example Affixes:**

| Name | Type | Tier | Effect |
|---|---|---|---|
| Cruel | Prefix | T3 | Adds 15–25 physical damage |
| Tyrannical | Prefix | T5 | Adds 30–50 physical damage |
| Stalwart | Prefix | T2 | +80 to maximum Health |
| Durable | Suffix | T1 | +15% increased Armour |
| Resistant | Suffix | T3 | +20% Fire Resistance |
| Athlete's | Suffix | T2 | +12% increased Movement Speed |
| Deadly | Suffix | T4 | +25% Critical Strike Multiplier |
| Accurate | Suffix | T2 | +80 to Accuracy |

> AI NOTE: Store all affixes in `/data/affixes.json`. Each affix entry MUST include: id, name, type (prefix/suffix), tier, weight (drop probability), minValue, maxValue, effect (machine-readable), statKey, and conflicts (list of affix ids that cannot appear on same item).

### 10.5 Implicit Modifiers

Implicit modifiers are fixed to the base type and CANNOT be changed by crafting (except via specific currency items). They always appear above the affix divider in the tooltip.

### 10.6 Item Level

- Every item has an **item level (ilvl)** equal to the zone level it dropped in
- Higher ilvl = access to higher-tier affixes
- Crafting currencies can only add affixes up to the item's ilvl

### 10.7 Sockets & Links

- Items have 1–6 sockets
- Socket colours: Red (Strength), Blue (Intelligence), Green (Dexterity), White (any)
- Adjacent sockets may be **Linked** — linked sockets allow skill gems to interact (e.g., skill + support)
- Socket count and links are modified by crafting currencies (Jeweller's Orb, Fusing Orb)

### 10.8 Tooltip Layout

```
╔══════════════════════════════════════╗
║  [ITEM NAME] (rarity colour)         ║
║  [Base Type]                         ║
╠══════════════════════════════════════╣
║  Quality: +20%                       ║
║  Physical Damage: 80–120             ║
║  Critical Strike Chance: 5.5%        ║
║  Attack Speed: 1.4 attacks/sec       ║
╠══════════════════════════════════════╣
║  Implicit: +15% increased damage     ║
╠══════════════════════════════════════╣
║  Prefix: Adds 15–25 physical damage  ║
║  Prefix: +90 to maximum Health       ║
║  Suffix: +20% Fire Resistance        ║
║  Suffix: +12% Movement Speed         ║
╠══════════════════════════════════════╣
║  Requirements: STR 30, DEX 15        ║
║  Item Level: 42                      ║
║  Sockets: [R]-[G]-[B] (3-link)       ║
╠══════════════════════════════════════╣
║  [Flavour text in italic]            ║
╚══════════════════════════════════════╝
```

---

## 11. CRAFTING SYSTEM

> AI NOTE: This system is modelled closely on Path of Exile's currency-based crafting with Hero Siege influences. Each currency item is a consumable that permanently modifies an item. Implement crafting as: player right-clicks currency in inventory → targets item → apply effect → show result. NEVER allow undoing a crafting action without the appropriate orb.

### 11.1 Currency Items

Currency items are the crafting resources. They also serve as the player-to-player trade currency (if multiplayer is added later). They drop from enemies, chests, and vendor recipes.

| Currency Item | Icon Colour | Effect on Target Item |
|---|---|---|
| Scroll of Identification | Cream | Identifies an unidentified item (reveals hidden affixes) |
| Orb of Transmutation | Blue-white | Upgrades a Normal item to Magic (adds 1–2 affixes) |
| Orb of Alteration | Blue | Rerolls all affixes on a Magic item (new random affixes) |
| Orb of Augmentation | Light blue | Adds one affix to a Magic item with only 1 affix |
| Regal Orb | Gold | Upgrades a Magic item to Rare (adds 1 more affix) |
| Orb of Alchemy | Brown-gold | Upgrades a Normal item to Rare (adds 4–6 random affixes) |
| Chaos Orb | Chaos purple | Rerolls all affixes on a Rare item (new random affixes) |
| Exalted Orb | Gold-orange | Adds one random affix to a Rare item (if it has < 6 affixes) |
| Orb of Annulment | White-silver | Removes one random affix from a Magic or Rare item |
| Blessed Orb | Pale green | Rerolls the values of all implicit modifiers on an item |
| Divine Orb | Gold | Rerolls the numeric values of all explicit affixes (within their tier range) |
| Orb of Scouring | Grey | Removes all explicit affixes from a Magic or Rare item (returns to Normal) |
| Vaal Orb | Corrupted red | Corrupts an item — applies one of 4 random effects; item CANNOT be modified further |
| Mirror of Kalandra | Mirror silver | Creates an exact duplicate of any non-Unique, non-Corrupted item (extremely rare) |
| Orb of Regret | Green | Refunds one passive skill tree point |
| Jeweller's Orb | Facet rainbow | Rerolls the number of sockets on an item (1–6, weighted by item type) |
| Chromatic Orb | Colour-spectrum | Rerolls the colours of all sockets on an item |
| Orb of Fusing | Chain-link | Rerolls the links between sockets on an item |
| Gemcutter's Prism | Crystal | Raises a Skill Gem's quality by +1% (max 20%) |

### 11.2 Vaal Orb Corruption Effects

When a Vaal Orb is used, roll 1d4 and apply one of:

1. **Implicit Corruption:** Add a powerful corrupted implicit modifier (special pool, not obtainable otherwise)
2. **Affix Reroll:** Reroll all affixes as if a Chaos Orb was used
3. **Socket/Link Alteration:** Change socket count OR links randomly
4. **No Effect (Bricked):** Item is corrupted but nothing changes (the "safe" bad outcome)

Corrupted items show a red "Corrupted" tag in the tooltip and cannot be modified by any other currency.

### 11.3 Crafting Bench

An NPC workbench (found in town or hideout) that allows **deterministic crafting** — the player spends currency to guarantee a specific affix, rather than random:

- Bench crafts fill an open prefix or suffix slot on an item
- Each bench craft recipe has a currency cost
- Only ONE bench-crafted modifier can be on an item at a time
- Bench affixes are labelled "Crafted" in the tooltip

**Example Bench Recipes:**

| Recipe Name | Cost | Effect |
|---|---|---|
| "Can have up to 1 Crafted Modifier" | — | Implicit, always available |
| Added Cold Damage | 2× Orb of Alteration | Adds 8–12 cold damage as suffix |
| Increased Critical Chance | 4× Orb of Alteration | +12% crit chance as suffix |
| Resistance Crafting | 1× Chaos Orb | +25–30% to a chosen resistance |
| Life Prefix (moderate) | 3× Orb of Alteration | +40 max health |

### 11.4 Vendor Recipes

Selling specific combinations of items to a vendor produces a currency reward. Implemented as a rule-based check at the vendor transaction:

| Recipe | Result |
|---|---|
| Any identified item | Scroll Fragment (5 = 1 Scroll of ID) |
| 3× same Unique item | Orb of Fusing |
| Full armour set (all slots, Normal) | Orb of Transmutation |
| Full armour set (all slots, Magic) | Orb of Alteration |
| Full armour set (all slots, Rare) | Chaos Orb (if item level 60+) |
| Skill Gem + Orb of Alteration | Gem of that gem's colour |
| Weapon + Whetstone (×3) | Same weapon +5% quality |

### 11.5 Crafting UX Flow

```
1. Player opens Inventory
2. Player selects a Currency item (right-click → "Use")
3. Cursor enters "crafting mode" — highlights valid target items
4. Player clicks target item
5. Confirmation prompt if item is Rare or above: "Apply [Currency] to [Item]? This cannot be undone."
6. Animation plays on item (brief glow)
7. Item tooltip refreshes with new affixes
8. Currency item consumed (stack -1)
```

---

## 12. GAMBLING SYSTEM

> AI NOTE: The gambling system is intentionally designed to create excitement and risk. Modelled on PoE's "Heist" and "Ritual" gambling, plus Hero Siege's gold gambling. This MUST feel exciting — use appropriate animations and sound.

### 12.1 The Gambler NPC

An NPC present in every town hub, with flavour as a shady merchant or mysterious trader.

**Flavour:** *"I don't guarantee the outcome. I guarantee the thrill."*

### 12.2 Gambling Mechanic

1. Player opens Gambler NPC interface
2. A list of item categories is shown (Weapons, Armour, Accessories, etc.)
3. Each category shows a **gold cost** to gamble one item
4. Player pays the cost and clicks "Gamble"
5. An animation plays (spinning, glowing, suspenseful)
6. A random item is generated and revealed
7. Item's rarity is weighted with modified (gambling-favourable) drop rates

### 12.3 Gambling Rarity Weights

Normal gambling has DIFFERENT rarity weights than standard drops — biased toward Magic/Rare:

| Rarity | Standard Drop Weight | Gambling Weight |
|---|---|---|
| Normal | 60% | 10% |
| Magic | 30% | 50% |
| Rare | 9% | 35% |
| Unique | 1% | 4% |
| Legendary | 0.1% | 1% |

### 12.4 Gambling Costs (by item tier)

| Item Category | Base Cost (Gold) |
|---|---|
| Accessories (Ring, Amulet, Belt) | 250 |
| Gloves / Boots | 400 |
| Helm | 500 |
| Body Armour | 700 |
| One-Hand Weapon | 500 |
| Two-Hand Weapon | 750 |

Costs scale with player level: `Cost × (1 + player_level × 0.05)` to prevent early-game gold saturation.

### 12.5 Unidentified Gamble (Advanced Mode)

Unlocked after Act 1 completion:
- Items are received **unidentified** — player does not see affixes until they use a Scroll of Identification
- Cost is **30% lower** than standard gambling
- Creates additional tension: the item could be incredible or worthless
- Recommended audio: tension music sting, dramatic reveal on identification

### 12.6 "High Roller" Mode

Unlocked at player level 50:
- 10× the gold cost
- Guaranteed Rare or above
- 25% chance of Unique or Legendary
- Special animation (golden explosion, dramatic sound)
- Cooldown: once per 10 minutes (prevent exploit)

### 12.7 Jackpot Events

Every 25 gambles (tracked per session), a "Hot Streak" event triggers:
- Next gamble costs 50% gold
- Rarity weights doubled toward Unique/Legendary
- Flashing visual indicator on NPC to show Hot Streak is active

---

## 13. WORLD & LEVEL DESIGN

### 13.1 World Structure

The world is divided into **Acts** (main story progression) and **Endgame Zones** (repeatable, scaling content).

| Act | Biome | Theme |
|---|---|---|
| Act 1 | Ashvale — Ruined Village & Dark Forest | Tutorial, basic enemies, introduce core systems |
| Act 2 | The Hollowed Mines | Underground, traps, new enemy types |
| Act 3 | The Blighted Citadel | Gothic castle, elite enemies, act boss |
| Act 4 | The Ashen Wastes | Hellfire, endgame transition, final boss |
| Endgame | The Shattered Realm | Procedural, scaling difficulty, infinite |

> AI NOTE: Implement Act 1 first with 3 zones. Design all systems to be zone-agnostic.

### 13.2 Zone Structure

Each zone consists of:

- **Zone Level:** Determines enemy level and item level of drops
- **Tile Theme:** Which tileset to use for walls, floors, decorations
- **Enemy Roster:** Which enemy types spawn (weighted pool)
- **Points of Interest (POI):** Boss rooms, merchant rooms, rare chests, shrines
- **Density:** Average enemies per screen (low / medium / high / extreme)
- **Objective:** Kill boss to unlock exit, OR simply reach exit, OR clear % of enemies

**Zone Layout Types:**

| Type | Description |
|---|---|
| Linear | Corridor-style path from entrance to exit |
| Branching | Several paths, some are dead-ends with loot |
| Open | Large open area with scattered enemies and POIs |
| Dungeon | Room-by-room with doors (each room is a combat encounter) |
| Boss Antechamber | Linear lead-up into a sealed boss arena |

### 13.3 Procedural Generation

> AI NOTE: Use a hybrid approach — hand-crafted room templates + procedural assembly. This reduces artist workload while maintaining visual coherence.

**Algorithm:**
1. Select zone type and size (small / medium / large)
2. Place entrance tile and exit tile (minimum distance apart)
3. Generate path from entrance to exit using BSP (Binary Space Partitioning) or simple random walk
4. Fill remaining area with room templates (pre-designed tile layouts, rotatable)
5. Scatter enemies using density settings and enemy roster
6. Place POIs (guaranteed: 1 boss room, 0–2 shrines, 0–3 chests)
7. Apply ambient decorations (barrels, bones, corpses, loot piles — non-interactive)

**Room Templates:**
- Minimum: 20 different templates per biome
- Templates are stored as tile arrays or Tiled map files
- Each template tagged with: biome, size, type (combat/treasure/boss/corridor)

### 13.4 Town Hub

Each act begins with a Town hub zone:
- No enemy spawns
- Contains NPCs: Merchant, Gambler, Crafting Bench, Waypoint, Quest Giver
- Acts as a respawn point
- Shows Act progress and current objective

### 13.5 Shrines

Interactable objects in zones that grant a temporary buff for 60 seconds:

| Shrine | Effect |
|---|---|
| Shrine of Fury | +30% attack speed |
| Shrine of Power | +40% damage |
| Shrine of Endurance | +50% max health (temporary) |
| Shrine of Speed | +40% move speed |
| Shrine of Fortune | +100% item quantity for duration |

### 13.6 Waypoint System

- Waypoints are discovered by walking near them
- Once discovered, player can teleport between any known waypoints from any waypoint
- Waypoints persist across sessions (saved)

---

## 14. ENEMY SYSTEM

### 14.1 Enemy Tiers

| Tier | HP Multiplier | XP Multiplier | Loot | Notes |
|---|---|---|---|---|
| Normal | ×1 | ×1 | Basic | Standard enemies |
| Magic (Blue) | ×3 | ×3 | Better | 1–2 random modifiers |
| Rare (Yellow) | ×8 | ×6 | Good | 3–4 random modifiers + aura |
| Unique (Boss) | ×40 | ×15 | Excellent | Scripted abilities, phase transitions |

### 14.2 Enemy Modifiers (Magic/Rare)

Randomly applied to Magic/Rare enemies:

| Modifier | Effect |
|---|---|
| Enraged | +50% damage, +30% move speed |
| Armoured | +100% physical damage reduction |
| Vampiric | Heals 3% max HP per second |
| Volatile | Explodes on death for 20% max HP area damage |
| Sentinel | Nearby allies gain +20% damage and speed |
| Teleporter | Teleports to player every 5 seconds |
| Necromancer | Raises fallen enemies as minions (max 3) |
| Berserker | Gains damage the lower HP it is |
| Frozen Aura | Slows all nearby players by 30% |

### 14.3 Enemy Roster — Act 1 Enemies

| Name | Tier | Type | Attack | HP | Notes |
|---|---|---|---|---|---|
| Hollow Husk | Normal | Melee | Claw swipe | 40 | Slow, basic; walks toward player |
| Scabrous Rat | Normal | Melee | Bite | 20 | Fast, small, swarm in groups |
| Grave Archer | Normal | Ranged | Arrow shot | 30 | Keeps distance, kites player |
| Cultist Zealot | Normal | Melee | Dagger slash | 50 | Faster, can dodge sideways |
| Tomb Stalker | Magic | Melee | 2-hit combo | 120 | Always spawns Magic tier |
| Bone Golem | Rare | Melee | Shockwave slam | 350 | Spawns as Rare, random mods |
| The Undying Patriarch | Boss | Mixed | Multiple phases | 1800 | Act 1 boss — see Boss section |

### 14.4 Loot Tables

Each enemy has a loot table defining:
- Gold drop (min–max range)
- Item drop chance
- Item type weights (what base types drop)
- Special drop (rare: a specific unique only this enemy can drop)

```json
{
  "enemy_id": "hollow_husk",
  "gold_drop": { "min": 5, "max": 15 },
  "item_drop_chance": 0.20,
  "item_type_weights": {
    "weapon": 0.2,
    "armour": 0.5,
    "accessory": 0.2,
    "currency": 0.1
  },
  "special_drop": {
    "item_id": "husks_hollow_heart",
    "chance": 0.005
  }
}
```

---

## 15. BOSS DESIGN

### 15.1 Boss Requirements

Every boss MUST have:
- A dedicated arena (sealed room — no exit until boss dies or player dies)
- A health bar displayed prominently at the bottom of the screen
- Unique name displayed above health bar
- Phase transitions at defined HP thresholds
- A set of 3+ unique telegraphed attack patterns
- At least 1 attack that REQUIRES player to dodge (room-level AoE)
- Scripted death animation (unique, not generic)
- Boss-specific guaranteed loot table (at least 1 Rare item + gold)
- Boss kill recorded in save data (prevents re-farming for story purposes, but endgame allows repeat)

### 15.2 Boss: The Undying Patriarch (Act 1 Boss)

**Lore:** A once-revered elder, now twisted by the Ashen Plague. He commands the hollow dead and has become something between man and tomb.

**HP:** 1800 (scales with player level)  
**Arena:** Crumbling crypt, 10×10 tile open floor, pillars in corners  

**Phase 1 (100–60% HP):**
- Melee sweep: 3-hit combo toward player, telegraphed with wind-up glow
- Summon Husks: Calls 3 Hollow Husks from ground (animation: hands reach up first)
- Stomp: Slams ground, shockwave travels in 4 cardinal directions (player must dodge)

**Phase 2 (60–30% HP):**
- Rage activates: glowing red eyes, +30% speed, +20% damage
- Plague Nova: Circular AoE expanding from boss — run to outer edge
- Bone Rain: Random tiles highlighted (0.5 sec warning), bones crash down on them
- Previous moves: Faster versions

**Phase 3 (30–0% HP):**
- Desperate Hour: Heals 200 HP once (one time only), screams
- Grave Burst: Projectiles in 8 directions + 8 diagonals simultaneously
- Full Collapse: At 10% HP, collapses to floor for 3 seconds — giant explosion on rise
- Victory: Death animation — crumbles, black smoke, guaranteed loot explosion

---

## 16. HUD & USER INTERFACE

> AI NOTE: HUD is CRITICAL to player feel. Implement it early with placeholder values. All HUD elements should be positioned relative to screen edges (not fixed pixels) to support different resolutions.

### 16.1 HUD Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Mini Map]                                [Zone Name]    │
│ [top-right corner]                        [top-center]   │
│                                                          │
│                  [GAME WORLD]                            │
│                                                          │
│                                                          │
│ [Health Globe]  [Skill Bar]  [Resource Globe]            │
│ [bottom-left]   [bottom-center] [bottom-right]           │
│                 [EXP Bar]                                │
└─────────────────────────────────────────────────────────┘
```

### 16.2 Health & Resource Orbs (Globes)

Modelled on Diablo/PoE style — large circular globes, fluid fill animation.

- **Health Globe (left):** Deep red fill. Shows current/max HP on hover or always.
- **Resource Globe (right):** Colour matches class resource (orange for Rage, teal for Stamina).
- Globe liquid animates — slight wave/slosh effect.
- Damage received: globe briefly flashes white, then drains.
- Below 25% health: Globe pulses red. Low health audio warning triggers.

### 16.3 Skill Bar

Centred at bottom of screen, directly above Experience Bar.

```
[ Q ]  [ E ]  [ R ]  [ F ]  [LMB]
```

- Each slot shows the skill icon (48×48 px)
- Key binding shown in small text at corner
- Cooldown overlay: dark overlay drains clockwise (pie timer)
- Resource cost shown as small number
- Insufficient resource: slot dims, key binding shown in red

### 16.4 Experience Bar

Thin bar spanning the full bottom of the screen, below skill bar.
- Colour: deep blue to cyan gradient
- Fills left to right
- Level up: full flash, number increments, levelling jingle
- Tooltip on hover: "Level X — [XP current] / [XP needed]"

### 16.5 Minimap

Top-right corner, circular mask, semi-transparent.
- Shows explored tiles only (fog of war on unexplored)
- Player: white dot in center
- Enemies: small red dots
- NPCs: small yellow dots
- Waypoints: small blue star
- Exit: small green arrow
- Boss: pulsing orange dot
- Toggle expand with M key (fills more of screen)

### 16.6 Potion Belt

Small icons to the left of the health globe:
- Health Potion (key: 1): Red flask icon
- Mana/Resource Potion (key: 2): Blue/coloured flask icon
- Each shows stack count
- Cooldown of 5 seconds per type (shared)
- Brief animation on use (bubble effect)
- Auto-pick-up if inventory has space

### 16.7 Inventory Screen (I or Tab)

Grid-based inventory:
- **Grid size:** 12 columns × 8 rows = 96 cells
- Items occupy 1×1 (ring, amulet) to 2×4 (two-hand weapon) cells
- Drag-and-drop to move; right-click for context menu (Equip, Use, Discard, Split Stack)
- Equipped items shown in character silhouette panel on left
- Compare tooltip: hover item in inventory shows tooltip AND tooltip of currently equipped item in same slot
- Stash tab: secondary storage area, accessible in Town only

### 16.8 Character Sheet (C)

Shows all player stats in a structured panel:

```
[Class Name] — Level X
─────────────────────
Attributes
  Strength:      XX
  Dexterity:     XX
  Intelligence:  XX
─────────────────────
Offence
  DPS:           XXXX
  Attack Speed:  X.X/sec
  Crit Chance:   XX%
  Crit Multiplier: XXX%
  Damage Range:  XX–XX
─────────────────────
Defence
  Health:        XXX/XXX
  Regen:         X.X/sec
  Armour:        XXX
  Evasion:       XXX
  Resistances:   F:XX% C:XX% L:XX%
─────────────────────
Other
  Move Speed:    XXX
  Item Quantity: +XX%
  Item Rarity:   +XX%
```

### 16.9 Passive Tree Screen (P or K)

Full-screen overlay showing the passive node web:
- Pan with middle mouse drag or arrow keys
- Zoom in/out with scroll wheel
- Hover node: tooltip shows effect and stat values
- Click unallocated adjacent node: allocate if points available
- Right-click allocated node: refund option (costs Orb of Regret)
- Available points shown in top corner
- Search bar: highlights nodes containing searched keyword

### 16.10 Damage Numbers

Floating numbers above hit positions:
- Physical: white/grey
- Fire: orange
- Cold: light blue
- Lightning: yellow
- Chaos/Poison: green
- Void: purple
- Critical: larger font, bold, exclamation mark, colour of damage type
- Player damage received: red, appears to the left of player
- Healing: green with "+" prefix

### 16.11 Item Drop Labels

Items on the ground show a text label:
- Colour matches item rarity
- Unique/Legendary items: glowing, animated text
- Currency: always show label regardless of settings
- Toggle ground labels: Alt key (hold)
- Filter labels by rarity in settings

### 16.12 Tooltip System Requirements

- Tooltips appear on hover (150ms delay)
- Compare tooltip appears automatically for equipment slots
- Stat differences highlighted: green = improvement, red = downgrade
- Tooltips do NOT obscure the game world centre area
- Tooltips appear to the left of cursor if near right edge; above if near bottom edge

---

## 17. AUDIO DESIGN

### 17.1 Music

| Zone/State | Music Style | Notes |
|---|---|---|
| Main Menu | Ambient dark orchestral | Slow, foreboding |
| Town Hub | Subdued, melancholic ambient | Quiet, lets players think |
| Act 1 Combat | Aggressive dark orchestral + drums | Medium tempo |
| Boss Fight | High intensity, driving percussion | Distinct theme per boss |
| Boss Death | Triumphant swell, then return to zone music | 8–12 second sting |
| Crafting | Ambient forge-like, subtle | Background only |
| Level Up | Short triumphant fanfare (3–4 seconds) | One-shot, then resume |
| Unique Drop | Short distinct jingle | Unmistakable |

> AI NOTE: Use royalty-free assets or placeholder tracks in development. Music MUST be loopable with seamless loop points. Implement a crossfade system (1-second fade) between music states.

### 17.2 Sound Effects — Combat

| Event | Sound Description |
|---|---|
| Melee swing | Whoosh + impact (varies by weapon type) |
| Arrow fire | Bow draw + twang + arrow fly |
| Arrow impact | Thud on hit, clank on armour |
| Spell cast | Element-specific (crackle, whoosh, boom) |
| Critical hit | Higher pitched impact + brief metallic ring |
| Player hit | Grunt + impact (varies by damage type) |
| Player low health | Heartbeat pulse (loop) |
| Enemy death | Varied per enemy type (scream, shatter, explosion) |
| Status effect | Ignite: crackle. Freeze: shatter. Shock: electric buzz. Poison: wet squelch. |

### 17.3 Sound Effects — UI & World

| Event | Sound |
|---|---|
| Item drop | Metallic clink (lighter for lower rarity, heavier for higher) |
| Item pick-up | Same clink with soft UI chime |
| Currency pick-up | Coin clink + sparkle |
| Unique/Legendary drop | Distinct magical shimmer — MUST be audible and recognisable |
| Inventory open/close | Leather flap or UI whoosh |
| Equip item | Equip sound appropriate to item type |
| Level up | Bell + chime flourish |
| Skill activate | Per-skill sound (see skill descriptions) |
| Shrine activate | Mystical hum + power surge |
| Waypoint activate | Portal-like whoosh |
| Chest open | Wood creak + metal latch |
| NPC dialogue | Short voice cue (grunt/acknowledgement, no full voice acting needed) |

### 17.4 Audio Settings

- Master volume
- Music volume (separate)
- SFX volume (separate)
- Mute toggle
- Screen shake toggle (disable option)

---

## 18. SAVE & PERSISTENCE

### 18.1 Save Data Structure

```json
{
  "version": "1.0",
  "character": {
    "name": "Player",
    "class": "ironclad",
    "level": 15,
    "experience": 12450,
    "attributes": { "strength": 35, "dexterity": 10, "intelligence": 6 },
    "passivePoints": 2,
    "allocatedPassives": [101, 102, 115, 200],
    "skills": [
      { "slot": "Q", "gemId": "seismic_slam", "gemLevel": 5, "supports": ["faster_attacks"] }
    ],
    "stats": {
      "currentHealth": 340,
      "maxHealth": 340,
      "currentResource": 60,
      "maxResource": 100
    }
  },
  "inventory": {
    "equipped": { "helm": null, "body": "item_id_003", ... },
    "bag": [ { "itemId": "item_id_001", "slot": [0, 0] }, ... ],
    "stash": [ ... ]
  },
  "currency": {
    "gold": 4500,
    "chaos_orb": 3,
    "orb_of_alteration": 12,
    ...
  },
  "progress": {
    "currentAct": 1,
    "currentZone": "ashvale_forest",
    "waypointsUnlocked": ["ashvale_town", "ashvale_outskirts"],
    "bossesKilled": ["undying_patriarch"],
    "questsComplete": ["quest_001", "quest_002"]
  },
  "settings": {
    "screenShake": true,
    "masterVolume": 0.8,
    "musicVolume": 0.6,
    "sfxVolume": 1.0,
    "keyBindings": { "skill_q": "KeyQ", ... }
  },
  "statistics": {
    "totalPlaytime": 14520,
    "totalKills": 2340,
    "totalGoldEarned": 98000,
    "totalGambles": 45,
    "legendaryDrops": 1
  }
}
```

### 18.2 Auto-Save Rules

- Auto-save on: zone transition, town entry, level up, boss kill, NPC interaction end
- Do NOT auto-save mid-combat
- Single save slot initially; multi-slot in future update
- Save is written to localStorage (browser) or JSON file (desktop)

### 18.3 Death & Respawn

- **Default mode (Softcore):** Death sends player to town with 0 experience penalty
- **Hardcore mode (Optional):** Death = permanent (save file marked as dead, read-only memorial)
- Items are KEPT on death in Softcore mode
- Lost XP: None in Softcore (to avoid frustration)

---

## 19. CONTENT ROADMAP

### Phase 1 — Core Foundation (Implement First)
- [ ] Isometric rendering and tilemap system
- [ ] Player controller (WASD + mouse aim)
- [ ] Two classes: Ironclad and Ranger
- [ ] Basic melee and ranged combat
- [ ] Health and Resource globes
- [ ] Hit feedback system (particles, numbers, screen shake)
- [ ] Basic enemy AI (3 enemy types)
- [ ] Item generation (Normal, Magic, Rare)
- [ ] Inventory system
- [ ] JSON-driven data pipeline

### Phase 2 — Systems
- [ ] Full affix system (all affixes defined in JSON)
- [ ] Full HUD (skill bar, minimap, XP bar)
- [ ] Crafting currency system (all orbs)
- [ ] Gambling NPC
- [ ] Passive skill tree
- [ ] Skill gem and support gem system
- [ ] Save and load system
- [ ] Levelling and stat scaling
- [ ] Status effects

### Phase 3 — World
- [ ] Act 1 (3 zones) with procedural generation
- [ ] Town hub with all NPCs
- [ ] Act 1 boss
- [ ] Shrine system
- [ ] Waypoint system
- [ ] Sound and music integration
- [ ] Crafting bench

### Phase 4 — Polish & Depth
- [ ] Act 2 and 3
- [ ] Additional enemy types per biome
- [ ] Unique item pool (20+ uniques)
- [ ] Vendor recipes
- [ ] Minimap improvements
- [ ] Settings screen with rebindable controls
- [ ] Endgame zone scaffold
- [ ] Additional classes (locked, UI visible)

### Phase 5 — Future Scope
- [ ] Multiplayer (up to 4 players, co-op)
- [ ] Additional classes (Hexblade, Pyromancer, Shadowstep, Warden)
- [ ] Endgame mapping system
- [ ] Leaderboards
- [ ] Seasonal events

---

## 20. APPENDICES

### Appendix A — RNG Guidelines

All random number generation MUST use a seeded, reproducible RNG system. This allows bug reproduction and potential seeded-run features.

- Use Mersenne Twister or similar quality PRNG (not `Math.random()` directly)
- Seed from current timestamp at session start; store seed in save
- Each major system (loot, crafting, gambling, map gen) uses its own RNG stream

### Appendix B — Performance Guidelines

- Object pool ALL frequently spawned/destroyed entities (projectiles, particles, damage numbers)
- Limit active particles on screen: max 200 total at once
- Sprite batching for tiles: render tilemap as static batched texture per chunk
- Only update enemy AI if within camera range + 2 tile buffer
- Item labels: only render if within camera view
- Aim for <5ms per frame in game logic (excluding render)

### Appendix C — Accessibility Considerations

- Colourblind mode: all damage type colours available in alternative palette
- Screen shake: disable in settings
- Damage number size: adjustable (small / medium / large)
- Font size: HUD text adjustable
- High contrast mode for UI elements
- All timed mechanics (shrines, skill cooldowns) have both visual AND audio indicators

### Appendix D — Terminology Reference

| Term | Definition |
|---|---|
| ilvl | Item Level — max tier of affixes that can appear on an item |
| affix | A modifier on an item (prefix or suffix) |
| implicit | A fixed modifier inherent to the item base type |
| corruption | Vaal Orb effect; locks item from further modification |
| socket | A hole in an item where a Skill Gem can be placed |
| link | A connection between adjacent sockets allowing gem interaction |
| ARPG | Action Role-Playing Game |
| POI | Point of Interest — notable location in a zone |
| BSP | Binary Space Partitioning — a procedural generation algorithm |
| DoT | Damage over Time (Bleed, Poison, Ignite) |
| AoE | Area of Effect |
| kiting | Moving away from an enemy while dealing damage |

### Appendix E — Affix Conflict Rules

Certain affixes cannot appear on the same item simultaneously. Store conflicts in `affixes.json` as an array per affix:

```json
{
  "id": "life_prefix_t3",
  "conflicts": ["life_prefix_t1", "life_prefix_t2", "life_prefix_t4", "life_prefix_t5"]
}
```

General rules:
- No two affixes of the same stat category (e.g., two life prefixes)
- "Crafted" bench affix conflicts with any existing affix in its category
- Corrupted implicit pool has no conflicts (it ignores normal affix rules)

### Appendix F — Zone Config Schema

```json
{
  "zone_id": "ashvale_forest",
  "display_name": "Ashvale Dark Forest",
  "act": 1,
  "zone_level": 5,
  "tileset": "forest_dark",
  "layout_type": "branching",
  "size": "medium",
  "enemy_roster": [
    { "enemy_id": "hollow_husk", "weight": 40 },
    { "enemy_id": "scabrous_rat", "weight": 35 },
    { "enemy_id": "grave_archer", "weight": 25 }
  ],
  "rare_enemy_chance": 0.02,
  "magic_enemy_chance": 0.12,
  "density": "medium",
  "pois": {
    "boss": false,
    "shrines": { "min": 0, "max": 2 },
    "chests": { "min": 1, "max": 3 }
  },
  "ambient_colour": "#1a2a1a",
  "music_track": "forest_dark_ambient",
  "connections": ["ashvale_town", "ashvale_ruins"]
}
```

---

## 21. LOGGING ARCHITECTURE

> AI NOTE: Logging is non-negotiable for this project. Every system MUST use the Logger. Do NOT use raw `console.log` anywhere in game code — always go through the Logger class. This keeps output filterable, formatted, and consistent.

### 21.1 Logger Class Specification

Implement a singleton `Logger` class available globally. It MUST support:

- Named system tags (e.g. `[COMBAT]`, `[LOOT]`, `[CRAFTING]`)
- Log levels with runtime filtering
- Structured data output alongside messages
- A rolling in-memory log buffer (last 500 entries) for the debug overlay
- Timestamps on every entry

```typescript
// Logger interface contract
interface ILogger {
  verbose(system: string, message: string, data?: object): void;
  debug(system: string, message: string, data?: object): void;
  info(system: string, message: string, data?: object): void;
  warn(system: string, message: string, data?: object): void;
  error(system: string, message: string, data?: object): void;
  fatal(system: string, message: string, data?: object): void;
  setLevel(level: LogLevel): void;
  filter(system: string, enabled: boolean): void;
  getBuffer(): LogEntry[];
  clear(): void;
}

enum LogLevel {
  VERBOSE = 0,
  DEBUG   = 1,
  INFO    = 2,
  WARN    = 3,
  ERROR   = 4,
  FATAL   = 5,
  OFF     = 6,
}

interface LogEntry {
  timestamp: number;  // performance.now()
  level: LogLevel;
  system: string;
  message: string;
  data?: object;
}
```

### 21.2 Log Output Format

Every log line MUST follow this format exactly, so grep and filtering work consistently:

```
[HH:MM:SS.mmm] [LEVEL ] [SYSTEM      ] Message — {json data if present}
```

**Examples:**
```
[00:14:32.441] [INFO  ] [COMBAT      ] Hit resolved — {"attacker":"player","target":"hollow_husk_3","damage":47,"type":"physical","crit":false}
[00:14:32.443] [DEBUG ] [LOOT        ] Drop roll — {"enemyId":"hollow_husk_3","roll":0.847,"threshold":0.2,"result":"no_drop"}
[00:14:35.001] [INFO  ] [CRAFTING    ] Orb applied — {"currency":"chaos_orb","itemId":"item_0042","previousAffixes":["cruel","stalwart"],"newAffixes":["deadly","resistant","athlete"]}
[00:14:40.210] [WARN  ] [SAVE        ] Auto-save skipped — {"reason":"combat_active"}
[00:14:55.900] [ERROR ] [AFFIX       ] Affix id not found in registry — {"affixId":"life_prefix_t6","itemId":"item_0099"}
```

### 21.3 Log Levels — When to Use Each

| Level | Usage |
|---|---|
| VERBOSE | Fine-grained trace — AI loops, per-frame checks, pathfinding steps. Off by default in dev. |
| DEBUG | System state changes, rolls, decisions. On by default in dev. Off in production. |
| INFO | Meaningful game events — hits, drops, level ups, zone transitions. Always on. |
| WARN | Something unexpected but recoverable — missing optional data, fallback used. Always on. |
| ERROR | System failure, missing required data, invalid state. Always on. |
| FATAL | Unrecoverable error — crash imminent, data corruption detected. Always on. |

### 21.4 Per-System Logging Contract

Every system MUST log the following minimum events. These are mandatory — not optional.

#### Combat System
```
INFO  — Every hit resolved (attacker, target, damage, type, crit, ailment applied if any)
INFO  — Enemy killed (enemyId, killerId, zone, playerLevel)
DEBUG — Damage calculation steps (base, multipliers, mitigation, final)
DEBUG — Status effect applied / expired (effect, target, duration)
WARN  — Attack landed on already-dead entity (should not happen)
ERROR — Damage type not found in resistance table
```

#### Loot System
```
INFO  — Item generated (itemId, rarity, baseType, affixes, ilvl, zone)
INFO  — Item picked up by player (itemId, slot)
INFO  — Currency item dropped (currencyId, zone, enemyId)
DEBUG — Drop roll result for every enemy death (roll, threshold, outcome)
DEBUG — Affix selection rolls during item generation
WARN  — Item generated with fewer affixes than expected (affix pool may be too small for ilvl)
ERROR — Item base type not found in registry
```

#### Crafting System
```
INFO  — Currency used on item (currencyId, itemId, before state, after state)
INFO  — Vaal corruption applied (itemId, roll index 1–4, outcome)
INFO  — Crafting bench recipe applied (recipeId, itemId, cost, result affix)
DEBUG — Affix conflict check result during crafting
WARN  — Attempted to craft on a corrupted item (blocked, log the attempt)
WARN  — Attempted to add affix to full item (blocked)
ERROR — Currency item consumed but item state unchanged (transaction error)
```

#### Gambling System
```
INFO  — Gamble initiated (category, cost, playerGold before)
INFO  — Gamble result (itemId, rarity, baseType)
INFO  — Hot Streak triggered (gambleCount, bonusActive)
INFO  — High Roller used (cost, result rarity)
DEBUG — Rarity roll (roll value, thresholds, result)
WARN  — Player attempted gamble with insufficient gold (blocked)
```

#### Progression System
```
INFO  — Level up (oldLevel, newLevel, xpTotal, passivePointsAvailable)
INFO  — Passive node allocated (nodeId, nodeName, remainingPoints)
INFO  — Passive node refunded (nodeId, orbsConsumed)
INFO  — Skill gem levelled up (gemId, newLevel, gemXP)
DEBUG — XP gained (amount, source, totalXP, nextLevelThreshold)
WARN  — Passive point allocation failed (reason: disconnected node, insufficient points)
ERROR — Passive node ID not found in tree definition
```

#### World / Zone System
```
INFO  — Zone loaded (zoneId, seed, enemyCount, poiList)
INFO  — Zone exited (zoneId, timeSpent, killCount)
INFO  — Waypoint discovered (waypointId, zoneId)
INFO  — Boss room entered (bossId, zoneId)
DEBUG — Procedural generation steps (layout type, room placements, enemy placements)
WARN  — Zone generation produced fewer rooms than minimum (fallback used)
ERROR — Zone config not found for zoneId
```

#### Enemy AI System
```
DEBUG — AI state transition (enemyId, fromState, toState, trigger)
DEBUG — Pathfinding result (enemyId, targetTile, pathLength, success)
VERBOSE — Per-frame AI tick (enemyId, state, distanceToPlayer) — filter this heavily
WARN  — Enemy stuck (no valid path found, fallback: teleport or idle)
ERROR — Enemy spawned with invalid enemy type
```

#### UI System
```
INFO  — Screen opened/closed (screenId, e.g. "inventory", "passiveTree", "crafting")
INFO  — Item equipped (itemId, slot, previousItemId)
INFO  — Item unequipped (itemId, slot, reason)
DEBUG — Tooltip displayed (itemId, position)
WARN  — Attempted to equip item without meeting attribute requirements
WARN  — Inventory full — item not picked up (itemId)
```

#### Save System
```
INFO  — Save triggered (reason: "zone_transition" | "level_up" | "boss_kill" | "manual")
INFO  — Save written successfully (slot, byteSize, durationMs)
INFO  — Save loaded (slot, characterLevel, totalPlaytime)
WARN  — Auto-save skipped (reason: "combat_active")
ERROR — Save write failed (slot, errorMessage)
FATAL — Save data corruption detected (field, expectedType, receivedValue)
```

#### Event Bus
```
DEBUG — Every event published (eventName, payload summary) — can be toggled off
WARN  — Event published with no subscribers (eventName) — may indicate a wiring issue
ERROR — Subscriber threw an exception (eventName, subscriberId, error message)
```

### 21.5 Production vs Development Log Levels

Define a build flag `IS_DEV` that sets initial log level:

```typescript
const DEFAULT_LOG_LEVEL = IS_DEV ? LogLevel.DEBUG : LogLevel.WARN;
```

In production, VERBOSE and DEBUG are suppressed by default. The in-game debug overlay (Section 23) can temporarily enable DEBUG even in production builds.

---

## 22. EVENT BUS ARCHITECTURE

> AI NOTE: ALL communication between game systems MUST go through the central EventBus. Systems MUST NOT hold direct references to each other. This is what makes the codebase modular — you can add, remove, or replace any system without touching other systems, as long as events are correctly published and subscribed.

### 22.1 EventBus Interface

```typescript
interface IEventBus {
  on(event: GameEvent, handler: EventHandler, context?: object): void;
  once(event: GameEvent, handler: EventHandler, context?: object): void;
  off(event: GameEvent, handler: EventHandler, context?: object): void;
  emit(event: GameEvent, payload?: object): void;
  offAll(context: object): void;  // unsubscribe all listeners from a context (use in destroy())
}

type EventHandler = (payload: any) => void;
```

Every system subscribes in its `init()` method and calls `bus.offAll(this)` in its `destroy()` method.

### 22.2 Master Event Name Registry

All event names are defined in a single constants file. NEVER use raw strings for event names anywhere else in the codebase.

```typescript
// /src/core/events.ts — the single source of truth for all event names

export const GameEvent = {

  // ── COMBAT ──────────────────────────────────────────────────────────────
  COMBAT_HIT:                   'combat:hit',
  COMBAT_KILL:                  'combat:kill',
  COMBAT_PLAYER_HIT:            'combat:player_hit',
  COMBAT_PLAYER_DEATH:          'combat:player_death',
  COMBAT_CRIT:                  'combat:crit',
  COMBAT_AILMENT_APPLIED:       'combat:ailment_applied',
  COMBAT_AILMENT_EXPIRED:       'combat:ailment_expired',
  COMBAT_SKILL_USED:            'combat:skill_used',
  COMBAT_ATTACK_MISSED:         'combat:attack_missed',

  // ── LOOT ────────────────────────────────────────────────────────────────
  LOOT_ITEM_DROPPED:            'loot:item_dropped',
  LOOT_ITEM_PICKED_UP:          'loot:item_picked_up',
  LOOT_CURRENCY_DROPPED:        'loot:currency_dropped',
  LOOT_CURRENCY_PICKED_UP:      'loot:currency_picked_up',
  LOOT_INVENTORY_FULL:          'loot:inventory_full',

  // ── CRAFTING ─────────────────────────────────────────────────────────────
  CRAFTING_CURRENCY_APPLIED:    'crafting:currency_applied',
  CRAFTING_VAAL_APPLIED:        'crafting:vaal_applied',
  CRAFTING_BENCH_RECIPE_USED:   'crafting:bench_recipe_used',
  CRAFTING_ITEM_CORRUPTED:      'crafting:item_corrupted',
  CRAFTING_FAILED:              'crafting:failed',

  // ── GAMBLING ─────────────────────────────────────────────────────────────
  GAMBLING_INITIATED:           'gambling:initiated',
  GAMBLING_RESULT:              'gambling:result',
  GAMBLING_HOT_STREAK:          'gambling:hot_streak',
  GAMBLING_HIGH_ROLLER_USED:    'gambling:high_roller_used',
  GAMBLING_INSUFFICIENT_GOLD:   'gambling:insufficient_gold',

  // ── PLAYER ───────────────────────────────────────────────────────────────
  PLAYER_LEVEL_UP:              'player:level_up',
  PLAYER_XP_GAINED:             'player:xp_gained',
  PLAYER_STAT_CHANGED:          'player:stat_changed',
  PLAYER_RESOURCE_CHANGED:      'player:resource_changed',
  PLAYER_HEALTH_CHANGED:        'player:health_changed',
  PLAYER_HEALTH_LOW:            'player:health_low',
  PLAYER_RESPAWNED:             'player:respawned',
  PLAYER_GOLD_CHANGED:          'player:gold_changed',
  PLAYER_MOVED:                 'player:moved',

  // ── PASSIVE TREE ─────────────────────────────────────────────────────────
  PASSIVE_NODE_ALLOCATED:       'passive:node_allocated',
  PASSIVE_NODE_REFUNDED:        'passive:node_refunded',
  PASSIVE_POINTS_CHANGED:       'passive:points_changed',

  // ── SKILLS ───────────────────────────────────────────────────────────────
  SKILL_GEM_LEVELLED:           'skill:gem_levelled',
  SKILL_GEM_SOCKETED:           'skill:gem_socketed',
  SKILL_GEM_UNSOCKETED:         'skill:gem_unsocketed',
  SKILL_COOLDOWN_STARTED:       'skill:cooldown_started',
  SKILL_COOLDOWN_READY:         'skill:cooldown_ready',

  // ── INVENTORY ────────────────────────────────────────────────────────────
  INVENTORY_ITEM_ADDED:         'inventory:item_added',
  INVENTORY_ITEM_REMOVED:       'inventory:item_removed',
  INVENTORY_ITEM_EQUIPPED:      'inventory:item_equipped',
  INVENTORY_ITEM_UNEQUIPPED:    'inventory:item_unequipped',
  INVENTORY_ITEM_MOVED:         'inventory:item_moved',

  // ── ENEMY ────────────────────────────────────────────────────────────────
  ENEMY_SPAWNED:                'enemy:spawned',
  ENEMY_STATE_CHANGED:          'enemy:state_changed',
  ENEMY_DIED:                   'enemy:died',
  ENEMY_MODIFIER_APPLIED:       'enemy:modifier_applied',

  // ── WORLD ────────────────────────────────────────────────────────────────
  ZONE_LOADING:                 'zone:loading',
  ZONE_LOADED:                  'zone:loaded',
  ZONE_EXITED:                  'zone:exited',
  ZONE_BOSS_ENTERED:            'zone:boss_entered',
  ZONE_BOSS_KILLED:             'zone:boss_killed',
  WAYPOINT_DISCOVERED:          'zone:waypoint_discovered',
  WAYPOINT_USED:                'zone:waypoint_used',
  SHRINE_ACTIVATED:             'zone:shrine_activated',
  CHEST_OPENED:                 'zone:chest_opened',

  // ── UI ───────────────────────────────────────────────────────────────────
  UI_SCREEN_OPENED:             'ui:screen_opened',
  UI_SCREEN_CLOSED:             'ui:screen_closed',
  UI_TOOLTIP_SHOWN:             'ui:tooltip_shown',
  UI_TOOLTIP_HIDDEN:            'ui:tooltip_hidden',
  UI_NOTIFICATION:              'ui:notification',

  // ── SAVE ─────────────────────────────────────────────────────────────────
  SAVE_TRIGGERED:               'save:triggered',
  SAVE_COMPLETE:                'save:complete',
  SAVE_FAILED:                  'save:failed',
  SAVE_LOADED:                  'save:loaded',

  // ── SESSION ──────────────────────────────────────────────────────────────
  SESSION_STARTED:              'session:started',
  SESSION_PAUSED:               'session:paused',
  SESSION_RESUMED:              'session:resumed',

} as const;

type GameEvent = typeof GameEvent[keyof typeof GameEvent];
```

### 22.3 Event Payload Contracts

Every event MUST publish a payload matching the contract below. Subscribers can rely on these shapes.

```typescript
// Representative payload types — define ALL of these in /src/core/eventPayloads.ts

interface CombatHitPayload {
  attackerId: string;         // entity id
  targetId: string;
  damage: number;             // final damage after mitigation
  rawDamage: number;          // before mitigation
  damageType: DamageType;
  isCrit: boolean;
  ailmentApplied: AilmentType | null;
  hitPosition: { x: number; y: number };
}

interface LootItemDroppedPayload {
  itemId: string;
  rarity: ItemRarity;
  baseTypeId: string;
  affixes: string[];          // affix ids
  ilvl: number;
  zoneId: string;
  worldPosition: { x: number; y: number };
  sourceEnemyId: string | null;
}

interface PlayerLevelUpPayload {
  oldLevel: number;
  newLevel: number;
  totalXP: number;
  passivePointsTotal: number;
  skillPointsTotal: number;
}

interface CraftingCurrencyAppliedPayload {
  currencyId: string;
  itemId: string;
  stateBefore: ItemSnapshot;  // full serialised item state before
  stateAfter: ItemSnapshot;   // full serialised item state after
  success: boolean;
}

interface GamblingResultPayload {
  category: ItemCategory;
  cost: number;
  itemId: string;
  rarity: ItemRarity;
  baseTypeId: string;
  rarityRoll: number;         // the raw 0–1 roll for debug visibility
  isHotStreak: boolean;
  isHighRoller: boolean;
}

interface ZoneLoadedPayload {
  zoneId: string;
  seed: number;
  layout: string;             // layout type used
  enemyCount: number;
  poiList: string[];          // list of POI type strings placed
  generationTimeMs: number;
}
```

### 22.4 Event Wiring — System Responsibility Map

Defines exactly which system **emits** and which systems **listen** for each event. Use this as a wiring checklist during implementation.

| Event | Emitted By | Listened By |
|---|---|---|
| `COMBAT_HIT` | CombatSystem | UISystem (damage numbers), AudioSystem, AilmentSystem |
| `COMBAT_KILL` | CombatSystem | LootSystem, ProgressionSystem, QuestSystem, StatisticsSystem |
| `COMBAT_PLAYER_HIT` | CombatSystem | UISystem (globe flash, screen shake), AudioSystem |
| `COMBAT_PLAYER_DEATH` | CombatSystem | UISystem (death screen), WorldSystem (respawn), SaveSystem |
| `LOOT_ITEM_DROPPED` | LootSystem | UISystem (ground label), WorldSystem (place in world) |
| `LOOT_ITEM_PICKED_UP` | InputSystem (player click) | InventorySystem, UISystem, AudioSystem |
| `CRAFTING_CURRENCY_APPLIED` | CraftingSystem | InventorySystem (refresh item), UISystem (tooltip refresh), AudioSystem |
| `GAMBLING_RESULT` | GamblingSystem | InventorySystem, UISystem, AudioSystem |
| `PLAYER_LEVEL_UP` | ProgressionSystem | UISystem (level up fx), AudioSystem, StatSystem (recalculate), SaveSystem |
| `PLAYER_HEALTH_LOW` | StatSystem | UISystem (heartbeat pulse, globe pulse), AudioSystem (heartbeat SFX) |
| `PLAYER_GOLD_CHANGED` | InventorySystem | UISystem (gold display update) |
| `ZONE_LOADED` | WorldSystem | EnemySystem (spawn enemies), UISystem (zone name flash), SaveSystem |
| `ZONE_BOSS_KILLED` | CombatSystem | UISystem (boss bar remove), WorldSystem (open exits), QuestSystem, SaveSystem |
| `PASSIVE_NODE_ALLOCATED` | PassiveTreeSystem | StatSystem (recalculate), UISystem (tree refresh) |
| `INVENTORY_ITEM_EQUIPPED` | InventorySystem | StatSystem (recalculate), UISystem (character panel refresh) |
| `SAVE_TRIGGERED` | Multiple (see triggers) | SaveSystem |
| `SAVE_COMPLETE` | SaveSystem | UISystem (brief notification) |
| `UI_SCREEN_OPENED` | UISystem | InputSystem (block movement while open), AudioSystem |

---

## 23. SYSTEM INTERFACES & CONTRACTS

> AI NOTE: Every major game system MUST implement the `ISystem` base interface. This allows the core game loop to initialise, update, and destroy systems uniformly, and makes it trivial to add new systems later.

### 23.1 ISystem Base Interface

```typescript
interface ISystem {
  readonly name: string;          // human-readable system name for logging
  readonly logger: ILogger;       // each system holds its own tagged logger instance

  init(config?: object): void;    // called once at scene start; subscribe to events here
  update(delta: number): void;    // called every frame; delta in seconds
  destroy(): void;                // called on scene shutdown; unsubscribe events, clear state

  // Optional lifecycle hooks
  onSceneReady?(): void;          // called after all systems have initialised
  onZoneLoad?(zoneConfig: ZoneConfig): void;   // called when a new zone is loaded
  onZoneExit?(): void;            // called before zone is torn down
}
```

**Implementation example:**
```typescript
class CombatSystem implements ISystem {
  readonly name = 'CombatSystem';
  readonly logger = Logger.forSystem('COMBAT');

  init(): void {
    this.logger.info('Initialising');
    bus.on(GameEvent.PLAYER_MOVED, this.onPlayerMoved, this);
    this.logger.info('Initialised — subscribed to 1 event');
  }

  destroy(): void {
    bus.offAll(this);
    this.logger.info('Destroyed — all listeners removed');
  }
}
```

### 23.2 Individual System Contracts

#### ICombatSystem
```typescript
interface ICombatSystem extends ISystem {
  resolveHit(attacker: IEntity, target: IEntity, skillConfig: SkillConfig): HitResult;
  applyAilment(target: IEntity, ailment: AilmentType, source: IEntity): void;
  getAilmentsOnTarget(targetId: string): AilmentInstance[];
  canAttack(entity: IEntity): boolean;           // checks cooldowns, resource
  getDPS(entity: IEntity): number;               // calculated DPS for display
}
```

#### ILootSystem
```typescript
interface ILootSystem extends ISystem {
  rollDrops(enemy: IEnemyConfig, zone: IZoneConfig): DroppedItem[];
  generateItem(params: ItemGenerationParams): IItem;
  generateCurrency(pool: CurrencyPool): ICurrencyItem;
  spawnItemInWorld(item: IItem, position: Vector2): void;
}
```

#### ICraftingSystem
```typescript
interface ICraftingSystem extends ISystem {
  applyCurrency(currency: ICurrencyItem, target: IItem): CraftResult;
  canApply(currency: ICurrencyItem, target: IItem): { allowed: boolean; reason?: string };
  applyVaalCorruption(target: IItem): VaalResult;
  applyBenchRecipe(recipeId: string, target: IItem): CraftResult;
  getAvailableRecipes(target: IItem): BenchRecipe[];
}
```

#### IGamblingSystem
```typescript
interface IGamblingSystem extends ISystem {
  getAvailableCategories(playerLevel: number): GamblingCategory[];
  getCost(category: ItemCategory, playerLevel: number, mode: GamblingMode): number;
  executeGamble(category: ItemCategory, mode: GamblingMode): GambleResult;
  getHotStreakStatus(): { active: boolean; gamblesUntilNext: number };
  canHighRoller(): { allowed: boolean; cooldownRemainingMs: number };
}
```

#### IInventorySystem
```typescript
interface IInventorySystem extends ISystem {
  addItem(item: IItem): { success: boolean; slot?: GridSlot; reason?: string };
  removeItem(itemId: string): IItem | null;
  equipItem(itemId: string, slot: EquipSlot): EquipResult;
  unequipItem(slot: EquipSlot): UnequipResult;
  getEquipped(slot: EquipSlot): IItem | null;
  hasSpace(item: IItem): boolean;
  getItemAt(gridSlot: GridSlot): IItem | null;
  getCurrency(currencyId: string): number;
  modifyCurrency(currencyId: string, delta: number): boolean;  // returns false if delta would go negative
}
```

#### IProgressionSystem
```typescript
interface IProgressionSystem extends ISystem {
  addXP(amount: number, source: string): void;
  getLevel(): number;
  getXP(): number;
  getXPToNextLevel(): number;
  getAvailablePassivePoints(): number;
  allocatePassiveNode(nodeId: string): { success: boolean; reason?: string };
  refundPassiveNode(nodeId: string): { success: boolean; orbsConsumed: number };
  getSkillPoints(): number;
}
```

#### IStatSystem
```typescript
interface IStatSystem extends ISystem {
  recalculate(): void;               // MUST be called after any equipment, passive, or level change
  get(stat: StatKey): number;        // returns current resolved stat value
  getBase(stat: StatKey): number;    // returns base (pre-item) value
  getBreakdown(stat: StatKey): StatBreakdown;  // for tooltip "more info" display
}
```

#### ISaveSystem
```typescript
interface ISaveSystem extends ISystem {
  save(reason: string): Promise<boolean>;
  load(slot: number): Promise<SaveData | null>;
  deleteSave(slot: number): Promise<void>;
  hasSave(slot: number): boolean;
  validateSave(data: unknown): { valid: boolean; errors: string[] };
}
```

#### IWorldSystem
```typescript
interface IWorldSystem extends ISystem {
  loadZone(zoneId: string, seed?: number): Promise<void>;
  getCurrentZone(): IZoneConfig | null;
  getTileAt(tileX: number, tileY: number): TileData | null;
  isWalkable(tileX: number, tileY: number): boolean;
  worldToTile(worldX: number, worldY: number): { tileX: number; tileY: number };
  tileToWorld(tileX: number, tileY: number): { worldX: number; worldY: number };
  spawnEnemy(enemyId: string, tile: { tileX: number; tileY: number }): IEnemy | null;
}
```

---

## 24. MODULARITY & EXTENSIBILITY PATTERNS

> AI NOTE: All content (enemies, items, skills, affixes, classes, zones) MUST be registered via a central Registry at boot time. No system should hardcode a reference to a specific content type. Adding new content means: create a JSON entry + register it. That's all.

### 24.1 Registry Pattern

A single `GameRegistry` aggregates all content registries. Every registry exposes the same interface:

```typescript
interface IRegistry<T> {
  register(id: string, entry: T): void;
  get(id: string): T;                        // throws logged ERROR if not found
  getOrNull(id: string): T | null;           // returns null if not found
  getAll(): Map<string, T>;
  has(id: string): boolean;
  count(): number;
}

// Central registry — all others are namespaced under this
interface IGameRegistry {
  enemies:   IRegistry<EnemyConfig>;
  items:     IRegistry<ItemBaseConfig>;
  affixes:   IRegistry<AffixConfig>;
  skills:    IRegistry<SkillConfig>;
  supports:  IRegistry<SupportGemConfig>;
  classes:   IRegistry<ClassConfig>;
  zones:     IRegistry<ZoneConfig>;
  currency:  IRegistry<CurrencyConfig>;
  passives:  IRegistry<PassiveNodeConfig>;
  shrines:   IRegistry<ShrineConfig>;
  bosses:    IRegistry<BossConfig>;
  uniques:   IRegistry<UniqueItemConfig>;
}
```

### 24.2 Boot-Time Data Loading

At game start, before any scene initialises, the loader reads all JSON files and populates the registry:

```typescript
// /src/core/dataLoader.ts
async function loadAllData(registry: IGameRegistry): Promise<void> {
  const logger = Logger.forSystem('DATA_LOADER');
  logger.info('Loading all game data');

  const files: [string, keyof IGameRegistry, string][] = [
    ['/data/enemies.json',   'enemies',  'EnemyConfig'],
    ['/data/items.json',     'items',    'ItemBaseConfig'],
    ['/data/affixes.json',   'affixes',  'AffixConfig'],
    ['/data/skills.json',    'skills',   'SkillConfig'],
    ['/data/classes.json',   'classes',  'ClassConfig'],
    ['/data/zones.json',     'zones',    'ZoneConfig'],
    ['/data/currency.json',  'currency', 'CurrencyConfig'],
    ['/data/passives.json',  'passives', 'PassiveNodeConfig'],
  ];

  for (const [path, registryKey, typeName] of files) {
    try {
      const data = await fetch(path).then(r => r.json());
      let count = 0;
      for (const entry of data) {
        registry[registryKey].register(entry.id, entry);
        count++;
      }
      logger.info(`Loaded ${typeName}`, { path, count });
    } catch (err) {
      logger.fatal(`Failed to load ${typeName}`, { path, error: String(err) });
      throw err;  // halt startup — missing data is unrecoverable
    }
  }

  logger.info('All data loaded', { totalRegistered: /* sum counts */ });
}
```

### 24.3 Factory Pattern — Entity Creation

NEVER instantiate game entities with `new EnemyClass(...)` scattered throughout code. Use factories.

```typescript
interface IEnemyFactory {
  create(enemyId: string, position: Vector2, tier?: EnemyTier): IEnemy;
  createRare(enemyId: string, position: Vector2, modifierCount?: number): IEnemy;
  createBoss(bossId: string, arenaConfig: ArenaConfig): IBoss;
}

interface IItemFactory {
  createFromBase(baseTypeId: string, ilvl: number, rarity: ItemRarity): IItem;
  createFromConfig(config: UniqueItemConfig): IItem;
  createCurrency(currencyId: string, stackSize?: number): ICurrencyItem;
  createSkillGem(skillId: string, level?: number): ISkillGem;
}
```

Factories log every creation at DEBUG level:
```
[DEBUG] [ENEMY_FACTORY ] Enemy created — {"enemyId":"hollow_husk","tier":"RARE","mods":["armoured","volatile"],"position":{"x":320,"y":448}}
[DEBUG] [ITEM_FACTORY  ] Item generated — {"baseType":"war_axe","rarity":"RARE","ilvl":18,"affixes":["cruel","deadly","athlete"]}
```

### 24.4 How to Add New Content — Step-by-Step Guides

These guides define exactly what an AI needs to do to extend the game without touching core systems.

#### Adding a New Enemy Type
1. Add entry to `/data/enemies.json` with all required fields (id, name, stats, loot table, ai profile)
2. Create sprite sheet in `/assets/sprites/enemies/` (follow naming: `{enemy_id}_sheet.png`)
3. Add animation config to `/data/animations.json`
4. That's it — enemy will automatically appear in zones that reference it in their `enemy_roster`

#### Adding a New Class
1. Add entry to `/data/classes.json` (id, name, stats, startingPassiveNode, resourceType)
2. Add class-specific skill entries to `/data/skills.json` tagged with the class id
3. Define starting passive tree position in `/data/passives.json` (startRegion)
4. Add class sprite sheet
5. Register UI resource globe colour in `/data/ui_config.json`
6. No core code changes required

#### Adding a New Affix
1. Add entry to `/data/affixes.json` with all required fields (id, name, type, tier, weight, statKey, min, max, conflicts)
2. That's it — the affix system picks it up automatically in loot generation and crafting

#### Adding a New Skill
1. Add entry to `/data/skills.json` (id, name, class, resourceCost, cooldown, animationId, hitFrames, damageMultiplier, skillType, tags)
2. Add skill icon to `/assets/sprites/ui/skills/`
3. If the skill needs unique behaviour (not covered by existing hit types), implement a handler in `/src/systems/skills/handlers/` and register it by skill id
4. Skills without custom handlers default to the projectile or melee hit pipeline automatically

#### Adding a New Zone
1. Add entry to `/data/zones.json` with all fields from the Zone Config Schema (Appendix F)
2. Add room templates in `/assets/tilemaps/{biome}/` if a new biome is used
3. Add zone to the connections of the zone it should be reachable from
4. That's it — the World System will load it when a player enters via connection or waypoint

#### Adding a New Currency Item
1. Add entry to `/data/currency.json` (id, name, description, effectType, effectParams)
2. The CraftingSystem reads `effectType` and `effectParams` to know what to do
3. If the currency needs a behaviour not covered by existing effect types, add a handler in `/src/systems/crafting/currencyHandlers/` and register by `effectType`
4. Add icon to `/assets/sprites/ui/currency/`

---

## 25. DEBUG OVERLAY & DEVELOPER TOOLS

> AI NOTE: Implement the debug overlay in Phase 1 alongside core systems. It costs very little time and saves enormous amounts of debugging time later. It should be the very first "UI" element built.

### 25.1 Debug Overlay (Toggle: F1)

A transparent panel rendered above all game content. MUST NOT affect game performance when visible.

```
╔══════════════════════════════════════════════════════════╗
║  ASHFALL DEBUG OVERLAY                          [F1 close]║
╠══════════════╦═══════════════════════════════════════════╣
║ PERFORMANCE  ║ PLAYER                                     ║
║ FPS:    60   ║ Level: 15  Class: Ironclad                 ║
║ Frame:  16ms ║ HP: 340/340  Rage: 60/100                  ║
║ Entities: 47 ║ Pos: (320, 448)  Tile: (10, 14)           ║
║ Particles:82 ║ Move Speed: 200  Attack Speed: 1.4/s       ║
║ Draw calls:6 ║ DPS: 847  Crit: 12% / 175%                ║
╠══════════════╬═══════════════════════════════════════════╣
║ ZONE         ║ LAST EVENTS (most recent 8)                ║
║ ID: ashvale  ║ [INFO ] COMBAT_HIT dmg:47 crit:false       ║
║ Seed: 948271 ║ [INFO ] LOOT_ITEM_DROPPED rarity:RARE      ║
║ Level: 5     ║ [DEBUG] ENEMY_STATE idle→attack            ║
║ Enemies: 12  ║ [INFO ] PLAYER_XP_GAINED amount:240        ║
║ Killed: 8    ║ [INFO ] CRAFTING_CURRENCY_APPLIED chaos_orb║
║ Rooms: 9     ║ [WARN ] INVENTORY_FULL item not picked up  ║
╠══════════════╩═══════════════════════════════════════════╣
║ > _                              [console input field]    ║
╚══════════════════════════════════════════════════════════╝
```

### 25.2 Dev Console Commands

Accessible via the debug overlay input field or browser console via `window.DEV`.

All commands MUST be logged at INFO level when executed:
```
[INFO ] [DEV_CONSOLE  ] Command executed — {"command":"godmode","args":{"enabled":true},"executedAt":1234}
```

| Command | Arguments | Effect |
|---|---|---|
| `godmode [on/off]` | boolean | Toggle player invulnerability and infinite resource |
| `levelup [n]` | number (default 1) | Instantly gain n levels |
| `setlevel [n]` | number | Set player to exact level n |
| `givegold [n]` | number | Add n gold to player |
| `givecurrency [id] [n]` | string, number | Add n of currency item to inventory |
| `giveitem [baseTypeId] [rarity]` | string, string | Generate and give item |
| `giveunique [uniqueId]` | string | Give a specific unique item |
| `spawnhere [enemyId] [tier]` | string, string | Spawn enemy at player position |
| `killall` | — | Kill all enemies in zone |
| `goto [zoneId]` | string | Instantly travel to zone |
| `setstat [statKey] [value]` | string, number | Override a player stat |
| `setloglevel [level]` | VERBOSE/DEBUG/INFO/WARN | Change log level at runtime |
| `filtersystem [system] [on/off]` | string, boolean | Show/hide log entries for a system |
| `showlog [n]` | number (default 20) | Print last n log entries to console |
| `exportlog` | — | Download full log buffer as .txt |
| `reloaddata [file]` | string | Hot-reload a specific JSON data file |
| `showpassive [nodeId]` | string | Print full passive node config to console |
| `showitem [itemId]` | string | Print full item state to console |
| `showenemy [entityId]` | string | Print full enemy state and AI state |
| `reset` | — | Reset current zone (re-generate, re-spawn) |
| `help` | — | Print all available commands |

### 25.3 Visual Debug Aids (Dev Mode Only)

When `IS_DEV` is true, the following optional overlays are available (toggleable per-key):

| Toggle | Key | Shows |
|---|---|---|
| Tile grid | F2 | Isometric tile grid lines over the world |
| Collision | F3 | Walkable/unwalkable tiles highlighted (green/red) |
| Entity bounds | F4 | Bounding boxes of all entities |
| AI state | F5 | State label above every enemy (idle/alert/attack/flee) |
| AI path | F6 | Current pathfinding path drawn as line |
| Depth order | F7 | Z-depth value shown above each sprite |
| Affix weights | F8 | Print weighted affix pool for current zone ilvl to console |
| Event stream | F9 | Live event stream panel (all events, real-time) |

---

## 26. ERROR HANDLING STRATEGY

> AI NOTE: The game must NEVER crash to a white screen or frozen state. All errors must be caught, logged, and either recovered from gracefully or shown to the player as a friendly message.

### 26.1 Error Handling Tiers

| Tier | Severity | Handling |
|---|---|---|
| Recoverable | Minor data issue, missing optional field | Log WARN, use fallback value, continue |
| Degraded | A system fails non-critically | Log ERROR, disable that feature, notify player subtly |
| Critical | Core system failure | Log FATAL, attempt emergency save, show error screen |
| Data Corruption | Save data invalid | Log FATAL, offer to reset save or load backup |

### 26.2 System Update Error Boundary

Every system's `update()` call in the game loop MUST be wrapped:

```typescript
// In the main game loop:
for (const system of this.systems) {
  try {
    system.update(delta);
  } catch (err) {
    Logger.forSystem('GAME_LOOP').error(
      `System update threw uncaught exception`,
      { system: system.name, error: String(err), stack: err.stack }
    );
    // Do NOT rethrow — allow other systems to continue running
    // Emit an event so UI can show a non-intrusive warning if needed
    bus.emit(GameEvent.UI_NOTIFICATION, {
      type: 'error',
      message: `[Dev] ${system.name} error — see console`,
      duration: 5000,
      devOnly: true,
    });
  }
}
```

### 26.3 Registry Access Error Handling

Any `registry.get()` call that fails (item not found) MUST:
1. Log ERROR with the missing id and calling context
2. Return a safe fallback (null item, zero-stat enemy, etc.) — NEVER crash
3. Show a dev-mode notification

```typescript
// Example in IRegistry.get():
get(id: string): T {
  const entry = this.entries.get(id);
  if (!entry) {
    Logger.forSystem(this.registryName).error(
      'Entry not found — returning null fallback',
      { requestedId: id, availableCount: this.entries.size }
    );
    return this.fallback;  // each registry defines a safe fallback
  }
  return entry;
}
```

### 26.4 Save Data Validation

On every load, `ISaveSystem.validateSave()` MUST run before any save data is applied to game state:

```typescript
function validateSave(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  // Check required fields exist and are correct types
  if (typeof data.character?.level !== 'number') errors.push('character.level must be number');
  if (data.character?.level < 1 || data.character?.level > 100) errors.push('character.level out of range');
  // ... exhaustive checks for all critical fields
  return { valid: errors.length === 0, errors };
}
```

If validation fails:
- Log FATAL with all errors listed
- Present player with options: "Start fresh" or "Try backup save"
- NEVER attempt to load partially valid save data

### 26.5 Async Error Handling

All async operations (data loading, save/load, zone loading) MUST use try/catch and MUST NOT use unhandled promise rejections:

```typescript
async function loadZone(zoneId: string): Promise<void> {
  const logger = Logger.forSystem('WORLD');
  logger.info('Zone load started', { zoneId });

  try {
    const config = registry.zones.get(zoneId);
    // ... generation steps, each logged individually
    logger.info('Zone load complete', { zoneId, timeMs: performance.now() - start });
  } catch (err) {
    logger.fatal('Zone load failed', { zoneId, error: String(err) });
    // Fall back to town hub — never leave player in broken state
    await this.loadZone('ashvale_town');
  }
}
```

---

*End of Game Design Document — Ashfall v1.1*  
*This document is a living specification. Update version number on significant changes.*  
*AI implementing this document: prioritise Phase 1 tasks before any Phase 2+ systems.*  
*Sections 21–26 (Technical Architecture Addendum) were added in v1.1 — implement these in parallel with all Phase 1 systems, not after.*
