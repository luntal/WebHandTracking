//Hide or show control-panel
function toggleControl(){
  let controlPanel = document.getElementsByClassName('control-panel')[0];
  let controlButton = document.getElementById('controlButton');
  if (controlPanel.style.display === "none"){
    controlPanel.style.display = "block";
    controlButton.innerHTML = "Hide controls";
  } else {
    controlPanel.style.display = "none";
    controlButton.innerHTML = "Show controls";
  }     
}

//Get HTML elements
const videoElement = document.getElementsByClassName('input_video')[0];
const videoSelect = document.querySelector('select#videoSource');
const selectors = [videoSelect];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const showTracking = document.getElementById("showTracking");
const selfie = document.getElementById("selfie");
const fpsoutput = document.getElementById("fps");
let leftWrist, leftIndex, rightWrist, rightIndex, leftGesture, rightGesture;

//Calculate FPS
let counter = 0;
let counterTracker = new Date();
function onResults(results) {
  counter++;
  let now = new Date();
  let timeDiff = now.getTime() - counterTracker.getTime()
  if(timeDiff >= 1000){
    let fps = Math.floor(counter / (timeDiff/1000));
    fpsoutput.innerHTML = fps;
    // reset
    counter = 0;
    counterTracker = new Date();
  };

  //Draw Hand landmarks on screen
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
      results.image, 0, 0, canvasElement.width, canvasElement.height);
  if (results.multiHandLandmarks && results.multiHandedness) {
    for (let index = 0; index < results.multiHandLandmarks.length; index++) {
      const classification = results.multiHandedness[index];
      const isRightHand = classification.label === 'Right';
      const landmarks = results.multiHandLandmarks[index];
      if (showTracking.checked) {
        drawConnectors(
          canvasCtx, landmarks, HAND_CONNECTIONS,
          {color: isRightHand ? '#fff' : '#056df5'}),
      drawLandmarks(canvasCtx, landmarks, {
        color: isRightHand ? '#fff' : '#056df5',
        fillColor: isRightHand ? '#056df5' : '#fff',
        radius: (x) => {
          return lerp(x.from.z, -0.15, .1, 10, 1);
        }
      })};

      let flandmark = landmarks.map(landmark => [landmark.x, landmark.y, landmark.z]);
      

    if (isRightHand === false){
      leftIndex = landmarks[8];
      leftWrist = landmarks[0];
      } else {
      rightIndex = landmarks[8];
      rightWrist = landmarks[0];
    }
  canvasCtx.restore();
  };
  };
}

//Toggle selfie view
selfie.addEventListener('change', function() {
  if (this.checked) {
    hands.setOptions({selfieMode: true});
  } else {
    hands.setOptions({selfieMode: false});
  }
});

const hands = new Hands({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
  selfieMode: true,
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({image: videoElement});
  },
  width: 1280,
  height: 720
});
camera.start();

function gotDevices(deviceInfos) {
  // Handles being called several times to update labels. Preserve values.
  const values = selectors.map(select => select.value);
  selectors.forEach(select => {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
  });
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    } else {
      console.log('Some other kind of source/device: ', deviceInfo);
    }
  }
  selectors.forEach((select, selectorIndex) => {
    if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
      select.value = values[selectorIndex];
    }
  });
}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  videoElement.srcObject = stream;
  // Refresh button list in case labels have become available
  return navigator.mediaDevices.enumerateDevices();
}

function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

function start() {
  const videoSource = videoSelect.value;
  const constraints = {
    video: {deviceId: videoSource ? {exact: videoSource} : undefined}
  };
  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
}

videoSelect.onchange = start;
