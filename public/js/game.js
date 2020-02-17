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

game.hand = []
game.opponentHand = []
game.pile = []
game.selected = []
game.turn = 0
const handPosY = 500
const pilePosX = 300
const pilePosY = 280
const move = 30 // How much the cards in hand should move when hovered over


function preload() {
    for (var i = 1; i < 53; i++) {
        this.load.image('card' +i, 'assets/' + i + '.png')
    }
    this.load.image('cardBack', 'assets/blue.png')
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
    var deck = this.add.image(690, 280, 'cardBack')
    deck.setInteractive()

    // Updates the game on whose turn it is
    // Called by server
    game.socket.on('turnChange', function (nextTurnPlayerId) {
        if (nextTurnPlayerId == game.socket.id) {
            game.turn = 1
        }
    })
    
    // Draws a card from the deck and places it in the hand
    // Called by server
    game.socket.on('drawnCard', function (drawnCard) {
        let card = newCard(drawnCard, 900, handPosY, scene)
        game.hand.push(card)
    })
    
    // Will inform player that there are no more cards in the deck
    // Called by server
    game.socket.on('deckEmpty', function () {
        // TODO add alert ingame
        console.log('Deck is empty')
    })

    // Will inform player they already drew 3 cards from the deck
    // Called by server
    game.socket.on('drewThreeAlready', function () {
        // TODO add alert ingame
        console.log('You already drew 3')
    })
    
    // Updates the pile to show recently played cards (currently only topmost)
    // after a player has played cards.
    // Called by server
    game.socket.on('playedCards', function (pile) {
        game.pile = []
        for (let pileCard of pile) {
            var card = newCard(pileCard, pilePosX, pilePosY, scene)
            card.setInteractive()
            game.pile.push(card)
        }
        
    })

    // Updates the cards in hand after a successful play
    // Called by server
    game.socket.on('playSuccess', function () {
        game.selected.forEach(card => {
            const indexOfCard = game.hand.indexOf(card)
            game.hand.splice(indexOfCard, 1)
            card.destroy()
        })
        game.selected = []
        game.turn = 0
    })
    
    // Updates card counts for other plyers
    // Called by server
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
                    let card = scene.add.image(48, 100, 'cardBack')
                    game.opponentHand.push(card)
                }
            }
        }
    })
    
    // Emits 'hovered' when a game object is hovered by the pointer
    this.input.on('pointerover', function (pointer, gameObject)
    {           
        gameObject[0].emit('hovered', gameObject[0])
    }, this)

    // Emits 'hoveredout' when a game object stops being hovered by the pointer
    this.input.on('pointerout', function (pointer, gameObject) {
        gameObject[0].emit('hoveredout', gameObject[0])
    }, this)
    
    // Emits 'clicked' when a game object is clicked
    // Won't emit if it is not the player's turn
    this.input.on('pointerup', function (pointer, gameObject) {
        if (!game.turn) return
        if (!gameObject[0]) return
        gameObject[0].emit('clicked', gameObject[0])
    }, this)
    
    // Emits 'drawCard' when clicking (up portion of click) the deck
    deck.on('pointerup', function (pointer) {
        if (!game.turn) return
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

// Handler for when 'hovered' event is emitted
// Moves the card in hand up, so it's easier to see
function hoverOverHandler (card) {
    if (game.hand.includes(card) && !game.selected.includes(card)) {
        card.y = handPosY - move
    }
}

// Handler for when 'hoveredout' event is emitted
// Moves the card back down to the regular level in hand
function hoverOutHandler (card) {
    if (game.hand.includes(card) && !game.selected.includes(card)) {
        card.y = handPosY
    }
}

// Handler for when either the deck or a card in hand is clicked
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

// Creates game object with properties relating to the givenCard
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
