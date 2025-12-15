import Phaser from 'phaser';
import SocketManager from '../SocketManager';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.cursors = null;
        this.player = null;
        this.networkEntities = {};
        this.connected = false;
    }

    preload() {
        this.load.tilemapTiledJSON('map', '/assets/Proximity-embedded.tmj');
        
        const tilesets = [
            'WA_Decoration', 'WA_Exterior', 'WA_Miscellaneous', 
            'WA_Other_Furniture', 'WA_Room_Builder', 'WA_Seats', 
            'WA_Tables', 'tileset1-repositioning', 'tileset1', 'tileset6_export'
        ];

        tilesets.forEach(ts => {
            this.load.image(ts, `/assets/${ts}.png`);
        });

        // Load user's avatar spritesheet (3 columns x 4 rows, 32x32 each frame)
        // Row order: down, left, right, up (3 frames each)
        this.load.spritesheet('avatar', '/assets/Male 01-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
    }

    create() {
        this.createMap();
        this.createAnimations();
        this.createPlayer(); // Offline spawn
        
        // Connect to IO
        SocketManager.connect();
        this.setupSocketListeners();
        
        // Camera Zoom (Mouse Wheel) - FIXED DIRECTION
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Scroll UP (negative deltaY) = zoom IN, Scroll DOWN (positive deltaY) = zoom OUT
            // Using deltaY instead of deltaZ for better cross-browser support
            let zoomDelta = 0;
            if (deltaY < 0) {
                zoomDelta = 0.25; // Scroll up = zoom in
            } else if (deltaY > 0) {
                zoomDelta = -0.25; // Scroll down = zoom out
            }
            const newZoom = this.cameras.main.zoom + zoomDelta;
            this.cameras.main.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 4));
        });
    }

    createMap() {
        this.map = this.make.tilemap({ key: 'map' });
        const tilesetObjects = [];
        this.map.tilesets.forEach(ts => {
            if (this.textures.exists(ts.name)) {
                tilesetObjects.push(this.map.addTilesetImage(ts.name, ts.name));
            } else {
                console.warn(`Tileset image not found for: ${ts.name}`);
            }
        });

        const layers = ['Ground', 'Walls', 'Objects', 'Decoratives', 'Collide'];
        this.createdLayers = {};

        layers.forEach(layerName => {
            const layer = this.map.createLayer(layerName, tilesetObjects, 0, 0);
            if (layer) {
                this.createdLayers[layerName] = layer;
                
                // Enable collision on Walls layer (visible walls)
                if (layerName === 'Walls') {
                    layer.setCollisionByExclusion([-1, 0]);
                }
                
                // Enable collision on Collide layer (invisible collision shapes)
                if (layerName === 'Collide') {
                    layer.setCollisionByExclusion([-1, 0]);
                    layer.setVisible(false);
                }
            }
        });

        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    }

    createAnimations() {
        if (this.anims.exists('walk-down')) return;
        
        const anims = this.anims;
        
        // 3 columns x 4 rows spritesheet
        // Row 0 (frames 0-2): walk down
        // Row 1 (frames 3-5): walk left  
        // Row 2 (frames 6-8): walk right
        // Row 3 (frames 9-11): walk up
        
        anims.create({
            key: 'walk-down',
            frames: anims.generateFrameNumbers('avatar', { start: 0, end: 2 }),
            frameRate: 8,
            repeat: -1
        });
        anims.create({
            key: 'walk-left',
            frames: anims.generateFrameNumbers('avatar', { start: 3, end: 5 }),
            frameRate: 8,
            repeat: -1
        });
        anims.create({
            key: 'walk-right',
            frames: anims.generateFrameNumbers('avatar', { start: 6, end: 8 }),
            frameRate: 8,
            repeat: -1
        });
        anims.create({
            key: 'walk-up',
            frames: anims.generateFrameNumbers('avatar', { start: 9, end: 11 }),
            frameRate: 8,
            repeat: -1
        });
    }

    createPlayer(playerInfo) {
        if (this.player) return;

        const startX = playerInfo ? playerInfo.x : 400; // Default spawn
        const startY = playerInfo ? playerInfo.y : 300;

        this.player = this.physics.add.sprite(startX, startY, 'avatar');
        this.player.setDepth(10); // FIX: Ensure on top
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(16, 16);
        this.player.body.setOffset(8, 16);

        if (this.createdLayers['Collide']) this.physics.add.collider(this.player, this.createdLayers['Collide']);
        if (this.createdLayers['Walls']) this.physics.add.collider(this.player, this.createdLayers['Walls']);

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(2);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
    }

    addOtherPlayer(playerInfo) {
        if (this.networkEntities[playerInfo.playerId]) return;

        const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'avatar');
        otherPlayer.setOrigin(0.5, 0.5);
        otherPlayer.playerId = playerInfo.playerId;
        otherPlayer.setDepth(10);
        this.networkEntities[playerInfo.playerId] = otherPlayer;
    }

    setupSocketListeners() {
        SocketManager.onCurrentPlayers((players) => {
            Object.keys(players).forEach((id) => {
                if (players[id].playerId === SocketManager.socket.id) {
                    if (this.player) this.player.playerId = id;
                } else {
                    this.addOtherPlayer(players[id]);
                }
            });
        });

        SocketManager.onNewPlayer((playerInfo) => {
            this.addOtherPlayer(playerInfo);
        });

        SocketManager.onPlayerDisconnected((playerId) => {
            if (this.networkEntities[playerId]) {
                this.networkEntities[playerId].destroy();
                delete this.networkEntities[playerId];
            }
        });

        SocketManager.onPlayerMoved((playerInfo) => {
            const otherPlayer = this.networkEntities[playerInfo.playerId];
            if (otherPlayer) {
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                if (playerInfo.anim) {
                    otherPlayer.anims.play(playerInfo.anim, true);
                } else {
                    otherPlayer.anims.stop();
                }
            }
        });
    }

    update(time, delta) {
        if (!this.player) return;
        this.handleMovement();
        this.checkProximity();
    }

    handleMovement() {
        const speed = 150;
        this.player.setVelocity(0);
        
        let moved = false;
        let direction = '';
        
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.anims.play('walk-left', true);
            direction = 'left';
            moved = true;
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.anims.play('walk-right', true);
            direction = 'right';
            moved = true;
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            this.player.setVelocityY(-speed);
            this.player.anims.play('walk-up', true);
            direction = 'up';
            moved = true;
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            this.player.setVelocityY(speed);
            this.player.anims.play('walk-down', true);
            direction = 'down';
            moved = true;
        }

        this.player.body.velocity.normalize().scale(speed);

        if (!moved) {
            this.player.anims.stop();
        }

        const x = this.player.x;
        const y = this.player.y;
        
        if (this.player.oldPosition && (x !== this.player.oldPosition.x || y !== this.player.oldPosition.y)) {
            SocketManager.emitMove(x, y, direction);
        }
        
        this.player.oldPosition = { x: this.player.x, y: this.player.y, direction: direction };
    }

    checkProximity() {
        const threshold = 100;
        const nearbyPlayers = [];

        Object.keys(this.networkEntities).forEach(id => {
            const other = this.networkEntities[id];
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, other.x, other.y);
            
            if (dist < threshold) {
                nearbyPlayers.push(id);
            }
        });

        window.dispatchEvent(new CustomEvent('proximity-update', { detail: nearbyPlayers }));
    }
}
