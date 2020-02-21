const handPosY = 500
const pilePosX = 300
const pilePosY = 280
const deckPosX = 690
const deckPosY = 280
const move = 30 // How much the cards in hand should move when hovered over

class GameScene extends Phaser.Scene {
    constructor() {
        super('gameboard')
        this.hand = []
        this.opponentHand = []
        this.selected = []
        this.pile = []
        this.turn = 0
        this.deck
        this.skip
    }
    
    preload() {
        console.log('preloading')
        for (var i = 1; i < 53; i++) {
            this.load.image('card' +i, 'assets/' + i + '.png')
        }
        this.load.image('cardBack', 'assets/blue.png')
        this.load.image('cardBackRed', 'assets/red.png')
        this.load.image('skipButton', 'assets/skip.png')
    }
    
    create() {
        console.log('creating')
        var scene = this
        this.socket = io()
        this.socket.on('cards', (hand, pile) => {
            for (var handCard of hand) {
                let card = this.newCard(handCard, 900, handPosY, scene)
                this.hand.push(card)
            }
            for (var pileCard of pile) {
                let card = this.newCard(pileCard, pilePosX, pilePosY, scene)
                this.pile.push(card)
            }
        })
        this.deck = this.add.image(deckPosX, deckPosY, 'cardBackRed')
        this.deck.setInteractive()
        this.skip = this.add.image(deckPosX, deckPosY +90, 'skipButton')
        this.skip.setInteractive()
        this.skip.setVisible(false)
        
        // Updates the game on whose turn it is
        // Called by server
        this.socket.on('turnChange', (nextTurnPlayerId) => {
            if (nextTurnPlayerId == this.socket.id) {
                this.turn = 1
                this.deck.setTexture('cardBack')
            } else {
                this.turn = 0
                this.selected = []
                this.deck.setTexture('cardBackRed')
            }
        })
        
        // Draws a card from the deck and places it in the hand
        // Called by server
        this.socket.on('drawnCard', (drawnCard, drawnThree) => {
            const card = this.newCard(drawnCard, 900, handPosY, scene)
            this.hand.push(card)
            if (drawnThree) {
                this.deck.setTexture('cardBackRed')
                this.skip.setVisible(true)                
            }
        })
        
        // Will inform player that there are no more cards in the deck
        // Called by server
        this.socket.on('deckEmpty', () => {
            // TODO add alert ingame
            this.deck.setTexture('cardBackRed')
            console.log('Deck is empty')
        })
        
        // Will inform player they already drew 3 cards from the deck
        // Called by server
        this.socket.on('drewThreeAlready', () => {
            // TODO add alert ingame
            console.log('You already drew 3')
        })
        
        // Updates the pile to show recently played cards (currently only topmost)
        // after a player has played cards.
        // Called by server
        this.socket.on('playedCards', (newPile) => {
            this.pile = []
            for (let pileCard of newPile) {
                const card = this.newCard(pileCard, pilePosX, pilePosY, scene)
                card.setInteractive()
                this.pile.push(card)
            }
            
        })
        
        // Updates the cards in hand after a successful play
        // Called by server
        this.socket.on('playSuccess', () => {
            this.selected.forEach(card => {
                const indexOfCard = this.hand.indexOf(card)
                this.hand.splice(indexOfCard, 1)
                card.destroy()
            })
        })
        
        // Updates card counts for other plyers
        // Called by server
        this.socket.on('playerCardCounts', (playerCardCounts) => {
            for (var [player, count] of Object.entries(playerCardCounts)) {
                if (this.socket.id != player) {
                    // TODO Destroy instead of move out of sight
                    for (let card of this.opponentHand) {
                        card.x = 5000
                        card.y = 5000
                    }
                    this.opponentHand = []
                    for (let i = 0; i < count; i++) {
                        let card = scene.add.image(48, 100, 'cardBack')
                        this.opponentHand.push(card)
                    }
                }
            }
        })
        
        this.socket.on('gameOver', (socketId) => {
            // TODO add GAME OVER screen
            if (socketId == this.socket.id) {
                console.log('You win!')
            } else {
                console.log('You lose!')
            }
        })
        
        // Emits 'hovered' when a game object is hovered by the pointer
        this.input.on('pointerover', (pointer, gameObject) => {           
            gameObject[0].emit('hovered', gameObject[0])
        }, this)
        
        // Emits 'hoveredout' when a game object stops being hovered by the pointer
        this.input.on('pointerout', (pointer, gameObject) => {
            gameObject[0].emit('hoveredout', gameObject[0])
        }, this)
        
        // Emits 'clicked' when a game object is clicked
        // Won't emit if it is not the player's turn
        this.input.on('pointerup', (pointer, gameObject) => {
            if (!this.turn) return
            if (!gameObject[0]) return
            gameObject[0].emit('clicked', gameObject[0])
        }, this)
        
        // Emits 'drawCard' when clicking (up portion of click) the deck
        this.deck.on('pointerup', (pointer) => {
            if (!this.turn) return
            this.socket.emit('drawCard')
        }, this)
        
        this.skip.on('pointerup', (pointer) => {
            this.socket.emit('endTurn')
            this.skip.setVisible(false)
        })
    }
    
