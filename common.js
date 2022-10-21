async function getConnectedDevices (type, selectElement, selectMem) {
  const devices = await navigator.mediaDevices.enumerateDevices()
  const selDevs = devices.filter(device => device.kind === type)

  removeOptions(selectElement)

  for (let i = 0; i < selDevs.length; i++) {
    let selected = false
    if (selectMem === selDevs[i].deviceId) {
      selected = true
    }
    const option = new Option(selDevs[i].label, selDevs[i].deviceId, selected, selected)
    selectElement.add(option)
  }
  return selDevs
}

function removeOptions (selectElement) {
  const L = selectElement.options.length - 1
  for (let i = L; i >= 0; i--) {
    selectElement.remove(i)
  }
}

async function handleMessage (pc, socket, message) {
  try {
    if (message.type === 'offer' || message.type === 'answer') {
      const offerCollision = (message.type === 'offer') &&
        (pc.makingOffer || pc.signalingState !== 'stable')

      pc.ignoreOffer = !pc.polite && offerCollision
      if (pc.ignoreOffer) {
        return
      }

      await pc.setRemoteDescription(message.sdp)
      if (message.type === 'offer') {
        await pc.setLocalDescription()
        const message = {
          type: 'answer',
          sdp: pc.localDescription
        }
        socket.emit('message', message, pc.remoteId, pc.myId)
      }
    } else if (message.type === 'iceCandidate') {
      try {
        await pc.addIceCandidate(message.ice)
      } catch (err) {
        if (!pc.ignoreOffer) {
          throw err
        }
      }
    }
  } catch (err) {
    console.error(err)
  }
}
