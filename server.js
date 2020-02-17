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
    newSocket(socket)
    
    socket.on('drawCard', function () {
        drawCard(socket)
    })
    
    socket.on('playCards', function (cards) {
        playCards(socket, cards)
    })
    
    socket.on('disconnect', function () {
        disconnect(socket)
    })
    console.log(util.inspect(rooms, false, null, true))
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

function newSocket (socket) {
    var roomFound = 0
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
                room.joinable = 0
            }
            updateCardCount(room)
            socket.emit('cards', player.hand, room.pile)
            break
        }
    }
    if (!roomFound) {
        let newRoom = {
            id: 0,
            joinable: 1,
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
        socket.emit('cards', newPlayer.hand, newRoom.pile)
        id++
    }
    console.log(util.inspect(rooms, false, null, true))
}

function disconnect(socket) {
    var room = rooms[players[socket.id]]
    room.joinable = 1
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
    console.log(util.inspect(rooms, false, null, true))
}

function drawCard (socket) {
    var room = rooms[players[socket.id]]
    if (room.deck.length > 0) {
        let drawnCard = room.deck.pop()
        room.players.find(function (player) {
            return player.id == socket.id 
        }).hand.push(drawnCard)
        socket.emit('drawnCard', drawnCard)
        updateCardCount(room)
    } else {
        socket.emit('deckEmpty')
    }
}

function playCards (socket, cards) {
    var room = rooms[players[socket.id]]
    var sum = 0
    cards.forEach(card => {
        sum += card.value
    })
    if (sum % 10 === room.pile[room.pile.length - 1].value % 10) {
        for (var card of cards) {
            room.pile.push(card)
            var indexOfPlayedCard = room.players.find(function (player) {
                return player.id == socket.id
            }).hand.indexOf(card.name)
            if (indexOfPlayedCard) {
                room.players.find(function (player) {
                    return player.id == socket.id
                }).hand.splice(indexOfPlayedCard, 1)
            } else {
                socket.emit('cheater')
                return
            }
        }
        io.to(room.id).emit('playedCards', room.pile)
        socket.emit('playSuccess', cards)
        updateCardCount(room)
    }
}

function updateCardCount (room) {
    var playerCardCounts = {}
    for (let player of room.players) {
        playerCardCounts[player.id] = player.hand.length
    }
    io.to(room.id).emit('playerCardCounts', playerCardCounts)
}
