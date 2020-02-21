class TitleScene extends Phaser.Scene {
    constructor() {
        super('title')
        this.graphics
    }

    preload() {
        this.load.image('logo', '/assets/logo.png')
        this.load.image('button', '/assets/button.png')
    }
    
    create() {        
        this.graphics = this.add.graphics()
        this.graphics.fillStyle(0xd1edd8, 1)
        this.graphics.fillRoundedRect(115, 25, 570, 550, 20)
        this.graphics.fillStyle(0x29b34b, 1)
        this.graphics.fillRoundedRect(200, 55, 400, 160)
        this.add.image(400, 135, 'logo')

        var start = this.add.image(0,0, 'button').setOrigin(0,0)
        var startText = this.add.text(30, 10, 'START', {fontFamily: 'Arial', fontSize: 25})
        var rules = this.add.image(0, 55, 'button').setOrigin(0,0)
        var rulesText = this.add.text(30, 65, 'RULES', {fontFamily: 'Arial', fontSize: 25})
        var settings = this.add.image(0, 110, 'button').setOrigin(0,0)
        var settingsText = this.add.text(10, 120, 'SETTINGS', {fontFamily: 'Arial', fontSize: 25})
        var container = this.add.container(320, 260, [start, startText, rules, rulesText, settings, settingsText])
        start.setInteractive({ useHandCursor: true })
        rules.setInteractive({ useHandCursor: true })
        settings.setInteractive({ useHandCursor: true })

        start.on('pointerup', () => {
            this.scene.start('gameboard')
        })
    }
}
