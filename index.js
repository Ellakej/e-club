// Posicion de las manos
let handPosition = (mano, posicion) => {
    // OJO DEBE SER UN ARREGLO DE 3 DIMENSIONES EL INPUT
    mano.setAttribute("position", posicion);
}

// Debug creador de numeros aleatorios dentro del rango de la pantala
let generateRandomNumber = (min, max) => Math.random() * (max - min) + min;

function main() {
    // ACCESO POR ARREGLOS Y EN POSICION RELATIVA (MEJOR OPCION)
    const mano = document.getElementById('manoGlobal');
    var x = generateRandomNumber(-2, 2);                        // Posicion X
    var y = generateRandomNumber(0, 2);                         // Posicion Y
    var z = generateRandomNumber(0, 1);                         // Poisicion Z

    // Asignacion de las 3 posiciones a la palma
    handPosition(mano, x + " " + y + " " + z);
    console.log(num1);

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
    */
}


main();
//const mano = document.getElementById('manoGlobal');
//mano.setAttribute("position", "-0.4 1.5 0");



// HTML
//position="-0.4 1.5 0"