import Phaser from 'phaser';
import SocketManager from '../SocketManager';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.cursors = null;
        this.player = null;
        this.playerNameText = null;
        this.networkEntities = {};
        this.connected = false;
        this.playerName = '';
        this.avatarFile = '';
        this.roomZones = []; // Trigger zones for rooms
        this.currentRoom = null; // Current room player is in
        this.inKanbanZone = false; // Track if player is near whiteboard

        // Whiteboard zone coordinates (center area with whiteboard)
        this.whiteboardZone = {
            x: 540,
            y: 100,
            width: 80,
            height: 80
        };
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

        // Get player data from React
        const playerData = window.PLAYER_DATA || { name: 'Player', avatarFile: 'Male 01-1.png' };
        this.playerName = playerData.name;
        this.avatarFile = playerData.avatarFile;

        // Load ALL avatar spritesheets so other players' avatars show correctly
        const allAvatars = [
            'Male 01-1.png',
            'Male 02-3.png',
            'Male 03-1.png',
            'Male 04-4.png',
            'Male 08-1.png',
            'su1 Student male 06.png',
            'su2 Student fmale 10.png'
        ];

        allAvatars.forEach(avatarFile => {
            // Use avatar filename (without extension) as key
            const key = avatarFile.replace('.png', '');
            this.load.spritesheet(key, `/assets/${avatarFile}`, {
                frameWidth: 32,
                frameHeight: 32
            });
        });

        // Also load with 'avatar' key for current player backwards compatibility
        this.load.spritesheet('avatar', `/assets/${this.avatarFile}`, {
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

        // Get room data if available
        const roomData = window.ROOM_DATA;

        // Emit player join with room code if available
        setTimeout(() => {
            if (roomData && roomData.roomCode) {
                SocketManager.emitJoinWithRoomCode(
                    this.playerName,
                    this.avatarFile,
                    roomData.roomCode
                );
            } else {
                SocketManager.emitJoin(this.playerName, this.avatarFile);
            }
        }, 500);

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

        // Load Trigger zones (conference_room, Meeting_Room, etc.)
        const triggersLayer = this.map.getObjectLayer('Triggers');
        if (triggersLayer && triggersLayer.objects) {
            this.roomZones = triggersLayer.objects.map(obj => ({
                name: obj.name,
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height
            }));
            console.log('✅ Loaded room zones:', this.roomZones.map(z => z.name));
        }

        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    }

    createAnimations() {
        if (this.anims.exists('avatar-walk-down')) return;

        const anims = this.anims;

        // All available avatar keys
        const avatarKeys = [
            'avatar', // fallback
            'Male 01-1',
            'Male 02-3',
            'Male 03-1',
            'Male 04-4',
            'Male 08-1',
            'su1 Student male 06',
            'su2 Student fmale 10'
        ];

        // 3 columns x 4 rows spritesheet
        // Row 0 (frames 0-2): walk down
        // Row 1 (frames 3-5): walk left  
        // Row 2 (frames 6-8): walk right
        // Row 3 (frames 9-11): walk up

        avatarKeys.forEach(avatarKey => {
            if (!this.textures.exists(avatarKey)) return;

            anims.create({
                key: `${avatarKey}-walk-down`,
                frames: anims.generateFrameNumbers(avatarKey, { start: 0, end: 2 }),
                frameRate: 8,
                repeat: -1
            });
            anims.create({
                key: `${avatarKey}-walk-left`,
                frames: anims.generateFrameNumbers(avatarKey, { start: 3, end: 5 }),
                frameRate: 8,
                repeat: -1
            });
            anims.create({
                key: `${avatarKey}-walk-right`,
                frames: anims.generateFrameNumbers(avatarKey, { start: 6, end: 8 }),
                frameRate: 8,
                repeat: -1
            });
            anims.create({
                key: `${avatarKey}-walk-up`,
                frames: anims.generateFrameNumbers(avatarKey, { start: 9, end: 11 }),
                frameRate: 8,
                repeat: -1
            });
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

        // Create player name text above avatar
        this.playerNameText = this.add.text(startX, startY - 20, this.playerName, {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        });
        this.playerNameText.setOrigin(0.5, 1);
        this.playerNameText.setDepth(11);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
    }

    addOtherPlayer(playerInfo) {
        // Backend uses 'id' not 'playerId'
        const playerId = playerInfo.id || playerInfo.playerId;
        if (!playerId || this.networkEntities[playerId]) return;

        const startX = playerInfo.x || 400;
        const startY = playerInfo.y || 300;

        // Get the player's avatar - use their avatar or fallback to default
        let avatarKey = 'avatar'; // fallback
        if (playerInfo.avatar) {
            // Remove .png if present and use as key
            const key = playerInfo.avatar.replace('.png', '');
            if (this.textures.exists(key)) {
                avatarKey = key;
            }
        }

        const otherPlayer = this.add.sprite(startX, startY, avatarKey);
        otherPlayer.setOrigin(0.5, 0.5);
        otherPlayer.playerId = playerId;
        otherPlayer.avatarKey = avatarKey; // Store for animations
        otherPlayer.setDepth(10);

        // Add name text above other player (backend uses 'username' not 'name')
        const playerName = playerInfo.username || playerInfo.name || 'Player';
        const nameText = this.add.text(startX, startY - 18, playerName, {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ffff00', // Yellow for other players
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        });
        nameText.setOrigin(0.5, 1);
        nameText.setDepth(11);
        otherPlayer.nameText = nameText;

        this.networkEntities[playerId] = otherPlayer;
        console.log('Added other player:', playerId, playerName, 'avatar:', avatarKey);
    }

    setupSocketListeners() {
        SocketManager.onCurrentPlayers((players) => {
            console.log('Received current players:', players);
            // Backend sends object with socket id as key
            Object.keys(players).forEach((id) => {
                const playerData = players[id];
                // Skip ourselves
                if (id === SocketManager.socket?.id || playerData.id === SocketManager.socket?.id) {
                    if (this.player) this.player.playerId = id;
                } else {
                    this.addOtherPlayer(playerData);
                }
            });
        });

        SocketManager.onNewPlayer((playerInfo) => {
            console.log('New player joined:', playerInfo);
            // Skip if it's us
            if (playerInfo.id === SocketManager.socket?.id) return;
            this.addOtherPlayer(playerInfo);
        });

        SocketManager.onPlayerDisconnected((playerId) => {
            if (this.networkEntities[playerId]) {
                // Destroy name text too
                if (this.networkEntities[playerId].nameText) {
                    this.networkEntities[playerId].nameText.destroy();
                }
                this.networkEntities[playerId].destroy();
                delete this.networkEntities[playerId];
            }
        });

        SocketManager.onPlayerMoved((playerInfo) => {
            // Backend uses 'id' not 'playerId'
            const playerId = playerInfo.id || playerInfo.playerId;
            const otherPlayer = this.networkEntities[playerId];
            if (otherPlayer) {
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);

                // Update name text position
                if (otherPlayer.nameText) {
                    otherPlayer.nameText.setPosition(playerInfo.x, playerInfo.y - 18);
                }

                // Play animation based on direction using player's avatar key
                if (playerInfo.direction) {
                    const avatarKey = otherPlayer.avatarKey || 'avatar';
                    const animKey = `${avatarKey}-walk-${playerInfo.direction}`;
                    if (this.anims.exists(animKey)) {
                        otherPlayer.anims.play(animKey, true);
                    }
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
        this.checkRoomZone(); // Check if in meeting room
        this.checkKanbanZone(); // Check if near whiteboard

        // Update name position above player
        if (this.playerNameText) {
            this.playerNameText.setPosition(this.player.x, this.player.y - 18);
        }
    }

    handleMovement() {
        const speed = 150;
        this.player.setVelocity(0);

        let moved = false;
        let direction = '';

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.anims.play('avatar-walk-left', true);
            direction = 'left';
            moved = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.anims.play('avatar-walk-right', true);
            direction = 'right';
            moved = true;
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
            this.player.anims.play('avatar-walk-up', true);
            direction = 'up';
            moved = true;
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
            this.player.anims.play('avatar-walk-down', true);
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
            SocketManager.emitMove(x, y, direction, this.playerName);
        }

        this.player.oldPosition = { x: this.player.x, y: this.player.y, direction: direction };
    }

    checkProximity() {
        // 2 tiles = 32 pixels (each tile is 16x16)
        const threshold = 32;
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

    checkRoomZone() {
        const px = this.player.x;
        const py = this.player.y;

        // Find which room zone the player is in
        let inRoom = null;
        for (const zone of this.roomZones) {
            if (px >= zone.x && px <= zone.x + zone.width &&
                py >= zone.y && py <= zone.y + zone.height) {
                inRoom = zone.name;
                break;
            }
        }

        // Dispatch event if room changed
        if (inRoom !== this.currentRoom) {
            this.currentRoom = inRoom;
            console.log('🚪 Room changed:', inRoom || 'Outside');
            window.dispatchEvent(new CustomEvent('room-change', {
                detail: { room: inRoom }
            }));
        }
    }

    checkKanbanZone() {
        const px = this.player.x;
        const py = this.player.y;
        const zone = this.whiteboardZone;

        // Check if player is in whiteboard zone
        const inZone = px >= zone.x && px <= zone.x + zone.width &&
            py >= zone.y && py <= zone.y + zone.height;

        // Dispatch event if zone state changed
        if (inZone !== this.inKanbanZone) {
            this.inKanbanZone = inZone;
            console.log('📋 Kanban zone:', inZone ? 'ENTERED' : 'LEFT');
            window.dispatchEvent(new CustomEvent('kanban-zone-change', {
                detail: { inZone }
            }));
        }
    }
}
