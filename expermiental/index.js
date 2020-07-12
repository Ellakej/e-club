/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

// import * as tfwebgpu from '@tensorflow/tfjs-backend-webgpu';
import * as handpose from '@tensorflow-models/handpose';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import * as tf from '@tensorflow/tfjs';
import {version_wasm} from '@tensorflow/tfjs-backend-wasm';

tfjsWasm.setWasmPath(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
        version_wasm}/dist/tfjs-backend-wasm.wasm`);
// Booleano para detectar si es movil o no        
function isMobile() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isAndroid || isiOS;
}

// Inicializacion de variables
let videoWidth, videoHeight,
    scatterGLHasInitialized = false, scatterGL, fingerLookupIndices = {
      thumb: [0, 1, 2, 3, 4],
      indexFinger: [0, 5, 6, 7, 8],
      middleFinger: [0, 9, 10, 11, 12],
      ringFinger: [0, 13, 14, 15, 16],
      pinky: [0, 17, 18, 19, 20]
    };  // for rendering each finger as a polyline

//const VIDEO_WIDTH = 480;
//const VIDEO_HEIGHT = 300;

const VIDEO_WIDTH = 320;
const VIDEO_HEIGHT = (VIDEO_WIDTH / 16) * 9;
const mobile = isMobile();
// Don't render the point cloud on mobile in order to maximize performance and
// to avoid crowding limited screen space.
const renderPointcloud = mobile === false;


const state = {
  backend: 'webgl',
  //color: '#3370d4"'
};

if (renderPointcloud) {
  state.renderPointcloud = true;
}

// Parseo temporal a string
function objToString(obj){
  let string = JSON.stringify(obj);
  return string;
}

// Establece la GUI flotante
function setupDatGui() {
  const gui = new dat.GUI();
  // Checkbox del backend
  gui.add(state, 'backend', ['wasm', 'webgl', 'cpu', 'webgpu'])
      .onChange(async backend => {                    // Al detectar un cambio envia datos asíncronos
        await tf.setBackend(backend);                 // modifica el backend directamente a tensorflow (tf)
      });

  // Mostrar o no la gráfica (renderPointdloud)
  if (renderPointcloud) {
    gui.add(state, 'renderPointcloud').onChange(render => {
      // (Teoría) Recuperacíon de la seccíon de gráfica 3D
      document.querySelector('#scatter-gl-container').style.display =
          render ? 'inline-block' : 'none';
    });
  }

  // Cambiar el color de los puntos
  /*
  gui.add(state, 'Colores de los puntos', ['Azul', 'Rojo', 'Verde'])
    .onChange(color => {
      console.log(color);
    });
    */
}


// Dibujado de puntos (canvas, y, x, tamaño)
function drawPoint(ctx, y, x, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

// Dibujado de puntos clave (la mano completa)
function drawKeypoints(ctx, keypoints) {
  const keypointsArray = keypoints;

  // (Teoría) Dibujado de los puntos de la palma
  for (let i = 0; i < keypointsArray.length; i++) {
    const y = keypointsArray[i][0];
    const x = keypointsArray[i][1];
    drawPoint(ctx, x - 2, y - 2, 3);
  }
  // (Teoría) Dibujado de los dedos
  const fingers = Object.keys(fingerLookupIndices);
  for (let i = 0; i < fingers.length; i++) {
    const finger = fingers[i];
    const points = fingerLookupIndices[finger].map(idx => keypoints[idx]);
    drawPath(ctx, points, false);
  }
}
// Dibujado de líneas
function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }
  // Cierra las líneas cuando detecta el fin
  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}

let model;

// Configuración de la camara
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }
  // Obtención del elemento de video
  const video = document.getElementById('video');
  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      // Only setting the video to a specified size in order to accommodate a
      // point cloud, so on mobile devices accept the default size.
      width: mobile ? undefined : VIDEO_WIDTH,
      height: mobile ? undefined : VIDEO_HEIGHT
    },
  });
  // Pasarle el objeto stream al video obtenido por la ID
  video.srcObject = stream;

  // Regreso de una promesa para cargas asíncronas(???)
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

// Carga de video asíncrona
async function loadVideo() {
  const video = await setupCamera();                // Espera asíncrona
  video.play();                                     // Inicio del video
  return video;                                     // Regreso del video ya iniciado
}

// Función (flecha??) principal
const main =
    async () => {                                   // Inicio asíncrono de la función ???
  await tf.setBackend(state.backend);               // Establecimiento del backend a Tensorflow
  model = await handpose.load();                    // Carga del modelo de AI
  let video;
  
  // Intento de carga de video
  try {
    video = await loadVideo();                      // Inicio del video por llamada a loadVideo()
  } catch (e) {                                     // En caso de falla mostrar error
    let info = document.getElementById('info');     // en el elemento info de html
    info.textContent = e.message;
    info.style.display = 'block';
    throw e;
  }

  landmarksRealTime(video);                         // Llamada a la funcion flecha landmarksRealTime
  // mostrarDatos();
}

// Funcion (flecha??) de marcado en tiempo real
const landmarksRealTime = async (video) => {
  setupDatGui();                                    // Configuración del GUI

  const stats = new Stats();                        // Stats
  stats.showPanel(0);                               // Activacion de los stats
  document.body.appendChild(stats.dom);             // Output de los stats

  videoWidth = video.videoWidth;                    // Ancho del video
  videoHeight = video.videoHeight;                  // Alto del video

  // Obtención del canvas de salida
  const canvas = document.getElementById('output');

  canvas.width = videoWidth;                        // Ancho del canvas en base al video
  canvas.height = videoHeight;                      // Alto del canvas en base al video

  // Log para saber los valores de ancho y saida
  console.log("Canvas\nAncho: " + canvas.width + "\nAlto: " + canvas.height);
  console.log("\nVideo\nAncho: " + videoWidth + "\nAlto: " + videoHeight);

  const ctx = canvas.getContext('2d');              // Obtencion del contexto del canvas IMPORTANTE

  // Reasignacion del tamaño del video?
  video.width = videoWidth;                     
  video.height = videoHeight;

  ctx.clearRect(0, 0, videoWidth, videoHeight);
  ctx.strokeStyle = 'green';                          // Color de las lineas
  ctx.fillStyle = 'black';                            // Color de los puntos
  //ctx.fillStyle = "#3370d4"; //blue

  ctx.translate(canvas.width, 0);                     // Traslacion del canvas
  ctx.scale(-1, 1);                                   // Escalado del canvas

  // These anchor points allow the hand pointcloud to resize according to its
  // position in the input.
  const ANCHOR_POINTS = [
    [0, 0, 0], [0, -VIDEO_HEIGHT, 0], [-VIDEO_WIDTH, 0, 0],
    [-VIDEO_WIDTH, -VIDEO_HEIGHT, 0]
  ];

  // Funcion anidada flecha de marcado por frames (IMPORTANTE, SALIDA DE DATOS)
  async function frameLandmarks() {
    stats.begin();                                    // Inicio de los stats
    ctx.drawImage(                                    // Dibujado en el canvas
        video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width,
        canvas.height);

    // Instancia de las predicciones
    const predictions = await model.estimateHands(video);

    // Validador de predicciones
    if (predictions.length > 0) {
      const result = predictions[0].landmarks;
      drawKeypoints(ctx, result, predictions[0].annotations);

      // Log experimental 
      // Parseo a String de las anotaciones
      let mano = predictions[0].annotations;
      //let logs = JSON.stringify(predictions[0].annotations);
      //console.log("Ctx: " + ctx + "\nResultados: " + result + "\nPredicciones: " + predictions[0].annotations);
      /*
      console.log("Ctx: " + ctx +"\nPulgar: " + objToString(mano.thumb) + 
      "\nDedo Indice" + objToString(mano.indexFinger) +
      "\nDedo de Enmedio" + objToString(mano.middleFinger) + 
      "\n"
      );
      */
     console.table(mano);

      if (renderPointcloud === true && scatterGL != null) {
        const pointsData = result.map(point => {
          return [-point[0], -point[1], -point[2]];
        });

        const dataset =
            new ScatterGL.Dataset([...pointsData, ...ANCHOR_POINTS]);

        if (!scatterGLHasInitialized) {
          scatterGL.render(dataset);

          const fingers = Object.keys(fingerLookupIndices);

          scatterGL.setSequences(
              fingers.map(finger => ({indices: fingerLookupIndices[finger]})));
          scatterGL.setPointColorer((index) => {
            if (index < pointsData.length) {
              return 'steelblue';
            }
            return 'white';  // Hide.
          });
        } else {
          scatterGL.updateDataset(dataset);
        }
        scatterGLHasInitialized = true;
      }
    }
    stats.end();
    requestAnimationFrame(frameLandmarks);
  };

  frameLandmarks();

  if (renderPointcloud) {
    document.querySelector('#scatter-gl-container').style =
        `width: ${VIDEO_WIDTH}px; height: ${VIDEO_HEIGHT}px;`;

    scatterGL = new ScatterGL(
        document.querySelector('#scatter-gl-container'),
        {'rotateOnStart': false, 'selectEnabled': false});
  }
};

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

main();
