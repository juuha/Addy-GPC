var config = {
    type: Phaser.AUTO,
    parent: 'Addy-game',
    width: 800,
    height: 600,
    backgroundColor: 0x90EE90,
    physics: {
        default: 'arcade',
        arcade: {
            debug: true
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
}

var game = new Phaser.Game(config)

game.deck = []
game.hand = []
game.pile = []
game.selected = []
const posY = 500
const pilePosX = 300
const pilePosY = 280

function preload() {
    for (var i = 1; i < 53; i++) {
        this.load.image('card' +i, 'assets/' + i + '.png')
    }
    this.load.image('deck', 'assets/blue.png')
    this.load.image('button', 'assets/red.png')
}

function create() {
    var self = this
    this.socket = io()
    
    for (var i = 1; i < 53; i++) {
        var x = Phaser.Math.Between(50, 750)
        var y = Phaser.Math.Between(50, 550)
        var card = this.add.image(900, posY, 'card'+i)
        card.name = "Card: " + i
        card.value = i % 13
        card.value = card.value == 0 ? 13 : card.value
        //console.log(card.value)
        card.setInteractive()
        card.on('hovered', hoverOverHandler, this)
        card.on('hoveredout', hoverOutHandler, this)
        card.on('clicked', clickHandler, this)
        //this.physics.add.collider(card)
        game.deck.push(card)
    }
    game.deck = shuffle(game.deck)
    game.pile.push(game.deck.pop())
    for (var i = 0; i < 7; i++) {
        game.hand.push(game.deck.pop())
    }
    
    var drawButton = this.add.image(690, 280, 'deck')
    drawButton.setInteractive()
    
    var playButton = this.add.image(690, 380, 'button')
    playButton.setInteractive()
    
    this.input.on('pointerover', function (pointer, gameObject)
    {           
        gameObject[0].emit('hovered', gameObject[0])
    }, this)
    
    this.input.on('pointerout', function (pointer, gameObject) {
        gameObject[0].emit('hoveredout', gameObject[0])
    }, this)
    
    this.input.on('pointerup', function (pointer, gameObject) {
        if (!gameObject[0]) return
        gameObject[0].emit('clicked', gameObject[0])
    }, this)
    
    drawButton.on('pointerup', function (pointer) {
        if (game.deck.length > 0) {
            var card = game.deck.pop()
            //console.log(card.name)
            game.hand.push(card)
        } else {
            console.log('deck empty')
        }
    }, this)
    
    playButton.on('pointerup', function (pointer) {
        if (game.selected.length) {
            var sum = 0
            game.selected.forEach(card => {
                sum += card.value
            })
            if (sum % 10 === game.pile[game.pile.length - 1].value % 10) {
                game.selected.forEach(card => {
                    card.y = pilePosY
                    card.x = pilePosX
                    game.pile.push(card)
                    const indexHand = game.hand.indexOf(card)
                    game.hand.splice(indexHand, 1)
                })
                game.selected = []
                
            } else {
                console.log('sum:' +sum)
                console.log('topcard:' + game.pile[game.pile.length - 1].value)
                console.log('wrong sum')
            }
        }
    })
}

var cardsInHand = 7
var won = 0

function update() {
    if (cardsInHand != game.hand.length) {
        console.log('cards in hand: ' + game.hand.length)
        cardsInHand = game.hand.length        
    }
    if (game.hand.length == 0 && won == 0) {
        console.log('you win!')
        won = 1
    }
    var handPosX = 48
    const handMinX = 32
    var handAdd = Math.min(handMinX, 800 / game.hand.length ? 720 / game.hand.length : handMinX * 2)
    for(var i = 0; i < game.hand.length; i++) {        
        let card = game.hand[i]
        card.setDepth(i)
        card.x = handPosX
        handPosX += handAdd
    }

    if (game.pile.length) {
        for(var i = 0; i < game.pile.length; i++) {        
            let pileCard = game.pile[i]
            pileCard.setDepth(i)
            pileCard.x = pilePosX
            pileCard.y = pilePosY
        }
    }
    
    //game.input.activePointer.dirty = true
}

var move = 30

function hoverOverHandler (card) {
    //console.log(card.name)
    if (!game.selected.includes(card) || game.deck.includes(card)) {
        card.y = posY - move
    }
}

function hoverOutHandler (card) {
    //console.log(card.name)
    if (!game.selected.includes(card) || game.deck.includes(card)) {
        card.y = posY
    }
}

function clickHandler (card) {
    if (game.selected.includes(card)) {
        const index = game.selected.indexOf(card)
        if (index > -1) {
            game.selected.splice(index, 1)
            card.y = posY
        }
    } else {
        if (game.selected.length > 2) return
        console.log('added ' + card.name + ' with value ' + card.value)
        game.selected.push(card)
        card.y = posY - move
    }
}

function shuffle (deck) {
    for (let i = deck.length -1; i > 0; i--) {
        const j = Math.floor(Math.random() * i)
        const temp = deck[i]
        deck[i] = deck[j]
        deck[j] = temp
    }
    return deck
}
