class RulesScene extends Phaser.Scene {
    constructor() {
        super('rules')
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
        var rulesTitle = this.add.text(340, 50, 'RULES', { fontFamily: 'Arial', fontSize: 30, color: 0xffffff, strokeThickness: 2, stroke: 0xff00ff }) 
        this.make.text({
            x: 130,
            y: 100,
            text: 'Objective: Empty your hand of cards.\n\n'
            + "     On your turn, you can play up to 3 cards such that their sum ends " 
            + "in the same number as the card on top of the pile. \n"
            + "     For example Ace + Queen + 10 = 1 + 12 + 10 = 23 -> ends in 3.\n"
            + "     To play cards, you can click on your cards in your hand to choose "
            + "and then either click the play button or the pile to play them.\n"
            + "     You can draw up to 3 cards on your turn by clicking "
            + "the deck on the right. After that, if you can't find any cards "
            + "to play, you can click on the skip button to pass the turn.\n"
            + "     If the deck is blue, it means it's your turn. If the deck is "
            + "red and the skip button is not visible, it is the opponents turn.",
            origin: { x: 0, y: 0 },
            style: {
                font: 'bold 20px Arial',
                fill: "black",
                wordWrap: { width: 555 }
            }
        })
        
        backButton.on('pointerup', () => {
            this.scene.start('title')
        })
    }
}