# Skill Bar HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5-slot skill bar (LMB/Q/E/R/F) below the XP bar in the HUD with cooldown overlays, resource costs, and hover tooltips.

**Architecture:** Extend HUDScene with a skillBar rendering path that queries SkillSystem each frame. GameScene passes skillSystem via launch data. All rendering uses the existing Graphics + Text object pattern.

**Tech Stack:** Phaser 3, TypeScript, Vitest

---

### Task 1: Pass skillSystem to HUDScene

**Files:**
- Modify: `src/scenes/GameScene.ts:101-104`

- [ ] **Step 1: Add skillSystem to HUDScene launch data**

In GameScene.ts, change the HUDScene launch data to include `skillSystem`:

```typescript
this.scene.launch(HUDScene.KEY, {
  playerSystem,
  inventorySystem,
  skillSystem,
});
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/GameScene.ts && git commit -m "feat: pass skillSystem to HUDScene launch data"
```

---

### Task 2: Add skillSystem to HUDScene and create skill bar objects

**Files:**
- Modify: `src/scenes/HUDScene.ts`

- [ ] **Step 1: Import SkillSystem and add property**

At the top, add import for SkillSystem:
```typescript
import type { SkillSystem } from '../systems/SkillSystem';
```

Add class property:
```typescript
private skillSystem!: SkillSystem;
```

- [ ] **Step 2: Receive skillSystem in init()**

Update `init()` signature to accept `skillSystem`:
```typescript
init(data: { playerSystem: PlayerSystem; inventorySystem: InventorySystem; skillSystem: SkillSystem }): void {
  this.playerSystem = data.playerSystem;
  this.inventorySystem = data.inventorySystem;
  this.skillSystem = data.skillSystem;
}
```

- [ ] **Step 3: Add skill bar container properties**

After the existing potion/gold properties:
```typescript
private skillSlots: Phaser.GameObjects.Graphics[] = [];
private skillIconRects: { g: Phaser.GameObjects.Graphics; x: number; y: number }[] = [];
private skillHotkeyTexts: Phaser.GameObjects.Text[] = [];
private skillCostTexts: Phaser.GameObjects.Text[] = [];
private skillCdTexts: Phaser.GameObjects.Text[] = [];
private skillNameTexts: Phaser.GameObjects.Text[] = [];
private tooltipBg!: Phaser.GameObjects.Graphics;
private tooltipName!: Phaser.GameObjects.Text;
private tooltipDesc!: Phaser.GameObjects.Text;
private tooltipCd!: Phaser.GameObjects.Text;
private tooltipCost!: Phaser.GameObjects.Text;
private hoveredSlotIndex: number = -1;
```

- [ ] **Step 4: Add createSkillBar method and drawSkillSlotBg helper**

Call from `create()` after potion belt lines.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/HUDScene.ts && git commit -m "feat: skill bar graphics objects created in HUD"
```

---

### Task 3: Implement per-slot state rendering and cooldown overlay

**Files:**
- Modify: `src/scenes/HUDScene.ts`

- [ ] **Step 1: Add helper methods `getSkillTypeColor()`, `getSlotX()`, `getSlotWidth()`**

- [ ] **Step 2: Add `updateSkillBar()` rendering all 5 slots each frame**

For each slot: if skill is assigned, draw type-colored icon rect, skill name, resource cost, cooldown overlay (semi-transparent black sweep top-down), and cooldown timer text. Empty slots show nothing.

- [ ] **Step 3: Add `getSkillCostColor()` helper**

- [ ] **Step 4: Wire `updateSkillBar()` into `update()`**

- [ ] **Step 5: Commit**

```bash
git add src/scenes/HUDScene.ts && git commit -m "feat: skill bar rendering with cooldown overlays and resource costs"
```

---

### Task 4: Implement hover detection and tooltip

**Files:**
- Modify: `src/scenes/HUDScene.ts`

- [ ] **Step 1: Add hover detection in updateSkillBar**

Check `this.input.activePointer` against each slot's bounds.

- [ ] **Step 2: Add `updateTooltip()` and `drawTooltipBg()`**

Position tooltip above hovered slot, show skill name, description, cooldown, resource cost.

- [ ] **Step 3: Wire `updateTooltip()` into `update()`**

- [ ] **Step 4: Commit**

```bash
git add src/scenes/HUDScene.ts && git commit -m "feat: skill bar hover tooltip with skill details"
```

---

### Task 5: Visual polish and edge cases

**Files:**
- Modify: `src/scenes/HUDScene.ts`

- [ ] **Step 1: Insufficient resource → desaturated icon + red cost text**

- [ ] **Step 2: Cooldown overlay hides name text**

- [ ] **Step 3: Commit**

```bash
git add src/scenes/HUDScene.ts && git commit -m "feat: skill bar resource-short visual and cooldown polish"
```

---

### Task 6: Final verification and memory update

- [ ] **Step 1: Run tests**

```bash
npm run test
```

- [ ] **Step 2: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Update memory.md**
Append to memory.md:
```markdown
### Phase 1.5.3 — Skill Bar HUD (Completed)
- **Skill Bar**: 5 slots (LMB basic + Q/E/R/F) below XP bar at y=1080
- **Visual**: HUD-matching dark slots, colored skill type icons, hotkey labels, resource cost text
- **Cooldown**: Semi-transparent black overlay sweeping top-down, timer text centered
- **Tooltip**: Hover shows skill name, description, cooldown, and resource cost
- **Resource-aware**: Insufficient resource shows red cost text + desaturated icon
- **Dependency**: HUDScene now receives skillSystem from GameScene launch data
```

- [ ] **Step 5: Commit**

```bash
git add memory.md && git commit -m "docs: mark Phase 1.5.3 Skill Bar HUD as complete"
```
