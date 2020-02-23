const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io').listen(server)
const util = require('util')

app.use(express.static(__dirname + '/public'))

var rooms = {}
var players = {}
const maxPlayers = 2
var id = 0

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html')
})

io.on('connection', async function (socket) {
    console.log('A user connected with id: ' + socket.id)
    
    socket.on('startGame', function (isBot, isHard) {
        newSocket(socket, isBot, isHard)
    })
    
    socket.on('drawCard', function () {
        drawCard(socket)
    })
    
    socket.on('playCards', function (cards) {
        playCards(socket, cards)
    })
    
    socket.on('endTurn', function () {
        endTurn(socket)
        handleBotTurn(socket.id)
    })
    
    socket.on('disconnect', function () {
        disconnect(socket)
    })
    
})

server.listen(8081, function () {
    console.log(`Listening on ${server.address().port}`)
})

function shuffle (deck) {
    for (let i = deck.length -1; i > 0; i--) {
        const j = Math.floor(Math.random() * i)
        const temp = deck[i]
        deck[i] = deck[j]
        deck[j] = temp
    }
    return deck
}

function newSocket (socket, isBot, isHard) {
    var roomFound = 0
    if (!isBot) {
        for (var room of Object.values(rooms)) {
            if (room.joinable) {
                roomFound = 1
                let player = {id: socket.id}
                player.hand = []
                for (var j = 0; j < 7; j++) {
                    player.hand.push(room.deck.pop())
                }
                players[socket.id] = room.id
                room.players.push(player)
                socket.join(room.id)
                if (room.players.length == maxPlayers) {
                    room.joinable = false
                }
                let nextTurnPlayerId = room.players[room.turn].id
                io.to(room.id).emit('turnChange', nextTurnPlayerId)
                updateCardCount(room)
                socket.emit('cards', player.hand, room.pile)
                break
            }
        }
    }
    
    if (!roomFound) {
        let newRoom = {
            id: 0,
            joinable: true,
            turn: 0,
            drawn: 0,
            isBot: false,
            isHard: false,
            deck: [],
            pile: [],
            players: []
        }
        
        for (let i = 1; i < 53; i++) {
            let card = {}
            card.name = i
            card.value = i % 13
            card.value = card.value == 0 ? 13 : card.value
            newRoom.deck.push(card)
        }
        newRoom.deck = shuffle(newRoom.deck)
        newRoom.pile.push(newRoom.deck.pop())
        let newPlayer = {id: socket.id}
        newPlayer.hand = []
        for (let i = 0; i < 7; i++) {
            newPlayer.hand.push(newRoom.deck.pop())
        }
        newRoom.players.push(newPlayer)
        newRoom.id = id
        rooms[id] = newRoom
        socket.join(id)
        players[socket.id] = id
        
        if(isBot) {
            newRoom.isBot = true
            newRoom.joinable = false
            players[id] = id
            let botPlayer = {id: id}
            botPlayer.hand = []
            for (let i = 0; i < 7; i++) {
                botPlayer.hand.push(newRoom.deck.pop())
            }
            newRoom.players.push(botPlayer)
            if (isHard) {
                newRoom.isHard = true
            }
            updateCardCount(newRoom)
        }
        let nextTurnPlayerId = newRoom.players[newRoom.turn].id
        io.to(id).emit('turnChange', nextTurnPlayerId)
        socket.emit('cards', newPlayer.hand, newRoom.pile)
        id++
        
    }
    //console.log(util.inspect(rooms, false, null, true))
}

function disconnect(socket) {
    var room = rooms[players[socket.id]]
    if (!room) return
    room.joinable = true
    if (room.isBot) {
        room.players = []
    }
    for (var player of room.players) {
        if (player.id == socket.id) {
            let indexOfPlayer = room.players.indexOf(player)
            room.players.splice(indexOfPlayer, 1)
        }
    }
    if (!room.players.length) {
        delete rooms[room.id]
    }
    
    delete players[socket.id]
    
    console.log('user disconnected with id: ' + socket.id)
}

function drawCard (socket) {
    var room = rooms[players[socket.id]]
    if (room.players[room.turn].id != socket.id) return
    if (room.drawn >= 3) {
        socket.emit('drewThreeAlready')
        return
    }
    if (room.deck.length > 0) {
        let drawnCard = room.deck.pop()
        room.players.find(function (player) {
            return player.id == socket.id 
        }).hand.push(drawnCard)
        room.drawn++
        socket.emit('drawnCard', drawnCard, (room.drawn == 3))
        updateCardCount(room)
    } else if (shufflePileIntoDeck(room)) {
        let drawnCard = room.deck.pop()
        room.players.find(function (player) {
            return player.id == socket.id 
        }).hand.push(drawnCard)
        room.drawn++
        socket.emit('drawnCard', drawnCard, (room.drawn == 3))
        updateCardCount(room)
    } else {
        socket.emit('deckEmpty')
    }
}

function playCards (socket, cards) {
    var room = rooms[players[socket.id]]
    if (room.players[room.turn].id != socket.id) return
    var sum = 0
    cards.forEach(card => {
        sum += card.value
    })
    if (sum % 10 === room.pile[room.pile.length - 1].value % 10) {
        for (var card of cards) {
            room.pile.push(card)
            var indexOfPlayedCard = -1
            var player = room.players.find((player) => {
                return player.id == socket.id
            })
            for (var cardInHand of player.hand) {
                if (cardInHand.name == card.name) {
                    indexOfPlayedCard = player.hand.indexOf(cardInHand)
                }
            }
            if (indexOfPlayedCard >= 0) {
                player.hand.splice(indexOfPlayedCard, 1)
            }
        }
        socket.emit('playSuccess', cards)
        endTurn(socket)
        
        handleBotTurn(socket.id)
    }
}

