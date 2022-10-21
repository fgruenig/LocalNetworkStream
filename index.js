const app = require('express')()
const path = require('path')
const http = require('http').Server(app)
const io = require('socket.io')(http)
const port = process.env.PORT || 3000

let streamerId = null

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})
app.get('/stream.html', (req, res) => {
  res.sendFile(path.join(__dirname, '/stream.html'))
})
app.get('/index2.html', (req, res) => {
  res.sendFile(path.join(__dirname, '/index2.html'))
})
app.get('/adapter-latest.js', (req, res) => {
  res.sendFile(path.join(__dirname, '/adapter-latest.js'))
})
app.get('/listener.js', (req, res) => {
  res.sendFile(path.join(__dirname, '/listener.js'))
})
app.get('/streamer.js', (req, res) => {
  res.sendFile(path.join(__dirname, '/streamer.js'))
})
app.get('/common.js', (req, res) => {
  res.sendFile(path.join(__dirname, '/common.js'))
})
app.get('/silence.mp3', (req, res) => {
  res.sendFile(path.join(__dirname, '/silence.mp3'))
})

io.on('connection', (socket) => {
  socket.on('streamerRegistration', () => {
    // console.log('streamerRegistration executed!')
    if (streamerId === null) {
      streamerId = socket.id
      socket.emit('streamerRegistration', { id: streamerId, success: true })
    } else {
      socket.emit('streamerRegistration', { id: null, success: false })
    }
  })
  socket.on('requestIds', () => {
    // console.log('requestIds executed!')
    if (streamerId === null) {
      socket.emit('requestIds', null)
    } else {
      const Ids = {
        streamer: streamerId,
        requester: socket.id
      }
      socket.emit('requestIds', Ids)
    }
  })
  socket.on('streamerDisconnect', () => {
    if (streamerId === null) {
      socket.emit('error', 'No Streamer is connected! (strDisc)')
    } else {
      streamerId = null
      socket.emit('Ids', null, socket.id)
      // console.log('Streamer logged off!');
    }
  })
  socket.on('message', (message, receiver, sender) => {
    if (streamerId !== null) {
      // console.log('message through server from: '+ sender+' to: '+receiver,message);
      socket.to(receiver).emit('message', message, sender)
    } else {
      socket.emit('error', "The Streamer hasn't logged on yet!")
    }
  })

  socket.on('disconnect', () => {
    if (socket.id === streamerId) {
      streamerId = null
      socket.emit('Ids', null, socket.id)
      // console.log('Streamer disconnected!');
    } else {
      // console.log('user disconnected');
    }
  })
})

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`)
})
