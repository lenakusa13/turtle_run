// class TurtleRunGame {
//     static game = null;

//     static start(userName) {
//         if (this.game === null) {
//             this.game = new Phaser.Game(config);
//             this.game.userName = userName; // Pass the userName to the game
//         } else {
//             let defaultScene = this.game.scene.getScenes(true)[0]; // Accesses the currently running scene
//             resetVars(1);
//             defaultScene.scene.restart();
//         }
//     }
// }

// window.TurtleRunGame = TurtleRunGame; // Expose to global scope

var TurtleRunGame = {
    game: null,

    start: function(userName) {
        if (this.game === null) {    
            this.game = new Phaser.Game(config);
            this.game.userName = userName; // Pass the userName to the game
            this.game.scale.on('resize', resizeButtons);

            resizeButtons();
            document.getElementById('leftButton').style.display = 'flex';
            document.getElementById('rightButton').style.display = 'flex';
        } else {
            let defaultScene = this.game.scene.getScenes(true)[0]; // Accesses the currently running scene
            resetVars(1);
            defaultScene.scene.restart();
        }
    }
};

var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 800,
    scale: {
        mode: Phaser.Scale.FIT, // Scale the game to fit the parent container
        autoCenter: Phaser.Scale.CENTER_BOTH // Center the game horizontally and vertically
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    fps: {
        target: 30,
        forceSetTimeOut: true
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var background;
var player;
var seagulls;
var pelicans;
var jetpack_cats;
var level = 1;
var seagulls_to_avoid = 10;
var seagulls_avoided = 0;
var total_seagulls_avoided = 0;
var remaining_seagulls = 10;
var remaining_pelicans = remaining_seagulls
var num_jetpack_cats = 0;
var jetpack_cat_flying_time = 0;
var cursors;
var infoText;

function resetVars(_level) {
    level=_level
    seagulls_to_avoid = 10 * (1 + ((level + 1) % 2));
    seagulls_avoided = 0;
    remaining_seagulls = seagulls_to_avoid;
    remaining_pelicans = remaining_seagulls;
    jetpack_cat_flying_time = 0;

    //check if we are restarting the game
    if (_level === 1) {
        total_seagulls_avoided = 0;
        num_jetpack_cats = 0;        
    }
    else {
        if (level % 2 === 0) {
            num_jetpack_cats++;
        }
    }
}

// Helper function to create a sprite with a specific width
function createSpriteWithWidth(scene, key, width, x, y) {
    var sprite = scene.physics.add.sprite(x, y, key);

    // Calculate the scale factor to achieve the desired width
    var originalWidth = sprite.displayWidth;
    var scale = width / originalWidth;

    // Set the scale while maintaining the aspect ratio
    sprite.setScale(scale);

    return sprite;
}

function createSeagull(scene, level) {
    var factor = 1.0 + (level / 2) * 0.3; // 30% increase in speed per every two levels
    var x = Phaser.Math.Between(0, scene.sys.canvas.width);
    var y = 50;
    var dx = (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.FloatBetween(0.2 * factor, 1.2 * factor)*30;
    var dy = Phaser.Math.FloatBetween(0.8 * factor, 2 * factor)*30;

    var seagull = seagulls.create(x, y, 'seagull').setScale(0.40);

    seagull.setVelocity(dx,dy);
    seagull.body.maxVelocity.setTo(500, 600);

    seagull.setFlipX(dx < 0);
    seagull.body.setCircle(70, 30, 20);
}

function createPelican(scene, level) {
    var factor = 1.0 + (level / 2) * 0.3; // 30% increase in speed per every two levels
    var x = Phaser.Math.Between(0, scene.sys.canvas.width);
    var y = 50;
    var dy = Phaser.Math.FloatBetween(0.9 * factor, 2.2 * factor)*30;
    var dx = dy * factor / 2;

    var pelican = pelicans.create(x, y, 'pelican').setScale(0.60);
    pelican.setVelocity(dx,dy);
    pelican.body.maxVelocity.setTo(500, 600);

    pelican.body.setCircle(60, 30, 25);
}

function createJetpackCat() {
    let screen_height =  TurtleRunGame.game.config.height;
    var x = 0;
    var y = Phaser.Math.Between(screen_height*.4, screen_height*.6);
    var dx = screen_height/3;
    var dy = 0;
    var jetpack_cat = jetpack_cats.create(x, y, 'jetpack_cat').setScale(0.35);
    jetpack_cat.setVelocity(dx,dy);
}

// scores functions
var scores_server = "https://turtlerun-c9f1b-default-rtdb.firebaseio.com"

function getScores(name, callback) {
    fetch(scores_server+'/scores.json')
        .then(response => response.json())
        .then(scores => {
            // Check if the current player's score should be updated
            if (!scores[name] || level > scores[name].level || total_seagulls_avoided > scores[name].seagulls) {
                // Submit new high score
                submitScore(name, level, total_seagulls_avoided);
                scores[name]={
                    "level": level,
                    "seagulls": total_seagulls_avoided
                };
            }
            callback(scores);
        })
        .catch(error => {
            console.error('Error fetching scores:', error);
        });
}

function submitScore(name, level, seagulls) {
    const scoreData = { level, seagulls };
    fetch(scores_server+'/scores/'+name+'.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData)
    })
    .catch(error => {
        console.error('Error writing data:', error);
    });
}

function displayScores(scene, scores) {
    let screenWidth = scene.sys.game.config.width;
    let screenHeight = scene.sys.game.config.height;
    
    // Display high scores title
    let titleText = scene.add.text(screenWidth / 2, 0.25 * screenHeight + 140, 'High score table (top-5):', { fontSize: '20px', fill: '#000' }).setOrigin(0.5);

    // Limit scores to top 5
    let topScores = Object.entries(scores).sort((a, b) => {
        if (a[1].level === b[1].level) {
            return b[1].seagulls - a[1].seagulls; // Sort by seagulls if levels are equal
        }
        return b[1].level - a[1].level;
    }).slice(0, 5);

    // Display column headers
    let columns = ['Name', 'Level', 'Seagulls'];
    columns.forEach((column, idx) => {
        scene.add.text(0.25 * screenWidth + 100 + idx * 120, 0.25 * screenHeight + 200, column, { fontSize: '18px', fill: '#000' }).setOrigin(0.5);
    });

    // Display each score
    topScores.forEach(([name, score], idx) => {
        scene.add.text(0.25 * screenWidth + 100, 0.25 * screenHeight + 225 + idx * 25, name, { fontSize: '18px', fill: '#000' }).setOrigin(0.5);
        scene.add.text(0.25 * screenWidth + 220, 0.25 * screenHeight + 225 + idx * 25, score.level, { fontSize: '18px', fill: '#000' }).setOrigin(0.5);
        scene.add.text(0.25 * screenWidth + 340, 0.25 * screenHeight + 225 + idx * 25, score.seagulls, { fontSize: '18px', fill: '#000' }).setOrigin(0.5);
    });
}


// End game logic
function endGame(scene, message) {
    let centerX = scene.cameras.main.centerX;
    let centerY = scene.cameras.main.centerY;
    seagulls.clear(true, true);
    pelicans.clear(true, true);
    jetpack_cats.clear(true, true);

    // Display game over message
    scene.add.text(centerX, 230, 'Game Over!\n' + message, { fontSize: '32px', fill: '#000' }).setOrigin(0.5);

    // Get the high scores from the server
    getScores(scene.game.userName, (scores) => {
        displayScores(scene, scores);
        const textStyle = {
            font: 'bold 24px Arial',  // Font style
            fill: '#FFF',            // Text color
            align: 'center',         // Text alignment
            wordWrap: { width: 200 } // Word wrap width
        };
    
        let startButton = scene.add.text(scene.cameras.main.centerX, 600, 'Restart game', textStyle)
        .setOrigin(0.5)
        .setPadding(10)
        .setStyle({ backgroundColor: '#111' })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => TurtleRunGame.start(name))
        .on('pointerover', () => startButton.setStyle({ fill: '#f39c12' }))
        .on('pointerout', () => startButton.setStyle({ fill: '#FFF' }))
    });

}

function nextLevel(scene) {
    seagulls.clear(true, true);
    pelicans.clear(true, true);
    jetpack_cats.clear(true, true);
    resetVars(level+1);

    let introImage = scene.add.image(scene.sys.canvas.width / 2, scene.sys.canvas.height / 2, 'intro');
    let levelText = scene.add.text(scene.sys.canvas.width / 2, scene.sys.canvas.height - 80, 'Prepare for level: ' + level, { fontSize: '32px', align: 'center', fill: '#C1423F' }).setOrigin(0.5);

    // Set a timer to remove the image and text after 3 seconds
    scene.time.delayedCall(3000, () => {
        introImage.destroy();
        levelText.destroy();
        scene.gamePaused = false;
    });
}
    
function collidedWithSeagull(player, seagull){
    this.gamePaused = true;
    this.sound.stopAll(); // Stop all sounds
    endGame(this, "Eaten by a seagull!");  
}

function collidedWithPelican(player, pelican){
    this.gamePaused = true;
    this.sound.stopAll(); // Stop all sounds
    endGame(this, "Eaten by a pelican!");    
}

function collidedCatSeagul(cat, seagull){
    seagull.destroy();
    seagullWasAvoided(this);
    cat.setVelocityX(300);
}

function collidedCatPelican(cat, pelican){
    pelican.destroy();
    cat.setVelocityX(300);
}

function seagullWasAvoided(scene) {
    seagulls_avoided++;
    total_seagulls_avoided++;
    if (seagulls_avoided >= seagulls_to_avoid) {
        scene.gamePaused = true;
        scene.time.delayedCall(500, () => {
            nextLevel(scene);
        });
    }
}

function preload() {
    this.load.image('intro', 'images/intro_image.jpg');
    this.load.image('background', 'images/background.jpg');
    this.load.image('turtle', 'images/turtle.png');
    this.load.image('seagull', 'images/seagull.png');
    this.load.image('pelican', 'images/pelican.png');
    this.load.image('jetpack_cat','images/jetpack_cat.png')

    this.load.audio('funky', 'sounds/funky.mp3');
    this.load.audio('meow', 'sounds/meow.mp3');
    this.load.audio('pelican', 'sounds/pelican.mp3');
    this.load.audio('seagull', 'sounds/seagull.mp3');
    this.load.audio('meow', 'sounds/meow.mp3')
}

function create() {
    //this.physics.world.createDebugGraphic();
    this.gamePaused = false;

    background = this.add.image(400, 400, 'background');
    infoText = this.add.text(600, 16, '', { fontSize: '14px', fill: '#000' });

    player = createSpriteWithWidth(this, 'turtle', 50, 400, 700);
    player.body.collideWorldBounds = true;
    player.body.setCircle(100, 0, 0);

    seagulls = this.physics.add.group(); // Create a group for seagulls
    pelicans = this.physics.add.group(); // Create a group for seagulls
    jetpack_cats = this.physics.add.group(); // Create a group for seagulls

    this.physics.add.collider(player, seagulls, collidedWithSeagull, null, this);
    this.physics.add.collider(player, pelicans, collidedWithPelican, null, this);
    this.physics.add.collider(jetpack_cats, seagulls, collidedCatSeagul, null, this);
    this.physics.add.collider(jetpack_cats, pelicans, collidedCatPelican, null, this);

    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-C', () => {handleCPress.call(this);});

    this.sound.play('funky', { loop: true });
}

function update() {
    var factor = 1.0 + (level / 2) * 0.3; // 30% increase in speed per every two levels
    if (num_jetpack_cats > 0) {
        document.getElementById('centerButton').style.display = 'flex';
    } else {
        document.getElementById('centerButton').style.display = 'none';
    }

    if (this.gamePaused) {
        player.setVelocityX(0);
        return;
    }

    // Create seagulls randomly
    if (remaining_seagulls > 0 && Math.floor(Math.random() * 30) === 1) {
        createSeagull(this, level);
        this.sound.play('seagull');
        remaining_seagulls--;
    }

    // Create pelicans randomly
    if (remaining_pelicans > 0 && pelicans.countActive() < level && Math.floor(Math.random() * 60) === 1) {
        createPelican(this, level);
        this.sound.play('pelican');
        remaining_pelicans--;
    }

    updatePlayerMovement(factor);

    // update seagulls
    seagulls.getChildren().forEach(seagull => {
        if (seagull.x <= 25 && seagull.body.velocity.x<0){
            seagull.body.velocity.x *= -1;
            seagull.toggleFlipX();
        }
        if (seagull.x >= this.sys.canvas.width-25 && seagull.body.velocity.x>0){
            seagull.body.velocity.x *= -1;
            seagull.toggleFlipX();
        }

        if (seagull.y >= player.y) {
            seagull.destroy(); // Remove the seagull sprite
            seagullWasAvoided(this);
         }
    });

    // update pelicans
    pelicans.getChildren().forEach(pelican => {
        if (pelican.x > player.x && pelican.body.velocity.x>0) {
            pelican.body.velocity.x *= -1;
            pelican.toggleFlipX();
        }
        if (pelican.x < player.x && pelican.body.velocity.x<0) {
            pelican.body.velocity.x *= -1;
            pelican.toggleFlipX();
        }
        if (pelican.x <= 25 && pelican.body.velocity.x<0){
            pelican.body.velocity.x *= -1;
            pelican.toggleFlipX();
        }
        if (pelican.x >= this.sys.canvas.width-25 && pelican.body.velocity.x>0){
            pelican.body.velocity.x *= -1;
            pelican.toggleFlipX();
        }
        if (pelican.y >= player.y) {
            pelican.destroy(); 
        }
    });

    //update jetpack_cat
    if (jetpack_cat_flying_time>0){
        let jetpack_cat = jetpack_cats.getChildren()[0];
        jetpack_cat_flying_time -= 1;

        let t = (100 - jetpack_cat_flying_time)/4.0;
        jetpack_cat.setVelocityY(this.sys.canvas.height * (Math.sin(t) + Math.cos(2 * t)));

        if (jetpack_cat.x >= this.sys.game.config.width) {
            jetpack_cat_flying_time = 0;
        }

        if (jetpack_cat_flying_time === 0){
            jetpack_cats.clear(true,true);
        }
    }

    let textLines = [
        'User: ' + this.game.userName,
        'Seagulls to avoid: ' + seagulls_to_avoid,
        'Seagulls avoided: ' + seagulls_avoided,
        'Level: ' + level
    ];

    if (num_jetpack_cats > 0) {
        textLines.push('Jetpack Cats (C): ' + num_jetpack_cats);
    }

    infoText.setText(textLines);
}

var touchMoving = false;

function updatePlayerMovement(factor) {
    if (cursors.left.isDown) {
        moveLeft();
    }
    else if (cursors.right.isDown) {
        moveRight();
    }
    else if (touchMoving === false){
        player.setVelocityX(0);
    }
}

function moveLeft() {
    var factor = 1.0 + (level / 2) * 0.3; // 30% increase in speed per every two levels
    player.setVelocityX(-250*factor);
}

function startMovingLeft() {
    touchMoving = true;
    moveLeft();
}

function moveRight() {
    var factor = 1.0 + (level / 2) * 0.3; // 30% increase in speed per every two levels
    player.setVelocityX(250*factor);
}

function startMovingRight() {
    touchMoving = true;
    moveRight();
}

function stopMoving() {
    touchMoving = false;
}

function handleCPress() {
    if (num_jetpack_cats > 0 && jetpack_cat_flying_time === 0) {
        num_jetpack_cats -= 1;
        jetpack_cat_flying_time = 100;
        createJetpackCat();
        TurtleRunGame.game.sound.play('meow');
    }
}

function resizeButtons() {
    const canvas = TurtleRunGame.game.canvas;
    const width = canvas.width;
    const height = canvas.height;
    let auxOffLeft = 0;
    let auxOffRight = 0;
    if (canvas.offsetLeft>40){
        auxOffLeft=-60;
        auxOffRight=+60;
    }

    // Assuming buttons are HTML elements
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');
    const centerButton = document.getElementById('centerButton');

    // Position the buttons at the bottom of the canvas
    leftButton.style.left = `${canvas.offsetLeft + auxOffLeft + 20}px`; // 20px from the left edge
    leftButton.style.bottom = `${canvas.offsetTop + 5}px`; // 20px from the bottom edge

    rightButton.style.left = `${canvas.offsetLeft + canvas.offsetWidth + auxOffRight - 60}px`; // 20px from the right edge
    rightButton.style.bottom = `${canvas.offsetTop + 5}px`;

    centerButton.style.left = `${canvas.offsetLeft + canvas.offsetWidth + auxOffRight - 60}px`; // Centered
    centerButton.style.bottom = `${canvas.offsetTop + 45}px`;
}

document.addEventListener('DOMContentLoaded', () => {
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');

    // Start moving on touch start
    leftButton.addEventListener('touchstart', (event) => {
        event.preventDefault(); // Prevent default behavior
        startMovingLeft();
    }, { passive: false });

    // Stop moving on touch end
    leftButton.addEventListener('touchend', (event) => {
        event.preventDefault(); // Prevent default behavior
        stopMoving();
    }, { passive: false });

    // Start moving on touch start
    rightButton.addEventListener('touchstart', (event) => {
        event.preventDefault(); // Prevent default behavior
        startMovingRight();
    }, { passive: false });

    // Stop moving on touch end
    rightButton.addEventListener('touchend', (event) => {
        event.preventDefault(); // Prevent default behavior
        stopMoving();
    }, { passive: false });
    
});

