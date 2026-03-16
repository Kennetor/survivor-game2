import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Load XP orb image
        this.load.image('xp-orb', 'xp-orb.png');
        
        // Load player sprite sheet
        this.load.spritesheet('player', 'Vampires1_Walk_without_shadow.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        
        // Load fast enemy sprite sheets
        this.load.spritesheet('fast-enemy-run', 'fast.Run.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('fast-enemy-attack', 'fast.attack.png', { frameWidth: 128, frameHeight: 128 });
        
        // Load regular enemy sprite sheets
        this.load.spritesheet('enemy-walk', 'enemy.walk.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('enemy-attack', 'attack.png', { frameWidth: 128, frameHeight: 128 });
    }

    create() {
        // Reset upgrade cards to ensure consistent state
        this.resetUpgradeCards();
        
        // Hide game over screen at start to prevent carryover between restarts
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.style.display = 'none';
        }
        
        // Set up upgrade screen event delegation
        document.getElementById('upgrade-screen').addEventListener('click', (e) => {
            const card = e.target.closest('.upgrade-card');
            if (!card) return;
            this.handleUpgradeClick(card.dataset.upgrade);
            this.closeUpgradeScreen();
        });
        
        // Set up spacebar pause toggle
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.upgradeScreenOpen) {
                document.getElementById('pause-screen').style.display = 'none';
                this.closeUpgradeScreen();
            } else {
                this.openUpgradeScreen();
                document.getElementById('upgrade-screen').style.display = 'none';
                document.getElementById('pause-screen').style.display = 'flex';
            }
        });
        
        // Create player animations
        this.anims.create({ key: 'walk-down',  frames: this.anims.generateFrameNumbers('player', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk-up',    frames: this.anims.generateFrameNumbers('player', { start: 6, end: 11 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk-right', frames: this.anims.generateFrameNumbers('player', { start: 18, end: 23 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk-left',  frames: this.anims.generateFrameNumbers('player', { start: 12, end: 17 }), frameRate: 8, repeat: -1 });
        
        // Create fast enemy animations
        this.anims.create({ key: 'fast-run', frames: this.anims.generateFrameNumbers('fast-enemy-run', { start: 0, end: 6 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'fast-attack', frames: this.anims.generateFrameNumbers('fast-enemy-attack', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        
        // Debug logging for fast enemy frame data
        console.log('fast-run frames:', this.textures.get('fast-enemy-run').frameTotal);
        console.log('fast-attack frames:', this.textures.get('fast-enemy-attack').frameTotal);
        
        // Create regular enemy animations
        this.anims.create({ key: 'enemy-walk', frames: this.anims.generateFrameNumbers('enemy-walk', { start: 0, end: 6 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'enemy-attack', frames: this.anims.generateFrameNumbers('enemy-attack', { start: 0, end: 4 }), frameRate: 8, repeat: -1 });
        
        // Create ground using Graphics API (infinite world)
        this.groundGraphics = this.add.graphics();
        this.groundGraphics.fillStyle(0x333333, 1);
        // Start with a large ground area, will be updated as camera moves
        this.groundGraphics.fillRect(-10000, -10000, 20000, 20000);

        // Create player using sprite sheet
        this.player = this.physics.add.sprite(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'player'
        );
        this.player.setScale(2);
        this.player.setCollideWorldBounds(false);
        this.player.play('walk-down');
        console.log('player created at', this.player.x, this.player.y);

        // Create arrays for enemies, bullets, and orbs (plain arrays, no physics groups)
        this.enemies = [];
        this.bullets = [];
        this.orbs = [];

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Game state
        this.xp = 0;
        this.level = 1;
        this.xpForNextLevel = 30; // First level up requires 30 XP
        this.playerHealth = 100;
        this.maxHealth = 100;
        this.isPlayerInvincible = false;
        this.isUpgrading = false;
        this.hasMagnet = false;
        this.magnetSpeed = 150; // Base magnet speed
        this.enemyDamageCooldowns = new Map(); // Per-enemy damage cooldowns
        this.enemyKnockbackTime = new Map(); // Per-enemy knockback timers
        this.survivalTime = 0; // Survival timer in seconds
        this.timeTimer = null; // Timer for survival time
        this.upgradeScreenOpen = false; // Boolean flag for upgrade screen state
        
        // Upgrade stats
        this.bulletSpeed = 400;
        this.playerSpeed = 200;
        this.fireRate = 1000;
        this.enemyHP = 1;
        
        // New upgrade stats
        this.piercePower = 0;
        this.multishotLevel = 0;
        this.hasVampire = false;
        this.shotCount = 0;
        this.spreadAngle = 15;
        this.thornsDamage = 0;
        this.bulletRadius = 5;

        // UI
        // Level display
        this.levelText = this.add.text(16, 16, 'Level: 1', {
            fontSize: '32px',
            fill: '#fff'
        });
        this.levelText.setScrollFactor(0);
        
        // XP bar background
        this.xpBarBg = this.add.rectangle(16, 60, 200, 10, 0x333333);
        this.xpBarBg.setOrigin(0, 0);
        this.xpBarBg.setScrollFactor(0);
        
        // XP bar fill
        this.xpBarFill = this.add.rectangle(16, 60, 0, 10, 0x00ff00);
        this.xpBarFill.setOrigin(0, 0);
        this.xpBarFill.setScrollFactor(0);
        
        // Health bar background
        this.healthBarBg = this.add.rectangle(600, 16, 200, 20, 0x333333);
        this.healthBarBg.setOrigin(0, 0);
        this.healthBarBg.setScrollFactor(0);
        
        // Health bar fill
        this.healthBarFill = this.add.rectangle(600, 16, 200, 20, 0xff0000);
        this.healthBarFill.setOrigin(0, 0);
        this.healthBarFill.setScrollFactor(0);

        // Spawning - enable regular enemy spawner
        this.spawnTimer = this.time.addEvent({
            delay: 2000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
        
        // Start survival timer
        this.startSurvivalTimer();
        
        // Spawn 3 enemies immediately when scene starts
        this.time.delayedCall(0, () => {
            this.spawnEnemy();
            this.spawnEnemy();
            this.spawnEnemy();
        }, [], this);

        // Auto-attack
        this.shootTimer = this.time.addEvent({
            delay: this.fireRate,
            callback: this.autoAttack,
            callbackScope: this,
            loop: true
        });

        // Camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(1.5);

        // Collisions
        this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);
    }

    update() {
        // Stop all game logic while upgrade screen is open
        if (this.upgradeScreenOpen) return;

        // Player movement
        this.player.setVelocity(0);

        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            this.player.setVelocityX(-this.playerSpeed);
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            this.player.setVelocityX(this.playerSpeed);
        } else if (this.cursors.up.isDown || this.wasd.W.isDown) {
            this.player.setVelocityY(-this.playerSpeed);
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            this.player.setVelocityY(this.playerSpeed);
        }

        // Animation based on movement and mouse cursor direction
        const isMoving = this.cursors.left.isDown || this.cursors.right.isDown ||
                         this.cursors.up.isDown || this.cursors.down.isDown ||
                         this.wasd.A.isDown || this.wasd.D.isDown ||
                         this.wasd.W.isDown || this.wasd.S.isDown;

        const pointer = this.input.activePointer;
        const angleToMouse = Phaser.Math.Angle.Between(
            this.player.x, this.player.y,
            pointer.worldX, pointer.worldY
        );
        const deg = Phaser.Math.RadToDeg(angleToMouse);

        let facing;
        if (deg > -45 && deg <= 45) facing = 'walk-right';
        else if (deg > 45 && deg <= 135) facing = 'walk-down';
        else if (deg < -45 && deg >= -135) facing = 'walk-up';
        else facing = 'walk-left';

        if (isMoving) {
            this.player.play(facing, true);
        } else {
            this.player.anims.stop();
            // Show first frame of the correct facing direction
            const frameMap = { 'walk-down': 0, 'walk-up': 6, 'walk-left': 12, 'walk-right': 18 };
            this.player.setFrame(frameMap[facing]);
        }

        // Enemy damage check - runs every frame
        const now = this.time.now;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy || !enemy.active) continue;
            const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            const lastHit = this.enemyDamageCooldowns.get(enemy) || 0;
            if (dist < 30 && now - lastHit > 1000) {
                this.enemyDamageCooldowns.set(enemy, now);
                this.takeDamage(enemy.damage || 10); // Use enemy's damage property, fallback to 10
                
                // Thorns damage
                if (this.thornsDamage > 0) {
                    enemy.health -= this.thornsDamage;
                    if (enemy.health <= 0) {
                        if (this.hasVampire) {
                            this.playerHealth = Math.min(this.maxHealth, this.playerHealth + 2);
                            this.updateUI();
                        }
                        this.spawnXPOrb(enemy.x, enemy.y);
                        this.enemyDamageCooldowns.delete(enemy);
                        this.enemyKnockbackTime.delete(enemy);
                        this.enemies.splice(this.enemies.indexOf(enemy), 1);
                        enemy.destroy();
                    }
                }
                
                const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                if (!enemy || !enemy.body) continue;
                enemy.body.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
                this.enemyKnockbackTime.set(enemy, now);
            }
        }

        // Manual bullet-enemy collision detection with pierce
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const dist = Phaser.Math.Distance.Between(
                    this.bullets[i].x, this.bullets[i].y,
                    this.enemies[j].x, this.enemies[j].y
                );
                if (dist < 20 + this.bulletRadius) {
                    // Track pierce count for this bullet
                    this.bullets[i].pierceCount = this.bullets[i].pierceCount || 0;
                    
                    // Handle enemy damage
                    const enemy = this.enemies[j];
                    if (enemy.health !== undefined) {
                        // Enemy has health (regular enemy)
                        enemy.health -= 1; // Each bullet deals 1 damage
                        if (enemy.health <= 0) {
                            // Enemy dies
                            this.spawnXPOrb(enemy.x, enemy.y);
                            this.enemyDamageCooldowns.delete(enemy); // Clean up cooldown map
                            this.enemyKnockbackTime.delete(enemy); // Clean up knockback map
                            this.enemies.splice(j, 1);
                            enemy.destroy();
                            
                            // Vampire heal
                            if (this.hasVampire) {
                                this.playerHealth = Math.min(this.maxHealth, this.playerHealth + 2);
                                this.updateUI();
                            }
                        }
                    } else {
                        // Fast enemy (no health property, dies in 1 hit)
                        this.spawnXPOrb(enemy.x, enemy.y);
                        this.enemyDamageCooldowns.delete(enemy); // Clean up cooldown map
                        this.enemyKnockbackTime.delete(enemy); // Clean up knockback map
                        this.enemies.splice(j, 1);
                        enemy.destroy();
                        
                        // Vampire heal
                        if (this.hasVampire) {
                            this.playerHealth = Math.min(this.maxHealth, this.playerHealth + 2);
                            this.updateUI();
                        }
                    }
                    
                    // Increment pierce count and check if bullet should be destroyed
                    this.bullets[i].pierceCount++;
                    if (this.bullets[i].pierceCount > this.piercePower) {
                        this.bullets[i].destroy();
                        this.bullets.splice(i, 1);
                        break;
                    }
                }
            }
        }

        // Update ground position to follow camera
        this.groundGraphics.x = this.cameras.main.scrollX * 0.5;
        this.groundGraphics.y = this.cameras.main.scrollY * 0.5;
        
        // Update all enemies and make them move toward player
        const now2 = this.time.now;
        this.enemies.forEach(enemy => {
            const knockedAt = this.enemyKnockbackTime.get(enemy) || 0;
            if (now2 - knockedAt > 400) {
                let enemySpeed = 80 + this.level * 10; // Base enemy speed scales with level
                
                // Fast enemies move at double speed
                if (enemy.damage === 5) {
                    enemySpeed *= 2;
                }
                
                this.physics.moveToObject(enemy, this.player, enemySpeed);
                
                // Flip fast enemy based on direction
                if (enemy.type === 'fast') {
                    const distToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
                    if (distToPlayer < 60) {
                        enemy.play('fast-attack', true);
                    } else {
                        enemy.play('fast-run', true);
                    }
                    enemy.setFlipX(this.player.x < enemy.x);
                }
                
                // Regular enemy animation switching
                if (enemy.type === 'regular') {
                    const distToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
                    if (distToPlayer < 60) {
                        enemy.play('enemy-attack', true);
                    } else {
                        enemy.play('enemy-walk', true);
                    }
                    enemy.setFlipX(this.player.x < enemy.x);
                }
            }
        });
        
        // Update all bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            // Remove bullets that are inactive or have traveled too far from player
            if (!bullet.active) {
                bullet.destroy();
                this.bullets.splice(i, 1);
            } else {
                // Check distance from player - destroy if more than 600 pixels away
                const distance = Phaser.Math.Distance.Between(
                    bullet.x, bullet.y,
                    this.player.x, this.player.y
                );
                if (distance > 600) {
                    bullet.destroy();
                    this.bullets.splice(i, 1);
                }
            }
        }
        
        // Update all orbs and check for collection
        for (let i = this.orbs.length - 1; i >= 0; i--) {
            const orb = this.orbs[i];
            
            // Orb magnet effect
            if (this.hasMagnet) {
                // Add physics to orb if it doesn't have it
                if (!orb.body) {
                    this.physics.add.existing(orb);
                }
                this.physics.moveToObject(orb, this.player, this.magnetSpeed);
            }
            
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, orb.x, orb.y);
            if (dist < 15) {
                // Collect orb
                orb.destroy();
                this.orbs.splice(i, 1);
                this.gainXP(10);
            }
        }
    }

    spawnEnemy() {
        // Spawn multiple enemies based on level
        const enemiesToSpawn = Math.floor(1 + this.level * 0.5);
        
        for (let i = 0; i < enemiesToSpawn; i++) {
            const spawnEdge = Phaser.Math.Between(0, 3); // 0: top, 1: right, 2: bottom, 3: left
            let x, y;
            const camera = this.cameras.main;
            const zoom = camera.zoom;
            
            // Get camera bounds in world coordinates
            const cameraLeft = camera.scrollX;
            const cameraRight = camera.scrollX + (camera.width / zoom);
            const cameraTop = camera.scrollY;
            const cameraBottom = camera.scrollY + (camera.height / zoom);
            
            // Add some padding so enemies spawn just outside the visible area
            const padding = 50;

            switch (spawnEdge) {
                case 0: // top
                    x = Phaser.Math.Between(cameraLeft - padding, cameraRight + padding);
                    y = cameraTop - padding;
                    break;
                case 1: // right
                    x = cameraRight + padding;
                    y = Phaser.Math.Between(cameraTop - padding, cameraBottom + padding);
                    break;
                case 2: // bottom
                    x = Phaser.Math.Between(cameraLeft - padding, cameraRight + padding);
                    y = cameraBottom + padding;
                    break;
                case 3: // left
                    x = cameraLeft - padding;
                    y = Phaser.Math.Between(cameraTop - padding, cameraBottom + padding);
                    break;
            }

            // Determine enemy type based on level
            let enemyType = 'normal';
            if (this.level >= 5) {
                // Mix in fast small enemies starting from wave 5
                enemyType = Phaser.Math.Between(0, 3) === 0 ? 'fast' : 'normal'; // 25% chance for fast enemy
            }

            // Create enemy based on type
            let enemy;
            if (enemyType === 'fast') {
                // Fast small enemy: animated sprite
                enemy = this.physics.add.sprite(x, y, 'fast-enemy-run');
                enemy.setScale(0.8);
                enemy.play('fast-run');
                enemy.damage = 5;
                enemy.health = 1;
                enemy.type = 'fast';
            } else {
                // Normal enemy: animated sprite
                enemy = this.physics.add.sprite(x, y, 'enemy-walk');
                enemy.setScale(0.8);
                enemy.play('enemy-walk');
                enemy.damage = 10;
                enemy.health = 1;
                enemy.type = 'regular';
            }
            
            this.physics.add.existing(enemy);
            this.enemies.push(enemy);
        }
    }

    autoAttack() {
        if (this.isUpgrading) return;
        
        // Get mouse cursor position in world coordinates
        const pointer = this.input.activePointer;
        const mouseX = pointer.worldX;
        const mouseY = pointer.worldY;
        
        // Calculate angle from player to mouse
        const angleRad = Phaser.Math.Angle.Between(this.player.x, this.player.y, mouseX, mouseY);
        const angleDeg = Phaser.Math.RadToDeg(angleRad);
        
        // Create main bullet
        const bullet = this.add.circle(this.player.x, this.player.y, this.bulletRadius, 0xffffff);
        this.physics.add.existing(bullet);
        this.physics.velocityFromAngle(angleDeg, this.bulletSpeed, bullet.body.velocity);
        this.bullets.push(bullet);
        
        // Multishot logic
        if (this.multishotLevel >= 1) {
            this.shotCount++;
            
            // Determine if we should fire bonus bullet based on multishot level
            let shouldFireBonus = false;
            if (this.multishotLevel === 1) {
                // Level 1: fire bonus every 3 shots
                shouldFireBonus = (this.shotCount % 3 === 0);
            } else if (this.multishotLevel === 2) {
                // Level 2: fire bonus every 2 shots
                shouldFireBonus = (this.shotCount % 2 === 0);
            } else {
                // Level 3+: fire bonus every shot
                shouldFireBonus = true;
            }
            
            if (shouldFireBonus) {
                // Create spread bullets using spreadAngle
                const spreadAngle1 = angleDeg + this.spreadAngle;
                const spreadAngle2 = angleDeg - this.spreadAngle;
                
                const bullet1 = this.add.circle(this.player.x, this.player.y, this.bulletRadius, 0xffffff);
                this.physics.add.existing(bullet1);
                this.physics.velocityFromAngle(spreadAngle1, this.bulletSpeed, bullet1.body.velocity);
                this.bullets.push(bullet1);
                
                const bullet2 = this.add.circle(this.player.x, this.player.y, this.bulletRadius, 0xffffff);
                this.physics.add.existing(bullet2);
                this.physics.velocityFromAngle(spreadAngle2, this.bulletSpeed, bullet2.body.velocity);
                this.bullets.push(bullet2);
            }
        }
    }

    spawnXPOrb(x, y) {
        // Create orb using the xp-orb.png image
        const orb = this.add.image(x, y, 'xp-orb');
        orb.setDisplaySize(24, 24);
        this.orbs.push(orb);
    }

    gainXP(amount) {
        this.xp += amount;
        
        // Check for level up
        if (this.xp >= this.xpForNextLevel) {
            this.levelUp();
        } else {
            this.updateUI();
        }
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpForNextLevel;
        this.xpForNextLevel = 30 + (this.level - 1) * 50; // Balance: 30 + (level-1) * 50 XP
        
        // Pause game and show DOM upgrade screen
        this.openUpgradeScreen();
    }

    openUpgradeScreen() {
        this.upgradeScreenOpen = true;
        this.spawnTimer.paused = true;
        this.timeTimer.paused = true;
        this.shootTimer.paused = true;
        this.player.body.setVelocity(0, 0);
        this.player.body.moves = false;
        this.player.anims.stop();
        this.enemies.forEach(e => {
            if (e && e.body) {
                e.body.setVelocity(0, 0);
                e.body.moves = false;
            }
            if (e && e.anims) e.anims.stop();
        });
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            if (this.bullets[i]) this.bullets[i].destroy();
        }
        this.bullets = [];
        this.orbs.forEach(o => {
            if (o) {
                if (o.body) o.body.setVelocity(0, 0);
                o.setVisible(false);
            }
        });
        this.showUpgradeScreen();
    }

    closeUpgradeScreen() {
        this.upgradeScreenOpen = false;
        this.spawnTimer.paused = false;
        this.timeTimer.paused = false;
        this.shootTimer.paused = false;
        this.player.body.moves = true;
        this.enemies.forEach(e => {
            if (e && e.body) e.body.moves = true;
            if (e && e.anims) {
                if (e.type === 'fast') e.play('fast-enemy-run', true);
                else e.play('enemy-walk', true);
            }
        });
        this.orbs.forEach(o => { if (o) o.setVisible(true); });
        document.getElementById('upgrade-screen').style.display = 'none';
    }

    showUpgradeScreen() {
        const available = ['pierce', 'vampire', 'faster-fire-rate', 'more-speed', 'extra-hp'];
        if (!this.hasMagnet) available.push('orb-magnet');
        if (this.hasMagnet) available.push('stronger-magnet');

        // Hide vampire card if already selected
        if (this.hasVampire) {
            document.querySelector('[data-upgrade="vampire"]').style.display = 'none';
        }

        // Show multishot only if multishotLevel < 3
        if (this.multishotLevel < 3) {
            available.push('multishot');
        }

        // Show wider-spread only if multishotLevel >= 3 && spreadAngle < 60
        if (this.multishotLevel >= 3 && this.spreadAngle < 60) {
            available.push('wider-spread');
        }

        // Show thorns only if thornsDamage < 100 (not maxed out)
        if (this.thornsDamage < 100) {
            available.push('thorns');
        } else {
            // Hide thorns card if maxed out
            document.querySelector('[data-upgrade="thorns"]').style.display = 'none';
        }

        // Show bigger-bullets only if bulletRadius < 25 (not maxed out)
        if (this.bulletRadius < 25) {
            available.push('bigger-bullets');
        } else {
            // Hide bigger-bullets card if maxed out
            document.querySelector('[data-upgrade="bigger-bullets"]').style.display = 'none';
        }

        // Shuffle and pick 4
        const shuffled = available.sort(() => Math.random() - 0.5).slice(0, 4);

        // Show only selected cards
        document.querySelectorAll('.upgrade-card').forEach(card => {
            card.style.display = shuffled.includes(card.dataset.upgrade) ? 'block' : 'none';
        });

        document.getElementById('upgrade-screen').style.display = 'flex';
    }

    handleUpgradeClick(upgradeType) {
        // Apply the upgrade
        switch (upgradeType) {
            case 'pierce':
                this.piercePower++;
                break;
            case 'multishot':
                this.multishotLevel++;
                break;
            case 'vampire':
                this.hasVampire = true;
                // Hide vampire card after selection (one-time upgrade)
                document.querySelector('[data-upgrade="vampire"]').style.display = 'none';
                break;
            case 'faster-fire-rate':
                this.fireRate = Math.max(200, this.fireRate - 200);
                this.shootTimer.remove();
                this.shootTimer = this.time.addEvent({
                    delay: this.fireRate,
                    callback: this.autoAttack,
                    callbackScope: this,
                    loop: true
                });
                break;
            case 'more-speed':
                this.playerSpeed += 20;
                break;
            case 'extra-hp':
                this.maxHealth += 25;
                this.playerHealth = Math.min(this.maxHealth, this.playerHealth + 25);
                this.updateUI();
                break;
            case 'orb-magnet':
                this.hasMagnet = true;
                // Swap cards: hide Orb Magnet, show Stronger Magnet
                document.querySelector('[data-upgrade="orb-magnet"]').style.display = 'none';
                document.querySelector('[data-upgrade="stronger-magnet"]').style.display = 'block';
                break;
            case 'stronger-magnet':
                this.magnetSpeed += 50;
                break;
            case 'wider-spread':
                this.spreadAngle += 15;
                break;
            case 'thorns':
                // Thorns upgrade progression: level 1 = 20, level 2 = +30 (total 50), level 3 = +50 (total 100)
                if (this.thornsDamage === 0) {
                    this.thornsDamage = 20; // Level 1
                } else if (this.thornsDamage === 20) {
                    this.thornsDamage = 50; // Level 2 (20 + 30)
                } else if (this.thornsDamage === 50) {
                    this.thornsDamage = 100; // Level 3 (50 + 50)
                }
                break;
            case 'bigger-bullets':
                this.bulletRadius = Math.min(25, this.bulletRadius + 5);
                break;
        }
    }

    updateUI() {
        // Update level text
        this.levelText.setText('Level: ' + this.level);
        
        // Update DOM level display
        const levelDisplay = document.getElementById('hud-level');
        if (levelDisplay) {
            levelDisplay.textContent = 'LVL ' + this.level;
        }
        
        // Update DOM XP bar
        const xpBar = document.getElementById('xp-bar');
        if (xpBar) {
            const progress = Math.max(0, Math.min(1, this.xp / this.xpForNextLevel));
            xpBar.style.width = (progress * 100) + '%';
        }
        
        // Update DOM HP bar
        const hpBar = document.getElementById('hp-bar');
        if (hpBar) {
            const healthPercent = Math.max(0, Math.min(1, this.playerHealth / this.maxHealth));
            hpBar.style.width = (healthPercent * 100) + '%';
        }
    }

    takeDamage(amount) {
        if (this.playerHealth <= 0) return;
        // Deal damage
        this.playerHealth -= amount;
        if (this.playerHealth <= 0) {
            this.playerHealth = 0;
            this.gameOver();
        }
        this.updateUI();
        
        // Flash red screen on damage
        const flash = document.getElementById('damage-flash');
        if (flash) {
            flash.style.opacity = '1';
            setTimeout(() => { flash.style.opacity = '0'; }, 100);
        }
    }

    resetUpgradeCards() {
        document.querySelector('[data-upgrade="orb-magnet"]').style.display = 'block';
        document.querySelector('[data-upgrade="stronger-magnet"]').style.display = 'none';
    }

    startSurvivalTimer() {
        // Update time display every second
        this.timeTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateSurvivalTime,
            callbackScope: this,
            loop: true
        });
        
        // Update initial time display
        this.updateSurvivalTime();
    }

    updateSurvivalTime() {
        this.survivalTime++;
        const minutes = Math.floor(this.survivalTime / 60);
        const seconds = this.survivalTime % 60;
        const timeDisplay = document.getElementById('hud-time');
        if (timeDisplay) {
            timeDisplay.textContent = `TIME: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    flashDamage() {
        const flash = document.getElementById('damage-flash');
        if (flash) {
            flash.style.opacity = '1';
            setTimeout(() => {
                flash.style.opacity = '0';
            }, 300);
        }
    }

    gameOver() {
        try {
            this.upgradeScreenOpen = false;
            this.spawnTimer.paused = true;
            this.shootTimer.paused = true;
            this.timeTimer.paused = true;
            this.player.body.moves = false;
            this.enemies.forEach(e => { if (e && e.body) e.body.moves = false; });
            const minutes = Math.floor(this.survivalTime / 60);
            const seconds = this.survivalTime % 60;
            document.getElementById('game-over-time').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            document.getElementById('game-over-screen').style.display = 'flex';
            
            // Add restart button click listener
            document.getElementById('restart-button').addEventListener('click', () => {
                document.getElementById('game-over-screen').style.display = 'none';
                this.scene.restart();
            }, { once: true });
        } catch(err) {
            console.error('gameOver error:', err);
        }
    }

    showGameOverScreen() {
        // Show DOM game over screen
        const gameOverScreen = document.getElementById('game-over-screen');
        const gameOverTime = document.getElementById('game-over-time');
        const restartButton = document.getElementById('restart-button');
        
        if (gameOverScreen && gameOverTime && restartButton) {
            // Calculate final time
            const minutes = Math.floor(this.survivalTime / 60);
            const seconds = this.survivalTime % 60;
            const finalTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Update time display
            gameOverTime.textContent = `Time: ${finalTime}`;
            
            // Show screen
            gameOverScreen.style.display = 'flex';
            
            // Add restart button click handler with one-time listener
            restartButton.addEventListener('click', () => {
                // Immediately hide game over screen
                gameOverScreen.style.display = 'none';
                // Restart the scene
                this.scene.restart();
            }, { once: true });
        }
    }

}

export default GameScene;