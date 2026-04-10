// Currently handling logic in MainScene for simplicity.
// This file can be used for remote players later.
export default class Avatar {
    constructor(scene, x, y, spriteKey) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, spriteKey);
    }
}
