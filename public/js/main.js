var config = {
    type: Phaser.AUTO,
    parent: 'Addy-game',
    width: 800,
    height: 600,
    backgroundColor: 0x90EE90,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [TitleScene, RulesScene, GameScene]
}

var game = new Phaser.Game(config)