function endTurn (socket) {
    var room = rooms[players[socket.id]]
    if (room.players[room.turn].id != socket.id) return
    room.turn++
    if (room.turn > room.players.length -1 ) {
        room.turn = 0
    }
    room.drawn = 0
    let nextTurnPlayerId = room.players[room.turn].id
    updateCardCount(room)
    io.to(room.id).emit('playedCards', room.pile)
    io.to(room.id).emit('turnChange', nextTurnPlayerId)
}

function updateCardCount (room) {
    var playerCardCounts = {}
    for (let player of room.players) {
        playerCardCounts[player.id] = player.hand.length
    }
    io.to(room.id).emit('playerCardCounts', playerCardCounts)
}

function handleBotTurn(socketId) {
    var room = rooms[players[socketId]]
    var done = false
    var gameEnded = checkGameEnd(room, socketId)
    if (!gameEnded && room.isBot) {
        let bot = room.players[room.turn]
        nextTurnPlayerId = room.players[room.turn].id
        for (var drawn = 0; drawn < 3; drawn++){
            if (room.isHard) {
                // hard bot order play order is 3 cards, 2 cards and finally 1 card
                switch(true) {
                    case checkThree(room, bot): {
                        endTurn({id: room.id})
                        done = true
                        break
                    }
                    case checkTwo(room, bot): {
                        endTurn({id: room.id})
                        done = true
                        break
                    }
                    case checkOne(room, bot): {
                        endTurn({id: room.id})
                        done = true
                        break
                    }
                    default: break
                }
                // easy bot order is 1 card, 2 cards and finally 3 cards
            } else {
                switch (true) {
                    case checkOne(room, bot): {
                        endTurn({id: room.id})
                        done = true
                        break
                    }
                    case checkTwo(room, bot): {
                        endTurn({id: room.id})
                        done = true
                        break
                    }
                    case checkThree(room, bot): {
                        endTurn({id: room.id})
                        done = true
                        break
                    }
                    default: break
                }
            }
            if (done) {
                break
            }
            if (drawn < 3) {
                if (room.deck.length > 0) {
                    bot.hand.push(room.deck.pop())
                } else if (shufflePileIntoDeck(room)){
                    bot.hand.push(room.deck.pop())
                } else {
                    endTurn({id: room.id})
                    break
                }
            }
        }
        endTurn({id: room.id})
        var gameEnded = checkGameEnd(room, room.id)
    }
    
}

function checkGameEnd (room, socketId) {
    if (room.players.find(function (player) {
        return player.id == socketId
    }).hand.length == 0) {
        io.to(room.id).emit('gameOver', socketId)
        return true
    }
    return false
}

function checkOne (room, bot) {
    //let bot = room.players[room.turn]
    let topCard = room.pile[room.pile.length -1]
    for (var i = 0; i < bot.hand.length -1; i++){
        if (topCard.value % 10 == bot.hand[i].value % 10) {
            room.pile.push(bot.hand[i])
            bot.hand.splice(i, 1)
            return true
        }
    }
    return false
}

function checkTwo (room, bot) {
    //let bot = room.players[room.turn]
    let topCard = room.pile[room.pile.length -1]
    if (bot.hand.length >= 2) {
        var sum = 0
        for (var i = 0; i < bot.hand.length - 1; i++) {
            for (var j = i+1; j < bot.hand.length; j++) {
                sum = 0
                sum += bot.hand[i].value
                sum += bot.hand[j].value
                if (topCard.value % 10 == sum % 10) {
                    room.pile.push(bot.hand[i])
                    room.pile.push(bot.hand[j])
                    bot.hand.splice(i, 1)
                    bot.hand.splice(j-1, 1)
                    return true
                }
            }
        }
    }
    return false
}

function checkThree (room, bot) {
    //let bot = room.players[room.turn]
    let topCard = room.pile[room.pile.length -1]
    if (bot.hand.length >= 3) {
        var sum = 0
        for(var i = 0; i < bot.hand.length - 2; i++) {
            for (var j = i+1; j < bot.hand.length -1; j++) {
                for (var k = j+1; k < bot.hand.length; k++) {
                    sum = 0
                    sum += bot.hand[i].value
                    sum += bot.hand[j].value
                    sum += bot.hand[k].value
                    if (topCard.value % 10 == sum % 10) {
                        room.pile.push(bot.hand[i])
                        room.pile.push(bot.hand[j])
                        room.pile.push(bot.hand[k])
                        bot.hand.splice(i, 1)
                        bot.hand.splice(j-1, 1)
                        bot.hand.splice(k-2, 1)
                        return true
                    }
                }
            }
        }
    }
    return false
}

function shufflePileIntoDeck(room) {
    if (room.pile.length > 1) {
        var pileTemp = room.pile.pop()
        while (room.pile.length > 0) {
            var card = room.pile.pop()
            room.deck.push(card)
        }
        room.deck = shuffle(room.deck)
        room.pile.push(pileTemp)
        return true
    }
    return false
}
