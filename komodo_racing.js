function App() {
    var root = this;
    // Properties
    this.game_frame = document.getElementById("game_frame");
    this.game_canvas = document.getElementById("game_canvas");
    this.game_ctx = this.game_canvas.getContext("2d");
    Object.defineProperty(this, "width", {
        get: function() { return this.game_canvas.width; },
        set: function(w) { this.game_canvas.width = w; },
    });
    Object.defineProperty(this, "height", {
        get: function() { return this.game_canvas.height; },
        set: function(h) { this.game_canvas.height = h; },
    });
    this.style = {
        tile: {
            fillStyle: "black",
            strokeStyle: "gray",
            lineWidth: 2,
        },
        actor: {
        },
        obstacle: {
        },
        wall: {
            fillStyle: "red",
            strokeStyle: "gray",
            pad: 2,
            space: 1,
        },
    };
    this.config = {
        lanes: 3,
        get columns() {
            return 2 + 3 * this.lanes; 
        },
        rows: (5 * 5),
        get gridSize() {
            if (this.columns > this.rows) {
                return Math.floor(root.width / this.columns);
            }
            return Math.floor(root.height / this.rows);
        },
        topLeft: {
            get x() {
                if (this.columns > this.rows) {
                    return 0;
                }
                return 0.5 * (root.width - root.config.gridSize * 
                    root.config.columns);
            },
            get y() {
                if (root.width > root.height) {
                    return 0.5 * (root.height - root.config.gridSize * 
                        root.config.rows);
                }
                return 0;
            },
        },
        spacing: 6,
        start: -10,
    };

    // Core properties
    this.renderer = new Renderer(this.style, this.config);
    this.logic = new Logic(this);

    // Methods
    // It's fine to define them like this unless we create a lot of App object
    // (plus accessing sibling methods in prototype function is a bit tricky)
    this.update = function(frame_time) {
        var delta = window.performance.now() - frame_time;
        this.logic.inputUpdate(delta);
        this.logic.verticalUpdate(delta);
    }.bind(this);

    this.render = function() {
        // To do: optimize rendering (right now we simply redraw everything)
        this.renderer.clear();
        this.renderer.drawTiles();
        this.renderer.drawWall(this.logic.wallShift);
        for (var i in this.logic.obstacles) {
            this.renderer.drawObstacle(this.logic.obstacles[i].tailCol, this.logic.obstacles[i].tailRow);
        }
        this.renderer.drawActorBase(this.logic.player.tailCol, this.logic.player.tailRow);
    }.bind(this);
}

