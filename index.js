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

// Modelo
let model;
const VIDEO_WIDTH = 320;
const VIDEO_HEIGHT = (VIDEO_WIDTH / 16) * 9;
const mobile = isMobile();

const state = {
  backend: 'webgl',
  //color: '#3370d4"'
};


// Parseo temporal a string
function objToString(obj){
    let string = JSON.stringify(obj);
    return string;
  }

// Posicion de las manos
let handPosition = (mano, posicion) => {
    // OJO DEBE SER UN ARREGLO DE 3 DIMENSIONES EL INPUT
    mano.setAttribute("position", posicion);
}

// Debug creador de numeros aleatorios dentro del rango de la pantala
let generateRandomNumber = (min, max) => Math.random() * (max - min) + min;

// Obtenedor de elementos
let obtainElement = (id) => document.getElementById(id);
/*
function main() {

    // ACCESO POR ARREGLOS Y EN POSICION RELATIVA (MEJOR OPCION)
    //const mano = document.getElementById('manoGlobal');
    const mano = obtainElement('manoGlobal');
    var x = generateRandomNumber(-2, 2);                        // Posicion X
    var y = generateRandomNumber(0, 2);                         // Posicion Y
    var z = generateRandomNumber(0, 1);                         // Poisicion Z

    // Asignacion de las 3 posiciones a la palma
    handPosition(mano, x + " " + y + " " + z);
    console.log(x);

    console.log(mano);

    // ACCESO POR ARREGLOS Y EN POSICION ABSOLUTA
    //var escena = document.querySelectorAll('a-box');
    

    /*  Ejemplo de creacion de un componente
    AFRAME.registerComponent('log', {
        schema: {type: 'string'},

        init: function() {
            var stringToLog = this.data;
            console.log(stringToLog);
        }
    });
    */



    /*
    handPosition(() => {
        const mano = document.getElementById('manoGlobal');
    }, "-0.4 1.5 0");
    
   
}
*/
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


// Rutina principal asíncrona
const main = 
    async () => {
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

        landmarksRealTime(video);
    }

const landmarksRealTime = async (video) => {
    //const stats = new Stats();                        // Stats
    //stats.showPanel(0);                               // Activacion de los stats

    // ACCESO POR ARREGLOS Y EN POSICION RELATIVA (MEJOR OPCION)
    const mano = document.getElementById('manoGlobal');
    console.log(mano);

    console.log(video);

    async function frameLandmarks() {
        
        // Instancia de las predicciones
        const predictions = await model.estimateHands(video);
        console.log("Funciona");
        console.log(predictions);

        // Validador de predicciones
        if (predictions.length > 0) {
            const result = predictions[0].landmarks;
            //drawKeypoints(ctx, result, predictions[0].annotations);
    
            // Log experimental 
            // Parseo a String de las anotaciones
            let pred = predictions[0].annotations;
            //let logs = JSON.stringify(predictions[0].annotations);
            //console.log("Ctx: " + ctx + "\nResultados: " + result + "\nPredicciones: " + predictions[0].annotations);
            /*
            console.log("Ctx: " + ctx +"\nPulgar: " + objToString(mano.thumb) + 
            "\nDedo Indice" + objToString(mano.indexFinger) +
            "\nDedo de Enmedio" + objToString(mano.middleFinger) + 
            "\n"
            );
            */
            
            console.log(result);
            console.table(pred);
            /*
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
            }*/
        }
    };

    frameLandmarks();


}

//main();
main();
//const mano = document.getElementById('manoGlobal');
//mano.setAttribute("position", "-0.4 1.5 0");



// HTML
//position="-0.4 1.5 0"