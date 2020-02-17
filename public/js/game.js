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
    scene: {
        preload: preload,
        create: create,
        update: update
    }
}

var game = new Phaser.Game(config)

game.deck = []
game.hand = []
game.opponentHand = []
game.pile = []
game.selected = []
const handPosY = 500
const pilePosX = 300
const pilePosY = 280

function preload() {
    for (var i = 1; i < 53; i++) {
        this.load.image('card' +i, 'assets/' + i + '.png')
    }
    this.load.image('deck', 'assets/blue.png')
}

function create() {
    var scene = this
    game.socket = io()
    game.socket.on('cards', function (hand, pile) {
        for (var handCard of hand) {
            let card = newCard(handCard, 900, handPosY, scene)
            game.hand.push(card)
        }
        for (var pileCard of pile) {
            let card = newCard(pileCard, pilePosX, pilePosY, scene)
            game.pile.push(card)
        }
    })
    
    game.socket.on('drawnCard', function (drawnCard) {
        let card = newCard(drawnCard, 900, handPosY, scene)
        game.hand.push(card)
    })
    
    game.socket.on('deckEmpty', function () {
        console.log('Deck is empty')
    })
    
    game.socket.on('playedCards', function (pile) {
        game.pile = []
        for (let pileCard of pile) {
            var card = newCard(pileCard, pilePosX, pilePosY, scene)
            card.setInteractive()
            game.pile.push(card)
        }
    })
    
    game.socket.on('playerCardCounts', function (playerCardCounts) {
        for (var [player, count] of Object.entries(playerCardCounts)) {
            if (game.socket.id != player) {
                // TODO Destroy instead of move out of sight
                for (let card of game.opponentHand) {
                    card.x = 5000
                    card.y = 5000
                }
                game.opponentHand = []
                for (let i = 0; i < count; i++) {
                    let card = scene.add.image(48, 100, 'deck')
                    game.opponentHand.push(card)
                }
            }
        }
    })
    
    game.socket.on('playSuccess', function () {
        game.selected.forEach(card => {
            const indexOfCard = game.hand.indexOf(card)
            game.hand.splice(indexOfCard, 1)
            card.destroy()
        })
        game.selected = []
    })
    
    var drawCardButton = this.add.image(690, 280, 'deck')
    drawCardButton.setInteractive()
    
    this.input.on('pointerover', function (pointer, gameObject)
    {           
        gameObject[0].emit('hovered', gameObject[0])
    }, this)
    
    this.input.on('pointerout', function (pointer, gameObject) {
        gameObject[0].emit('hoveredout', gameObject[0])
    }, this)
    
    // When clicking any object
    this.input.on('pointerup', function (pointer, gameObject) {
        if (!gameObject[0]) return
        gameObject[0].emit('clicked', gameObject[0])
    }, this)
    
    // When clicking draw button
    drawCardButton.on('pointerup', function (pointer) {
        game.socket.emit('drawCard')
    }, this)
}

function update() {
    var handPosX = 48
    const handMinX = 32
    var handAdd = Math.min(handMinX, 800 / game.hand.length ? 720 / game.hand.length : handMinX * 2)
    for(let i = 0; i < game.hand.length; i++) {        
        let card = game.hand[i]
        card.setDepth(i)
        card.x = handPosX
        handPosX += handAdd
    }
    var oppHandPosX = 48
    const oppHandMinX = 32
    for (let i = 0; i < game.opponentHand.length; i++) {
        let card = game.opponentHand[i]
        card.setDepth(i)
        card.x = oppHandPosX
        oppHandPosX += handAdd
    }
    
    if (game.pile.length) {
        for(let i = 0; i < game.pile.length; i++) {        
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
    if (game.hand.includes(card) && !game.selected.includes(card)) {
        card.y = handPosY - move
    }
}

function hoverOutHandler (card) {
    if (game.hand.includes(card) && !game.selected.includes(card)) {
        card.y = handPosY
    }
}

function clickHandler (card) {
    if (game.hand.includes(card)) {
        if (game.selected.includes(card)) {
            const index = game.selected.indexOf(card)
            if (index > -1) {
                game.selected.splice(index, 1)
                card.y = handPosY
            }
        } else {
            if (game.selected.length > 2) return
            console.log('added ' + card.name + ' with value ' + card.value)
            game.selected.push(card)
            card.y = handPosY - move
        }
    } else {
        if (game.selected.length) {
            let cardsToEmit = []
            game.selected.forEach(card => {
                cardsToEmit.push({name: card.name, value: card.value})
            })
            game.socket.emit('playCards', cardsToEmit)
        }
    }
}

function newCard (givenCard, posX, posY, scene) {
    let card = scene.physics.add.image(posX, posY, 'card'+givenCard.name)
    card.name = givenCard.name
    card.value = givenCard.value
    card.setInteractive()
    card.on('hovered', hoverOverHandler)
    card.on('hoveredout', hoverOutHandler, this)
    card.on('clicked', clickHandler, this)
    
    return card
}