function Renderer(style, config) {
    // Properties
    this.game_frame = document.getElementById("game_frame");
    this.game_canvas = document.getElementById("game_canvas");
    this.game_ctx = this.game_canvas.getContext("2d");
    Object.defineProperty(this, "width", {
        get: function() { return this.game_canvas.width; },
        set: function(w) { this.game_canvas.width = w; },
    });
    Object.defineProperty(this, "height", {
        get: function() { return this.game_canvas.height; },
        set: function(h) { this.game_canvas.height = h; },
    });
    this.style = style;
    this.config = config;

    
    this.clearAll = function() {
        this.game_ctx.clearRect(0, 0, this.width, this.height);
    }.bind(this);

    this.clear = function() {
        this.game_ctx.clearRect(this.config.topLeft.x, this.config.topLeft.y, 
            this.config.columns * this.config.gridSize, this.config.rows * this.config.gridSize);
    }.bind(this);

    // For optimization, later...
    this.generateTiles = function() {
        var availableTiles = [];
        for (var i = 0; i < this.config.rows; ++i) {
            availableTiles.push([]);
            for (var j = 0; j < this.config.columns; ++j) {
                availableTiles[i].push(j);
            }
        }
        return availableTiles;
    }.bind(this);

    this.tile = function(col, row) {
        if (col < 0 || col >= this.config.columns || 
            row < 0 || row >= this.config.rows) {
            return;
        }
        this.game_ctx.rect(this.config.topLeft.x + col * this.config.gridSize, 
            this.config.topLeft.y + row * this.config.gridSize,
            this.config.gridSize, this.config.gridSize);
    }.bind(this);

    this.beginTile = function(fillStyle, strokeStyle, lineWidth) {
        this.game_ctx.save();
        this.game_ctx.fillStyle = fillStyle || "black";
        this.game_ctx.strokeStyle = strokeStyle || "grey";
        this.game_ctx.lineWidth = lineWidth || 2;
    }.bind(this);

    this.endTile = function() {
        this.game_ctx.fill();
        this.game_ctx.stroke();
        this.game_ctx.restore();
    }.bind(this);

    this.drawActorBase = function(tailCol, tailRow) {
        this.beginTile(this.style.actor.fillStyle || "green",
            this.style.actor.strokeStyle || "grey", 
            this.style.tile.lineWidth || 2);
        this.game_ctx.beginPath();

        this.komodo(tailCol, tailRow);

        this.endTile();
    }.bind(this);
    
    // To do: draw actor's dead animation
    
    // For now we'll use komodo as obstacle
    this.drawObstacle = function(tailCol, tailRow) {
        this.beginTile(this.style.obstacle.fillStyle || "yellow",
            this.style.obstacle.strokeStyle || "grey", 
            this.style.tile.lineWidth || 2);
        this.game_ctx.beginPath();

        this.komodo(tailCol, tailRow);

        this.endTile();
    }.bind(this);

    // Function to draw this:
    //  o 
    // ooo
    //  o 
    // ooo
    //  o   <== (tailCol, tailRow)
    this.komodo = function(tailCol, tailRow) {
        tailCol = Math.floor(tailCol);
        tailRow = Math.floor(tailRow);
        if (tailCol < 1 || tailCol >= this.config.columns - 1 ||
            tailRow < 0 || tailRow - 5 >= this.config.rows) {
                return;
            }
        this.tile(tailCol, tailRow);
        this.tile(tailCol, tailRow - 1);
        this.tile(tailCol, tailRow - 2);
        this.tile(tailCol, tailRow - 3);
        this.tile(tailCol, tailRow - 4);
        this.tile(tailCol - 1, tailRow - 1);
        this.tile(tailCol + 1, tailRow - 1);
        this.tile(tailCol - 1, tailRow - 3);
        this.tile(tailCol + 1, tailRow - 3);
    }.bind(this);

    this.drawWall = function(shift) {
        var pad = this.style.wall.pad;
        shift -= Math.floor(shift / (pad + 1)) * (pad + 1);
        this.beginTile(this.style.wall.fillStyle || "red",
            this.style.wall.strokeStyle || "grey",
            this.style.tile.lineWidth || 2);
        this.game_ctx.beginPath();

        for (var i = 0; i < this.config.rows; ++i) {
            if (shift > 0) {
                this.tile(0, i);
                this.tile(this.config.columns - 1, i);
                //this.availableTiles[i].splice(0, 1);
                //this.availableTiles[i].pop();
            }
            --shift;
            if (shift <= 0 - this.style.wall.space) {
                shift = pad;
            }
        }

        this.endTile();
    }.bind(this);

    this.drawTiles = function() {
        this.beginTile(this.style.tile.fillStyle || "black",
            this.style.tile.strokeStyle || "grey",
            this.style.tile.lineWidth || 2);
        this.game_ctx.beginPath();
        /*for (var i in this.availableTiles) {
            for (var j in this.availableTiles[i]) {
                this.tile(this.availableTiles[i][j], i);
            }
        }*/
        for (var j = 0; j < this.config.rows; ++j) {
            for (var i = 0; i < this.config.columns; ++i) {
                this.tile(i, j);
            }
        }
        this.endTile();
    }.bind(this);

    this.render_background = function() {
        this.game_ctx.save();
        this.game_ctx.fillStyle = this.style.background.fillStyle || "transparent";
        this.game_ctx.strokeStyle = this.style.background.strokeStyle || "black";
        this.game_ctx.lineWidth = this.style.background.lineWidth || 5;
        this.game_ctx.strokeRect(0, 0, this.width, this.height);
        this.game_ctx.stroke();
        this.game_ctx.restore();
    }.bind(this);

    // Configure canvas' size behavior here:
    this.on_resize = function() {
        this.width = window.innerWidth;
        this.height = window.innerHeight; 
    }.bind(this);

    // Initializer
    window.addEventListener("resize", this.on_resize);
    this.on_resize();
}

function Actor(tailCol, tailRow) {
    this._tailCol = 0;
    this._tailRow = 0;
    Object.defineProperty(this, "tailCol", {
        get: function() { return this._tailCol; },
        set: function(c) { this._tailCol = Math.floor(c); },
    });
    Object.defineProperty(this, "tailRow", {
        get: function() { return this._tailRow; },
        set: function(r) { this._tailRow = Math.floor(r); },
    });
    this.tailCol = tailCol;
    this.tailRow = tailRow;

    this.hitables = function() {
        var h = [];
        h.push({ col: this.tailCol, row: this.tailRow });
        h.push({ col: this.tailCol, row: this.tailRow - 4 });
        h.push({ col: this.tailCol - 1, row: this.tailRow - 1});
        h.push({ col: this.tailCol + 1, row: this.tailRow - 1});
        h.push({ col: this.tailCol - 1, row: this.tailRow - 3});
        h.push({ col: this.tailCol + 1, row: this.tailRow - 3});
        return h;
    }.bind(this);

    this.hit = function(col, row) {
        var hits = this.hitables();
        for (var i in hits) {
            if (col == hits[i].col && row == hits[i].row)
                return true;
        }
        return false;
    }.bind(this);

    this.crashed = function(actor) {
        var hits = actor.hitables();
        for (var i in hits) {
            if (this.hit(hits[i].col, hits[i].row))
                return true;
        }
        return false;
    }.bind(this);
}

