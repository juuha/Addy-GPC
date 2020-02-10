const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io').listen(server)
const util = require('util')

app.use(express.static(__dirname + '/public'))

var rooms = []
var players = {}
const maxPlayers = 2

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html')
})

io.on('connection', async function (socket) {
    console.log('A user connected with id: ' + socket.id)
    
    var roomFound = 0
    for (var room of rooms) {
        if (room.joinable) {
            roomFound = 1
            room.players[socket.id] = []
            for (var j = 0; j < 7; j++) {
                room.players[socket.id].push(room.deck.pop())
            }
            players[socket.id] = room.id
            if (Object.keys(room.players).length == maxPlayers) {
                room.joinable = 0
            }
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
        
        let id = 0
        if(rooms[rooms.length -1]) {
            id = rooms[rooms.length -1].id + 1
        }
        newRoom.id = id
        
        rooms.push(newRoom)
        players[socket.id] = newRoom.id
    }
    
    socket.on('disconnect', function () {
        var room = rooms[players[socket.id]]
        room.joinable = 1
        for (var player in room.players) {
            if (player == socket.id) {
                delete rooms[players[socket.id]].players[player]
            }
        }
        if (!Object.keys(room.players).length) {
            delete room.deck
            delete room.pile
            delete room.players
            room.joinable = 0
        }
        
        delete players[socket.id]
        
        console.log('user disconnected with id: ' + socket.id)   
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