    update() {
        console.log('updating')
        var handPosX = 48
        const handMinX = 32
        var handAdd = Math.min(handMinX, 800 / this.hand.length ? 720 / this.hand.length : handMinX * 2)
        for(let i = 0; i < this.hand.length; i++) {        
            let card = this.hand[i]
            card.setDepth(i)
            card.x = handPosX
            handPosX += handAdd
        }
        var oppHandPosX = 48
        const oppHandMinX = 32
        var oppHandAdd = Math.min(oppHandMinX, 800 / this.opponentHand.length ? 720 / this.opponentHand.length : oppHandMinX * 2)
        for (let i = 0; i < this.opponentHand.length; i++) {
            let card = this.opponentHand[i]
            card.setDepth(i)
            card.x = oppHandPosX
            oppHandPosX += oppHandAdd
        }
        
        if (this.pile.length) {
            for(let i = 0; i < this.pile.length; i++) {        
                let pileCard = this.pile[i]
                pileCard.setDepth(i)
                pileCard.x = pilePosX
                pileCard.y = pilePosY
            }
        }
        
        //this.input.activePointer.dirty = true
    }
    // Handler for when 'hovered' event is emitted
    // Moves the card in hand up, so it's easier to see
    hoverOverHandler = (card) => {
        if (this.hand.includes(card) && !this.selected.includes(card)) {
            card.y = handPosY - move
        }
    }
    
    // Handler for when 'hoveredout' event is emitted
    // Moves the card back down to the regular level in hand
    hoverOutHandler = (card) => {
        if (this.hand.includes(card) && !this.selected.includes(card)) {
            card.y = handPosY
        }
    }
    
    // Handler for when either the deck or a card in hand is clicked
    clickHandler = (card) => {
        if (this.hand.includes(card)) {
            if (this.selected.includes(card)) {
                const index = this.selected.indexOf(card)
                if (index > -1) {
                    this.selected.splice(index, 1)
                    card.y = handPosY
                }
            } else {
                if (this.selected.length > 2) return
                console.log('added ' + card.name + ' with value ' + card.value)
                this.selected.push(card)
                card.y = handPosY - move
            }
        } else {
            if (this.selected.length) {
                let cardsToEmit = []
                this.selected.forEach(card => {
                    cardsToEmit.push({name: card.name, value: card.value})
                })
                this.socket.emit('playCards', cardsToEmit)
            }
        }
    }
    
    // Creates game object with properties relating to the givenCard
    newCard = (givenCard, posX, posY, scene) => {
        console.log('creating new card')
        let card = scene.physics.add.image(posX, posY, 'card'+givenCard.name)
        card.name = givenCard.name
        card.value = givenCard.value
        card.setInteractive()
        card.on('hovered', this.hoverOverHandler)
        card.on('hoveredout', this.hoverOutHandler, this)
        card.on('clicked', this.clickHandler, this)
        
        return card
    }
}

