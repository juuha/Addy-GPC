const handY = 500
const pileX = 300
const pileY = 280
const deckX = 690
const deckY = 280
const playCardsButtonX = 100
const playCardsButtonY = 280
const move = 30 // How much the cards in hand should move when hovered over
const handMinX = 32

class GameScene extends Phaser.Scene {
    constructor() {
        super('gameboard')
        this.hand = []
        this.opponentHand = []
        this.selected = []
        this.pile = []
        this.turn = 0
    }
    
    preload() {
        console.log('preloading')
        for (var i = 1; i < 53; i++) {
            this.load.image('card' +i, 'assets/' + i + '.png')
        }
        this.load.image('cardBack', 'assets/blue.png')
        this.load.image('cardBackRed', 'assets/red.png')
        this.load.image('skipButton', 'assets/skip.png')
        this.load.image('playButton', 'assets/play.png')
        this.load.image('button', 'assets/button.png')
    }
    
    create() {
        console.log('creating')
        var scene = this
        this.socket = io()
        this.socket.emit('startGame', game.isBot, game.isHard)

        this.socket.on('cards', (hand, pile) => {
            for (var handCard of hand) {
                let card = this.newCard(handCard, 900, handY, scene)
                this.hand.push(card)
            }
            for (var pileCard of pile) {
                let card = this.newCard(pileCard, pileX, pileY, scene)
                this.pile.push(card)
            }
        })
        this.deck = this.add.image(deckX, deckY, 'cardBackRed')
        this.deck.setInteractive({ useHandCursor: true })
        this.skip = this.add.image(deckX, deckY +90, 'skipButton')
        this.skip.setInteractive({ useHandCursor: true })
        this.skip.setVisible(false)
        this.playCardsButton = this.add.image(playCardsButtonX, playCardsButtonY, 'playButton')
        this.playCardsButton.setInteractive({ useHandCursor: true })
        this.playCardsButton.setVisible(false)
        this.playCardsButton.setScale(0.1, 0.1)

        this.winScreen = this.add.graphics()
        this.winScreen.fillStyle(0xd1edd8, 1)
        this.winScreen.fillRoundedRect(0, 0, 570, 200, 20)
        this.winText = this.add.text(200, 20, { fontFamily: 'Arial', fontSize: 40, color: 0xffffff })
        this.winText.setFontFamily('Arial').setFontSize(40).setColor(0xffffff)

        this.restartButton = this.add.image(0, 0, 'button').setInteractive({ useHandCursor: true })
        this.restartButtonText = this.add.text(-55, -13,  'RESTART', { fontFamily: 'Arial', fontSize: 25 })
        this.restartCont = this.add.container(200, 120, [this.restartButton, this.restartButtonText])

        this.homeButton = this.add.image(0, 0, 'button').setInteractive({ useHandCursor: true }).setScale(1.2, 1)
        this.homeButtonText = this.add.text(-70, -13, 'MAIN MENU', { fontFamily: 'Arial', fontSize: 25 })
        this.homeButtonCont = this.add.container(400, 120, [this.homeButton, this.homeButtonText])

        this.winContainer = this.add.container(115, 140, [this.winScreen, this.winText, this.restartCont, this.homeButtonCont]).setDepth(500).setVisible(false)
        
        // Updates the game on whose turn it is
        // Called by server
        this.socket.on('turnChange', (nextTurnPlayerId) => {
            console.log('changing turn ' + nextTurnPlayerId)
            this.selected = []
            this.playCardsButton.setVisible(false)
            this.skip.setVisible(false)
            if (nextTurnPlayerId == this.socket.id) {
                this.turn = 1
                this.deck.setTexture('cardBack')
            } else {
                this.turn = 0
                this.deck.setTexture('cardBackRed')
            }
        })
        
        // Draws a card from the deck and places it in the hand
        // Called by server
        this.socket.on('drawnCard', (drawnCard, drawnThree) => {
            const card = this.newCard(drawnCard, deckX, deckY, scene)
            var addX = Math.min(32, 720 / (this.hand.length))
            var targetX = 48 + (this.hand.length) * addX
            card.setDepth(this.hand.length)
            this.physics.moveTo(card, targetX, 500, 0, 100)
            this.time.addEvent({delay: 100, callback: () => {
                card.body.stop()
                this.hand.push(card)
                card.x = targetX
                card.y = 500
            }, callbackScope: this})
            
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
                const card = this.newCard(pileCard, pileX, pileY, scene)
                card.setInteractive({ useHandCursor: true })
                this.pile.push(card)
            }
            
        })
        
