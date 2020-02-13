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
            room.players[socket.id] = []
            for (var j = 0; j < 7; j++) {
                room.players[socket.id].push(room.deck.pop())
            }
            players[socket.id] = room.id
            socket.join(room.id)
            if (Object.keys(room.players).length == maxPlayers) {
                room.joinable = 0
            }
            socket.emit('cards', room.players[socket.id], room.pile)
            break
        }
    }
    if (!roomFound) {
        let newRoom = {
            id: 0,
            joinable: 1,
            deck: [],
            pile: [],
            players: {}
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
        newRoom.players[socket.id] = []
        for (let i = 0; i < 7; i++) {
            newRoom.players[socket.id].push(newRoom.deck.pop())
        }
        
        newRoom.id = id
        rooms[id] = newRoom
        socket.join(id)
        players[socket.id] = id
        socket.emit('cards', newRoom.players[socket.id], newRoom.pile)
        id++
    }
}

function disconnect(socket) {
    var room = rooms[players[socket.id]]
        room.joinable = 1
        for (var player in room.players) {
            if (player == socket.id) {
                delete rooms[players[socket.id]].players[player]
            }
        }
        if (!Object.keys(room.players).length) {
            delete rooms[room.id]
        }
        
        delete players[socket.id]
        
        console.log('user disconnected with id: ' + socket.id)
        //console.log(util.inspect(rooms, false, null, true))
}

function drawCard (socket) {
    var room = rooms[players[socket.id]]
    if (room.deck.length > 0) {
        let drawnCard = room.deck.pop()
        socket.emit('drawnCard', drawnCard)
        room.players[socket.id].push(drawnCard)
    } else {
        socket.emit('deckEmpty')
    }
}

function playCards (socket, cards) {
    var room = rooms[players[socket.id]]
    for (var card of cards) {
        room.pile.push(card)
        var indexOfPlayedCard = (room.players[socket.id].map(function(e) {
            return e.name
        }).indexOf(card.name))
        room.players[socket.id].splice(indexOfPlayedCard, 1)
        topCard = card
    }
    io.to(room.id).emit('playedCards', room.pile)
}
