

function randomFromArray(array){
    return array[Math.floor(Math.random()*array.length)]
}

function handleError(error){
    var errorCode = error.code;
    var errorMessage = error.message;
    console.log(errorCode, errorMessage)
}

function getKeyString(x, y){
    return `${x}x${y}`
}

function getRandomSafeSpot(){
    return randomFromArray([
        {x: 1, y: 4},
        {x: 2, y: 4},
        {x: 1, y: 5},
        {x: 2, y: 6},
        {x: 2, y: 8},
        {x: 4, y: 9},
        {x: 5, y: 8},
        {x: 5, y: 5},
        {x: 5, y: 8},
        {x: 5, y: 10},
        {x: 11, y: 11},
        {x: 12, y: 7},
        {x: 13, y: 7},
        {x: 13, y: 7},
        {x: 13, y: 6},
        {x: 7, y: 8},
        {x: 7, y: 6},
        {x: 7, y: 7},
        {x: 8, y: 8},
        {x: 10, y: 8},
        {x: 8, y: 8},
        {x: 11, y: 4},
    ])
}

function createname(){
    const prefix = randomFromArray([
        'Ruma',
        'Kova',
        'Nopea',
        'Hidas',
        'Kalju',
        'Kalpea',
        'Karvainen',
        'Addiktoitunut'
    ])
    const animal = randomFromArray([
        'Orava',
        'Hirvi',
        'Sammal',
        'Pää',
        'Korva'
    ])
    return prefix+" "+animal
}

function getRandomColor(){
    const colors = [
        'red',
        'orange',
        'yellow',
        'green',
        'purple'
    ]
    return randomFromArray(colors)
}

function canMove(X, Y){
    const mapData = {
        minX: 0,
        maxX: 14,
        minY: 3,
        maxY: 12,
        blockedSpaces: {
            "7x4": true,
            "1x11": true,
            "12x10": true,
            "4x7": true,
            "5x7": true,
            "6x7": true,
            "8x6": true,
            "9x6": true,
            "10x6": true,
            "7x9": true,
            "8x9": true,
            "9x9": true,
        }
    }

    result = true;
    const blockedSpace = mapData.blockedSpaces[getKeyString(X, Y)];
    if(blockedSpace){result = false}
    if(X == mapData.maxX | X == mapData.minX | Y== mapData.maxY | Y== mapData.minY){result = false}
    return result

}



(function (){
    let playerId;
    let playerRef;
    let playerElements = {};
    let players = {};

    const gameContainer = document.querySelector(".game-container");
    const playerNameInput = document.querySelector('#player-name');
    const playerColorButton = document.querySelector('#player-color')

    /* functions that say on(functionName) are listeners. they activate when an event happens */

    function handleArrowPress(xChange=0, yChange=0){
        const newX = players[playerId].x + xChange;
        const newY = players[playerId].y + yChange;
        if(canMove(newX, newY)){
            players[playerId].x = newX;
            players[playerId].y = newY;
            if(xChange === 1){
                players[playerId].direction = "right";
            }
            if(xChange === -1){
                players[playerId].direction = "left";
            }
            playerRef.set(players[playerId])
        }
    }

    function initGame(){
        const allPlayersRef = firebase.database().ref('players');
        const allCoinsRef = firebase.database().ref('coins');

        new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1))
        new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1))
        new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0))
        new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0))
    
        allPlayersRef.on("value", snapshot => {// kun pelaaja objektin value muuttuu, tämä funktio aktivoituu
            players = snapshot.val() || {};
            Object.keys(players).forEach(key => {
                const characterState = players[key];
                let el = playerElements[key];

                el.querySelector(".Character_name").innerText = characterState.name;
                el.querySelector(".Character_coins").innerText = characterState.coins;
                el.setAttribute("data-color", characterState.color);
                el.setAttribute("data-direction", characterState.direction);

                const left = 16*characterState.x + "px";
                const top = 16*characterState.y-4 + "px";
                el.style.transform ="translate3d("+left+", "+top+", 0)";
            })
        })


        allPlayersRef.on("child_added", snapshot => {// kun pelaaja liittyy, tämä aktoivoituu
            const addedPlayer = snapshot.val()
            const characterElement = document.createElement("div");
            characterElement.classList.add('Character', 'grid-cell');
            if(addedPlayer.id == playerId){ // jos liittynyt pelaaja on itse pelaaja
                characterElement.classList.add("you")
            }
            characterElement.innerHTML = (`
                <div class="Character_shadow grid-cell"></div>
                <div class="Character_sprite grid-cell"></div>
                <div class="Character_name-container">
                    <span class="Character_name"></span>
                    <span class="Character_coins">0</span>
                </div>
                <div class="Character_you-arrow"></div>
            
            `);
            playerElements[addedPlayer.id] = characterElement;
    
            characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
            characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins;
            characterElement.setAttribute("data-color", addedPlayer.color);
            characterElement.setAttribute("data-direction", addedPlayer.direction);
    
            const left = 16*addedPlayer.x + "px";
            const top = 16*addedPlayer.y-4 + "px";
            characterElement.style.transform =`translate3d(${left}, ${top}, 0)`;
    
            gameContainer.appendChild(characterElement)
    
    
        })
        allPlayersRef.on("child_removed", snapshot => { // jos joku pelaaja lähtee, poistetaan se
            const removedKey = snapshot.val().id;
            gameContainer.removeChild(playerElements[removedKey]);
            delete playerElements[removedKey]
        })

        playerNameInput.addEventListener("change", (event) => {
            const newName = event.target.value || createname();
            playerNameInput.value = newName;
            playerRef.update({
                name: newName
            })
        })
        playerColorButton.addEventListener("click", () => {
            var notChangedColor = true;
            while (notChangedColor){ // tämä funktio vaihtaa aina pelaajan väriä, ja vaihtaa sen aina eriksi kun mitä se on nyt.
                const randomColor = getRandomColor();
                if(players[playerId].color !== randomColor){
                    playerRef.update({
                        color: randomColor
                    })
                    notChangedColor = false;
                }

            }

        })
    }


    firebase.auth().onAuthStateChanged(user => {
        if(user){// logged in
            playerId = user.uid;
            playerRef = firebase.database().ref(`players/${playerId}`)
            const safeCoord = getRandomSafeSpot()

            const name = createname();
            playerNameInput.value = name;
            playerRef.set({
                id: playerId,
                name: name,
                direction: "right",
                color: getRandomColor(),
                x:safeCoord.x,
                y:safeCoord.y,
                coins:0
            })
            playerRef.onDisconnect().remove(); // this removes the playerRef from database when website is closed

            initGame(); // initializing game

        }else{// not logged in

        }
    })

    firebase.auth().signInAnonymously().catch(error => handleError(error))// auth protects from bot attcks etc


}());














