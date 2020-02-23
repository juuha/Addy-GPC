class LobbyScene extends Phaser.Scene {
    constructor() {
        super('lobby')
        this.graphics
    }

    preload() {
        this.load.image('button', '/assets/button.png')
    }

    create() {
        this.graphics = this.add.graphics()
        this.graphics.fillStyle(0xd1edd8, 1)
        this.graphics.fillRoundedRect(115, 25, 570, 550, 20)
        var backButton = this.add.image(0, 0, 'button').setInteractive({ useHandCursor: true })
        var backButtonText = this.add.text(-55, -13, '<-- BACK', {fontFamily: 'Arial', fontSize: 25})
        var backButtonContainer = this.add.container(200, 60, [backButton, backButtonText])
        this.graphics.fillStyle(0x58ed7d, 1)
        this.graphics.fillRoundedRect(135, 100, 530, 60, 20)
        var joinButton = this.add.image(7, 7, 'button').setOrigin(0,0)
        var joinContainer = this.add.container(135, 100, [joinButton])

        backButton.on('pointerup', () => {
            this.scene.start('title')
        })
    }
}