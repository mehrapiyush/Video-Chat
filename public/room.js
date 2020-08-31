
if (location.href.substr(0, 5) !== 'https')
location.href = 'https' + location.href.substr(4, location.href.length - 4)

const socket = io()
let producer = null;

var urlParams = new URLSearchParams(window.location.search);

username = urlParams.get('username')
// console.log(name)
room_id = urlParams.get('room')
type = 'Student'
if(urlParams.get('type')){
  type = 'Instructor'
}


socket.request = function request(type, data = {}) {
return new Promise((resolve, reject) => {
  socket.emit(type, data, (data) => {
    if (data.error) {
      reject(data.error)
    } else {
      resolve(data)
    }
  })
})
}

let rc = null
let chat = null
function joinRoom(name, room_id,type) {
if (rc && rc.isOpen()) {
  console.log('already connected to a room')
} else {
  rc = new RoomClient(localMedia, remoteVideos, remoteAudios, window.mediasoupClient, socket, room_id, name, roomOpen,type)
  chat= new ChatClient(socket,room_id,name)
  addListeners()
}

}

function roomOpen() {
reveal(mariochat)
reveal(startAudioButton)
hide(stopAudioButton)
reveal(startVideoButton)
hide(stopVideoButton)
reveal(startScreenButton)
hide(stopScreenButton)
reveal(exitButton)
control.className = ''
reveal(videoMedia)
}

function hide(elem) {
elem.className = 'hidden'
}

function reveal(elem) {
elem.className = ''
}


function addListeners() {
rc.on(RoomClient.EVENTS.startScreen, () => {
  hide(startScreenButton)
  reveal(stopScreenButton)
})

rc.on(RoomClient.EVENTS.stopScreen, () => {
  hide(stopScreenButton)
  reveal(startScreenButton)

})

rc.on(RoomClient.EVENTS.stopAudio, () => {
  hide(stopAudioButton)
  reveal(startAudioButton)

})
rc.on(RoomClient.EVENTS.startAudio, () => {
  hide(startAudioButton)
  reveal(stopAudioButton)
})

rc.on(RoomClient.EVENTS.startVideo, () => {
  hide(startVideoButton)
  reveal(stopVideoButton)
})
rc.on(RoomClient.EVENTS.stopVideo, () => {
  hide(stopVideoButton)
  reveal(startVideoButton)
})
rc.on(RoomClient.EVENTS.exitRoom, () => {
  window.location.href = '/';

})
}

// Load mediaDevice options
navigator.mediaDevices.enumerateDevices().then(devices =>
devices.forEach(device => {
  let el = null
  if ('audioinput' === device.kind) {
    el = audioSelect
  } else if ('videoinput' === device.kind) {
    el = videoSelect
  }
  if(!el) return

  let option = document.createElement('option')
  option.value = device.deviceId
  option.innerText = device.label
  el.appendChild(option)
})
)

joinRoom(username, room_id, type)