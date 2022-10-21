const socket = io()
const peerConnections = []
const audioContext = new (window.AudioContext || window.webkitAudioContext)()
audioContext.suspend()
const gainNode = audioContext.createGain()
const transmissionInput = audioContext.createMediaStreamDestination()
let audioStream = null
let micSource = null
let selectMem = ''
let streamerId = null

window.audioStream = audioStream
window.micSource = micSource
window.gainNode = gainNode

const btStream = document.getElementById('btStream')
const btDisconnect = document.getElementById('btDisconnect')
const audioInputSelect = document.getElementById('microphones')
audioInputSelect.addEventListener('change', changeInput)
const gainInput = document.getElementById('gainInput')

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

async function updateAudioTrack (givenDeviceId) {
  // console.log('givenDeviceId: ', givenDeviceId)
  const constraints = {
    video: false,
    audio: true
  }

  if (givenDeviceId !== '') {
    stopAudioStream()
    constraints.audio = { deviceId: givenDeviceId ? { exact: givenDeviceId } : undefined }
    audioContext.resume()
    micSource.disconnect(gainNode)
    audioStream = await navigator.mediaDevices.getUserMedia(constraints)
    micSource = audioContext.createMediaStreamSource(audioStream)
    micSource.connect(gainNode)
  } else {
    audioStream = await navigator.mediaDevices.getUserMedia(constraints)
    audioContext.resume()
    micSource = audioContext.createMediaStreamSource(audioStream)
    micSource.connect(gainNode)
    gainNode.connect(transmissionInput)
  }
  console.log('constraints: ', constraints)
}

async function stopAudioStream () {
  // micSource.disconnect(gainNode)
  audioContext.suspend()
  audioStream.getTracks().forEach(track => track.stop())
}

async function buttonStream () {
  // console.log('ButtonStream clicked!')
  btStream.disabled = true
  btDisconnect.disabled = false
  audioInputSelect.disabled = false
  const regResult = await asyncEmit('streamerRegistration', null)
  if (regResult.success) {
    streamerId = regResult.id
  } else {
    alert('It seems another streamer is still connected!')
    btStream.disabled = false
    btDisconnect.disabled = true
    audioInputSelect.disabled = true
    return
  }
  getConnectedDevices('audioinput', audioInputSelect, selectMem)
  updateAudioTrack(selectMem)
}

// eslint-disable-next-line no-unused-vars
async function buttonDisconnect () {
  // console.log('ButtonDisconnect clicked!')
  btStream.disabled = false
  btDisconnect.disabled = true
  audioInputSelect.disabled = false
  peerConnections.forEach(pc => {
    pc.close()
  })
  socket.emit('streamerDisconnect')
  stopAudioStream()
}

async function changeInput () {
  // console.log("Input Change function run!")
  // audioStream.getTracks().forEach(track => track.stop())
  const selectNr = audioInputSelect.selectedIndex
  const selectDevs = audioInputSelect.options
  const selectDevId = selectDevs[selectNr].value
  selectMem = selectDevId
  console.log('selectMem = ', selectMem)
  // console.log('Selected DeviceID: ' + deviceID)
  if (btStream.disabled) {
    console.log('updateAudioTrack from changeInput ran!')
    updateAudioTrack(selectDevId)
  }
}

function changeGain() {
  // console.log('Gainvalue changed to: ', gainInput.value)
  gainNode.gain.linearRampToValueAtTime(gainInput.value, audioContext.currentTime)
}

socket.on('message', async function (message, sender) {
  // console.log('Streamer received message:', message, sender)
  if (message.type === 'init') {
    const pc = new RTCPeerConnection()
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
      value: false,
      writable: false,
      enumerable: true,
      configurable: false
    })
    Object.defineProperty(pc, 'myId', {
      value: streamerId,
      writable: false,
      enumerable: true,
      configurable: false
    })
    Object.defineProperty(pc, 'remoteId', {
      value: sender,
      writable: false,
      enumerable: true,
      configurable: false
    })

    peerConnections.push(pc)

    pc.addTrack(transmissionInput.stream.getTracks()[0], transmissionInput.stream)

    pc.addEventListener('connectionstatechange', event => {
      // console.log('streamer side RTCPeerConnection status: ', event, pc.remoteId);
      switch (event.target.connectionState) {
        case 'new':
          // console.log('ListenerId ' + event.target.remoteId + ' Connectionstate: new')
          break
        case 'checking':
          // console.log('ListenerId ' + event.target.remoteId + ' Connectionstate: checking')
          break
        case 'connected':
          // console.log('ListenerId ' + event.target.remoteId + ' Connectionstate: connected')
          break
        case 'disconnected': {
          // console.log('ListenerId ' + event.target.remoteId + ' Connectionstate: disconnected')
          const i = peerConnections.map(pc => pc.remoteId).indexOf(event.target.remoteId)
          peerConnections[i].close()
          peerConnections.splice(i, 1)
          break }
        case 'closed':
          // console.log('ListenerId ' + event.target.remoteId + ' Connectionstate: closed')
          break
        case 'failed': {
          // console.log('ListenerId ' + event.target.remoteId + ' Connectionstate: failed')
          const i = peerConnections.map(pc => pc.remoteId).indexOf(event.target.remoteId)
          peerConnections[i].close()
          peerConnections.splice(i, 1)
          break }
        default:
          break
      }
    })

    pc.addEventListener('icecandidate', event => {
      // console.log('streamer side icecandidate:', event, pc.remoteId);
      const message = {
        type: 'iceCandidate',
        ice: event.candidate
      }
      socket.emit('message', message, event.target.remoteId, event.target.myId)
    })

    pc.addEventListener('negotiationneeded', async function (event) {
      try {
        event.target.makingOffer = true
        await event.target.setLocalDescription()
        const message = {
          type: 'offer',
          sdp: event.target.localDescription
        }
        socket.emit('message', message, event.target.remoteId, event.target.myId)
      } catch (err) {
        console.error(err)
      } finally {
        event.target.makingOffer = false
      }
    })
    pc.addEventListener('iceconnectionstatechange', async function (event) {
      if (event.target.iceConnectionState === 'failed') {
        event.target.restartIce()
      }
    })
    return
  }

  const i = peerConnections.map(pc => pc.remoteId).indexOf(sender)

  handleMessage(peerConnections[i], socket, message)

  if (message.type === 'disconnect') {
    await peerConnections[i].close()
    peerConnections.splice(i, 1)
  }
})

socket.on('error', (errmsg) => {
  alert(errmsg)
})

navigator.mediaDevices.addEventListener('devicechange', event => {
  console.log('mediaDevices Changed!')
  getConnectedDevices('audioinput', audioInputSelect, selectMem)
  changeInput()
})
