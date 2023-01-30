const socket = io()

const cb = document.getElementById('strToggle')
const audioContext = new (window.AudioContext || window.webkitAudioContext)()
audioContext.suspend()

let pc = null
let selectMem = ''

socket.on('error', (errmsg) => {
  alert(errmsg)
})

async function connect () {
  pc = new RTCPeerConnection()
  Object.defineProperty(pc, 'makingOffer', {
    value: false,
    writable: true,
    enumerable: true,
    configurable: false
  })
  Object.defineProperty(pc, 'ignoreOffer', {
    value: false,
    writable: true,
    enumerable: true,
    configurable: false
  })
  Object.defineProperty(pc, 'polite', {
    value: true,
    writable: false,
    enumerable: true,
    configurable: false
  })
  Object.defineProperty(pc, 'myId', {
    value: null,
    writable: true,
    enumerable: true,
    configurable: false
  })
  Object.defineProperty(pc, 'remoteId', {
    value: null,
    writable: true,
    enumerable: true,
    configurable: false
  })

  pc.addEventListener('connectionstatechange', event => {
    switch (pc.connectionState) {
      case 'new':
      case 'checking':
        console.log('Connectionstate: checking')
        break
      case 'connected':
        console.log('Listener PeerConnection state is: Connected!')
        break
      case 'disconnected':
        console.log('Connectionstate: disconnected')
        handleDisconnect()
        break
      case 'closed':
        console.log('Connectionstate: closed')
        break
      case 'failed':
        handleDisconnect()
        console.log('Connectionstate: failed')
        break
      default:
        break
    }
  })

  pc.addEventListener('iceconnectionstatechange', event => {
    if (pc.iceConnectionState === 'failed') {
      console.log('ICE restart executed!')
      pc.restartIce()
    }
  })

  pc.addEventListener('negotiationneeded', async function (event) {
    console.log('listener side negotiationneeded:', event)
    try {
      pc.makingOffer = true
      await pc.setLocalDescription()
      const message = {
        type: 'offer',
        sdp: pc.localDescription
      }
      socket.emit('message', message, pc.remoteId, pc.myId)
    } catch (err) {
      console.error(err)
    } finally {
      pc.makingOffer = false
    }
  })

  pc.addEventListener('icecandidate', event => {
    const message = {
      type: 'iceCandidate',
      ice: event.candidate
    }
    socket.emit('message', message, pc.remoteId, pc.myId)
  })

  pc.addEventListener('track', event => {
    // console.log('AudioTrack received by listener:', event)
    let a = new Audio();
    a.muted = true;
    a.srcObject = event.streams[0];
    a.addEventListener('canplaythrough', () => {
      a = null;
    });
    // The lines above are a Workaround for a Chrome Bug
    let source = audioContext.createMediaStreamSource(event.streams[0])
    source.connect(audioContext.destination)
  })

  try {
    const Ids = await asyncEmit('requestIds', null)
    if (Ids !== null) {
      console.log('Got Ids:', Ids)
      pc.remoteId = Ids.streamer
      pc.myId = Ids.requester
    } else {
      cb.checked = false
      alert('No streamer available!')
      return
    }
  } catch (err) {
    console.error(err)
  }

  socket.emit('message', { type: 'init' }, pc.remoteId, pc.myId)
  console.log('Init sent!', pc.remoteId, pc.myId)
}

function asyncEmit (eventName, data) {
  return new Promise(function (resolve, reject) {
    socket.emit(eventName, data)
    socket.on(eventName, result => {
      socket.off(eventName)
      resolve(result)
    })
    setTimeout(reject, 1000)
  })
}

async function handleDisconnect () {
  console.log('Stream disconnected!')
  cb.checked = false
  socket.emit('message', { type: 'disconnect' }, pc.remoteId, pc.myId)
  await pc.close()
  pc = null
}

async function streamToggle (cb) {
  if (cb.checked === true) {
    console.log('Stream toggled ON!')
    await connect()
    audioContext.resume()
  } else {
    console.log('Stream toggled OFF!')
    socket.emit('message', { type: 'disconnect' }, pc.remoteId, pc.myId)
    await pc.close()
    pc = null
  }
}

socket.on('message', async function (message, sender) {
  console.log('message recieved by listener!', message)
  handleMessage(pc, socket, message)
})
