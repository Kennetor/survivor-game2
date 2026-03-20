# Survivor Game 2

A browser-based top-down auto-shooter inspired by Vampire Survivors. Fight off endless waves of skeleton warriors, survive long enough to face the first boss, and level up with powerful upgrades.

## 🎮 [Click here to play](https://kennetor.github.io/survivor-game2/)

---

## How to Play

### Desktop
- **WASD** — Move
- **Mouse cursor** — Aim (cursor aim by default)
- **T** — Toggle between cursor aim and auto aim
- **Auto-attack** — Your character shoots automatically
- **Space** — Pause

### Mobile
- **Virtual joystick** — Move
- **Auto-aim** — Automatically shoots toward the nearest visible enemy
- **Menu button** — Pause, restart, and control settings

---

## Upgrades

Level up by collecting XP orbs dropped by enemies. Each level-up presents 3 random upgrades to choose from.

- 🔫 **Faster Fire Rate** *(up to 5x)* — Shoot more often
- 💥 **Pierce** *(up to 5)* — Bullets pass through multiple enemies
- 🔱 **Multishot** *(3 tiers)* — Fire extra bullets; every 3 shots → every 2 → every shot
- 📐 **Wider Spread** — Unlocks after maxing Multishot; increases bullet spread angle
- 🧄 **Orb Magnet** — XP orbs fly toward you automatically
- 🧲 **Stronger Magnet** — Orbs fly toward you faster
- 🩸 **Vampire** *(3 tiers)* — Killing enemies heals you; higher tiers heal more per kill
- 🛡️ **Thorns** *(3 tiers)* — Reflect damage to enemies that touch you (20 → 50 → 100)
- ⚡ **More Speed** *(up to 400)* — Move faster
- ❤️ **Extra HP** — Increase max health and heal instantly
- 🔵 **Bigger Bullets** *(up to 5)* — Larger bullets with bigger hit radius

---

## Enemies

- **Skeleton Warrior** — Standard enemy, switches to attack animation when close
- **Armored Fighter** *(unlocks at 1:30)* — Faster and more aggressive

---

## Boss

- **The Beast** *(spawns at 1:00)* — A massive lava werewolf appears after surviving one minute. All regular enemies are cleared when it spawns. Defeat it to resume normal waves and earn bonus XP.

---

## Built With

- [Phaser 3](https://phaser.io/) — Game framework
- [Vite](https://vitejs.dev/) — Build tool
- [InvokeAI](https://invoke-ai.github.io/InvokeAI/) — Boss sprite generation
- Vanilla JavaScript