function crashed(player, obstacle) {
    var hits = obstacle.hitables();
    for (var i in hits) {
        if (player.hit(hits[i].col, hits[i].row))
            return true;
    }
    return false;
};

function Logic(app) {
    this.app = app;
    this.config = app.config;
    this.wallShift = 0;

    // Actors
    this._player = new Actor(this.config.columns / 2, this.config.rows - 1);
    Object.defineProperty(this, "player", {
        get: function() { return this._player; },
    });
    this._obstacles = [];
    Object.defineProperty(this, "obstacles", {
        get: function() { return this._obstacles; },
    });

    // Player input
    this.keysDown = {};

    this.on_keydown = function(e) {
        this.keysDown[e.keyCode] = true;
    }.bind(this);

    this.on_keyup = function(e) {
        delete this.keysDown[e.keyCode];
    }.bind(this);

    window.addEventListener("keydown", this.on_keydown, false);
    window.addEventListener("keyup", this.on_keyup, false);
    
    // Returns a random number between min (inclusive) and max (exclusive)
    this.getRandomArbitrary = function(min, max) {
        return Math.random() * (max - min) + min;
    };

    // Returns a random integer between min (included) and max (excluded)
    // Using Math.round() will give you a non-uniform distribution!
    this.getRandomInt = function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    };

    // Returns a random integer between min (included) and max (included)
    // Using Math.round() will give you a non-uniform distribution!
    this.getRandomIntInclusive = function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    this.getRandomCol = function() {
        return this.getRandomIntInclusive(2, this.config.columns - 3);
    }.bind(this);

    this.addObstacle = function(col, row) {
        this._obstacles.push(new Actor(col, row));
    }.bind(this);

    this.prepareObstacle = function(start, spacing) {
        for (var i in this.obstacles) {
            this._obstacles[i].tailCol = this.getRandomCol();
            this._obstacles[i].tailRow = start - (5 + spacing) * i;
        }
        this.tailId = this.obstacles.length - 1;
        this.headId = 0;
    }.bind(this);

    this.reuseObstacle = function(id, spacing) {
        this._obstacles[id].tailCol = this.getRandomCol();
        this._obstacles[id].tailRow = this.obstacles[this.tailId].tailRow - 5 - spacing;
        this.tailId = id;
        this.headId = (id >= this.obstacles.length - 1) ? 0 : id + 1;
    }.bind(this);

    this.checkHit = function(id) {
        var nextId = (id >= this.obstacles.length - 1) ? 0 : id + 1;
        var prevId = (id > 0) ? id - 1 : this.obstacles.length - 1;
        return crashed(this._player, this._obstacles[id]) || 
            crashed(this._player, this._obstacles[nextId]) ||
            crashed(this._player, this._obstacles[prevId]);
    }.bind(this);

    this.onCrash = function() {
        this.prepareObstacle(this.config.start, this.config.spacing);
    }.bind(this);

    // Vertical movement logic
    this.bucket_size = 1.0;    // Controls how fast the game goes
    this._bucket = 0.0;

    this.verticalUpdate = function(delta_time) {
        this._bucket += 0.2;
        if (this._bucket >= this.bucket_size) {
            for (var i in this._obstacles) {
                if (this.obstacles[i].tailRow - 5 > this.config.rows) {
                    this.reuseObstacle(i, this.config.spacing);
                }
                this._obstacles[i].tailRow += 1;
            }
            this.wallShift += 1;
            this._bucket = 0;
            if (this.checkHit(this.headId)) {
                this.onCrash();
            }
        }
    }.bind(this);

    // User input logic
    this.input_bucket_size = 1.0;
    this._input_bucket = 0.0;

    this.inputUpdate = function(delta_time) {
        this._input_bucket += 0.2;
        if (this._input_bucket >= this.input_bucket_size) {
            if (37 in this.keysDown && this._player.tailCol > 2) {          // left key
                this._player.tailCol -= 1;
            }
            if (39 in this.keysDown && this._player.tailCol < this.config.columns - 3) {          // right key
                this._player.tailCol += 1;
            }
            this._input_bucket = 0;
        }
    }.bind(this);

    for (var i = 0; i < 5; ++i) {
        this.addObstacle(this.getRandomCol(), -5 - (5 + 5) * i);
    }
    this.prepareObstacle(this.config.start, this.config.spacing);
}

// Entry point
(function() {
    app = new App();
    function main(frame_time) {
        app.stop_main = window.requestAnimationFrame(main);

        app.update(frame_time);
        app.render();
    }
    main(window.performance.now());
})();