        // Updates the cards in hand after a successful play
        // Called by server
        this.socket.on('playSuccess', () => {
            var depth = 1
            this.selected.forEach(card => {
                const indexOfCard = this.hand.indexOf(card)
                this.hand.splice(indexOfCard, 1)
                card.depth = this.pile.length + depth
                depth++
                this.physics.moveTo(card, pileX, pileY, 0, 100)
                this.time.addEvent({ delay: 100, callback: () => {
                    card.body.stop()
                    card.x = pileX
                    card.y = pileY
                    card.destroy()
                }, callbackScope: this })
            })
        })
        
        // Updates card counts for other plyers
        // Called by server
        this.socket.on('playerCardCounts', (playerCardCounts) => {
            for (var [player, count] of Object.entries(playerCardCounts)) {
                if (this.socket.id != player) {
                    for (let card of this.opponentHand) {
                        card.destroy()
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
                this.winText.setText('YOU WIN!')
                console.log('You win!')
            } else {
                this.winText.setText('YOU LOSE')
                console.log('You lose!')
            }
            this.winContainer.setVisible(true)
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
        
        this.playCardsButton.on('pointerup', (pointer) => {
            this.playCards()
        })

        this.homeButton.on('pointerup', (pointer) => {
            this.scene.start('title')
        })
        
        this.restartButton.on('pointerup', (pointer) => {
            while(this.pile.length > 0) {
                let card = this.pile.pop()
                card.destroy()
                console.log(this.pile)
            }
            while (this.hand.length > 0) {
                let card = this.hand.pop()
                card.destroy()
                console.log(this.hand)
            }
            while(this.opponentHand.length > 0) {
                let card = this.opponentHand.pop()
                card.destroy()
                console.log(this.opponentHand)
            }
            this.winContainer.setVisible(false)
            this.socket.emit('restart')
        })
    }
    
    update() {
        var handPosX = 48
        var handAdd = Math.min(handMinX, 720 / this.hand.length)
        for(let i = 0; i < this.hand.length; i++) {        
            let card = this.hand[i]
            card.setDepth(i)
            card.x = handPosX
            handPosX += handAdd
        }
        
        var oppHandPosX = 48
        var oppHandAdd = Math.min(handMinX, 720 / this.opponentHand.length)
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
                pileCard.x = pileX
                pileCard.y = pileY
            }
        }
        
        //this.input.activePointer.dirty = true
    }
    // Handler for when 'hovered' event is emitted
    // Moves the card in hand up, so it's easier to see
    hoverOverHandler = (card) => {
        if (this.hand.includes(card) && !this.selected.includes(card)) {
            card.y = handY - move
        }
    }
    
    // Handler for when 'hoveredout' event is emitted
    // Moves the card back down to the regular level in hand
    hoverOutHandler = (card) => {
        if (this.hand.includes(card) && !this.selected.includes(card)) {
            card.y = handY
        }
    }
    
    // Handler for when either the deck or a card in hand is clicked
    clickHandler = (card) => {
        if (this.hand.includes(card)) {
            if (this.selected.includes(card)) {
                const index = this.selected.indexOf(card)
                if (index > -1) {
                    this.selected.splice(index, 1)
                    card.y = handY
                }
            } else {
                if (this.selected.length > 2) return
                console.log('added ' + card.name + ' with value ' + card.value)
                this.selected.push(card)
                card.y = handY - move
            }
            this.canPlayCheck()
        } else {
            this.playCards()
        }
    }
    
    playCards = () => {
        if (this.selected.length) {
            let cardsToEmit = []
            this.selected.forEach(card => {
                cardsToEmit.push({name: card.name, value: card.value})
            })
            this.socket.emit('playCards', cardsToEmit)
        }
    }
    
    canPlayCheck = () => {
        var sum = 0
        for (var card of this.selected) {
            sum += card.value
        }
        if (sum % 10 == this.pile[this.pile.length -1].value % 10 && sum != 0) {
            this.playCardsButton.setVisible(true)
        } else {
            this.playCardsButton.setVisible(false)
        }
    }
    
    // Creates game object with properties relating to the givenCard
    newCard = (givenCard, posX, posY, scene) => {
        console.log('creating new card')
        let card = scene.physics.add.image(posX, posY, 'card'+givenCard.name)
        card.name = givenCard.name
        card.value = givenCard.value
        card.setInteractive({ useHandCursor: true })
        card.on('hovered', this.hoverOverHandler)
        card.on('hoveredout', this.hoverOutHandler, this)
        card.on('clicked', this.clickHandler, this)
        
        return card
    }
}

