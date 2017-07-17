$(document).ready(function(){
    var game_width = 853;
    var game_height = 480;
    Crafty.init(game_width,game_height);
    Crafty.background('#000');
    var mouse_x = 0;
    var mouse_y = 0;
    
    var astSpawnInterval = 3000;
    
    var assetsObj = {
        "images": [
            "logo.gif",
            "background.jpg",
            "turret.gif",
            "turret_blink.gif",
            "ship.gif",
            "ship_blink.gif",
            "ship_rockets.gif",
            "ship_norockets.gif",
            "asteroid_s.gif",
            "asteroid_m.gif",
            "asteroid_m_g.gif",
            "asteroid_l.gif",
            "asteroid_l_g.gif",
            "asteroid_x.gif",
            "asteroid_x_g.gif",
            "gold.gif"
        ],
        "audio": {
            "music": "equalAndOpposite.mp3",
            "shoot": "shoot.mp3",
            "hitBig": "hitBig.mp3",
            "hitSmall": "hitSmall.mp3",
            "getGold": "gold.mp3",
            "die": "die.mp3",
            "breakBig": "breakBig.mp3",
            "breakSmall": "breakSmall.mp3",
            "breakGold": "breakGold.mp3",
            "rocket-loop": "rocket-loop.mp3",
            "rocket-loop-fade": "rocket-loop-fade.mp3",
            "uh-oh": "uh-oh.mp3",
            "swoosh": "swooshFast.mp3",
            "menuStart": "menu.mp3"
        }
    }
    Crafty.load(assetsObj,
        function() { //when loaded
            Crafty.enterScene("intro");
        },
        function(e) { //progress
            Crafty.background('#000');
            Crafty.e('2D, DOM, Text')
                .textFont({size: '32px', family: 'Press Start 2P'})
                .textColor('#fff')
                .textAlign('center')
                .text("Loading...")
                .attr({x:-Crafty.viewport.x, y:-Crafty.viewport.y + game_height*0.3, w: game_width});
        }
        );

    var goldCount = 0;

    Crafty.c('dRotation', {
        required: '2D',
        _drotation: 0,
        _prevRotation: 0,
        init: function() {
            this.bind('Rotate', function(e) {
                this.drotation = e.deg;
            });
        }
    });
    
    Crafty.c('manualMotion', {
        init: function() {
            this.vx = 0;
            this.vy = 0;
        }
    });
    
    Crafty.c('asteroid', {
        required: '2D, manualMotion',
        init: function() {
            this.bind('EnterFrame', function() {
                this.x += this.vx;
                this.y += this.vy;
                    
                if (this.x > game_width*2-Crafty.viewport.x
                    || this.x < -Crafty.viewport.x-game_width
                    || this.y > game_height*2-Crafty.viewport.y
                    || this.y < -Crafty.viewport.y-game_height) {
                    
                    this.destroy();
                }
            });
        }
    });
    
    Crafty.c('gold', {
        _reproduce: false,
        required: '2D, manualMotion, Canvas, Image, Collision',
        init: function() {
            this.attr({w: 24, h: 24});
            this.image('gold.gif');
            this.collision(new Crafty.polygon([12,0, 15,0, 23,8, 23,15, 15,23, 8,23, 0,15, 2,10]));
            this.bind('EnterFrame', function() {
                this.x += this.vx;
                this.y += this.vy;
                    
                if (this.x > game_width+48-Crafty.viewport.x
                    || this.x < -Crafty.viewport.x-48) {
                    
                    this.destroy();
                }
            })
            this.bind('Remove', function() {
                if (this.reproduce) {
                    Crafty.trigger('goldIsGone');
                }
            });
        }
    });
    
    Crafty.c('healthbar', {
        required: '2D, Color, Canvas',
        _health: 100, //health out of 100
        init: function() {
            this.attr({w:54, h:8, z:100});
            this.color('#555');
            this.attach(new Crafty.e('2D, Canvas, Color')
                .attr({w:50, h:4, x:this.x+2, y:this.y+2, z:101})
                .color('#44ff44')
            );
            this.bind('PreRender', function() {
                this._children[0].attr({w: this.health/2});
            });
        },
        setParent: function(ent, xOffset, yOffset) {
            this.bind('ExitFrame', function() {
                this.x = ent.x+xOffset;
                this.y = ent.y+yOffset;
            });
        }
    });
    
    Crafty.c('particle', {
        required: '2D, Canvas, Color, Motion',
        init: function() {
            this.size = 4;
            this.counter = 0;
            this.lifetime = 30;
            this.inc = 1.0/30;
            this.startColor = 0xffffffff;
            this.endColor = 0xffffff00;
            this.attr({w: this.size, h: this.size, z:100, currentRGBA:[0xff, 0xff, 0xff, 0xff], colorIncs:[0, 0, 0, -15*this.inc]});
            this.color(this.currentRGBA[0],this.currentRGBA[1],this.currentRGBA[2],this.currentRGBA[3]/255.0);
            this.bind('PostRender', function() {
                for (var i=0; i<4; i++) {
                    this.currentRGBA[i] += this.colorIncs[i];
                }
                this.color(Math.round(this.currentRGBA[0]),Math.round(this.currentRGBA[1]),Math.round(this.currentRGBA[2]),this.currentRGBA[3]/255.0);
                this.counter++;
                if (this.counter >= this.lifetime) {
                    this.destroy();
                }
            });
        },
        setup: function(frames, sColor, eColor, particleSize) {
            this.lifetime = frames;
            this.inc = 1.0/frames;
            this.attr({w:particleSize, h:particleSize});
            this.startColor = sColor;
            this.endColor = eColor;
            this.currentRGBA = [(this.startColor>>24)&0xff, (this.startColor>>16)&0xff, (this.startColor>>8)&0xff, this.startColor&0xff];
            let startRGBA = [(this.startColor>>24)&0xff, (this.startColor>>16)&0xff, (this.startColor>>8)&0xff, this.startColor&0xff];
            let endRGBA = [(this.endColor>>24)&0xff, (this.endColor>>16)&0xff, (this.endColor>>8)&0xff, this.endColor&0xff];
            for (var i=0; i<4; i++) {
                this.colorIncs[i] = (endRGBA[i]-startRGBA[i])*this.inc;
            }
            return this;
        }
    });
    
    Crafty.c('particleExplosion', {
        start: function(x, y, speed, n, lifetime, lifetimeRandom, startColor, endColor, particleSize, spread) {
            for (var i=0; i<n; i++) {
                let lt = lifetime + lifetimeRandom*(Math.random()*2 -1);
                let thisX = x + spread*(Math.random()*2 -1);
                let thisY = y + spread*(Math.random()*2 -1);
                let v = new Crafty.math.Vector2D(Math.random()*2-1, Math.random()*2-1).scaleToMagnitude(speed*Math.random());
                Crafty.e('particle').attr({x:thisX, y:thisY, vx:v.x, vy:v.y}).setup(lt, startColor, endColor, particleSize);
            }
            this.destroy();
        }
    });
    
    Crafty.defineScene("intro", function() {
        var logo = Crafty.e('2D, Canvas, Image, Motion')
            .image('logo.gif')
            .attr({w:485, h:155, x:(game_width/2.0)-(485/2.0), y:(game_height/3.0)-(155/2.0), z:1000})
            .bind('started', function() {
                Crafty.audio.play("swoosh",1,0.25);
                this.attr({vy: 200, ay: -2000});
                setTimeout(function() {
                    logo.destroy();
                }, 1100);
            });
        var background = Crafty.e('2D, Canvas, Image, Motion')
            .image('background.jpg', 'repeat')
            .attr({w:game_width, h:game_height*2, x:0, y:0, vy:60, z:-1000})
            .bind('EnterFrame', function() {
                if (this.y > 0) {
                    this.y -= game_height;
                }
                if (this.vy <= 10) {
                    this.vy = 10;
                    this.ay = 0;
                    if (this.y > -1) {
                        this.vy = 0;
                        this.y = 0;
                        Crafty.trigger('secondMessage');
                    }
                }
            })
            .one('slowdown', function() {
                this.ay = -20;
            });
        var toStart = Crafty.e('2D, DOM, Text, Motion')
            .textFont({size: '16px', family: 'Press Start 2P'})
            .textColor('#ddd')
            .textAlign('center')
            .text("Press Space to Start")
            .attr({x:0, y:game_height*0.72, w:game_width})
            .bind('KeyDown', function(e) {
                if (e.key == Crafty.keys.SPACE) {
                    Crafty.trigger('started');
                }
            })
            .bind('started', function() {
                this.attr({vy: -200, ay: 2000});
                this.unbind('KeyDown');
                setTimeout(function() {
                    toStart.destroy();
                }, 1000);
            });
        var canSkipIntro = false;
        var toSkip = Crafty.e('2D, DOM, Text')
            .textFont({size: '12px', family: 'Press Start 2P'})
            .textColor('#ccc')
            .textAlign('center')
            .text("")
            .attr({x:0, y:game_height-18, w:game_width})
            .bind('KeyDown', function(e) {
                if (e.key == Crafty.keys.Z && canSkipIntro) {
                    Crafty.enterScene("arcade");
                }
            })
            .bind('started', function() {
                setTimeout(function() {
                    toSkip.text("[Z] to skip intro");
                    canSkipIntro = true;
                }, 2170);
            });
        var ship = Crafty.e('2D, Canvas, Image, Motion')
            .image('ship_rockets.gif')
            .attr({w:48, h:36, x: game_width/2-18, y:game_height+96, rotation: -90})
            .bind('started', function() {
                this.counter = 0;
                this.vy = -60;
                Crafty.audio.play("rocket-loop-fade", 1, 0.1);
            })
            .bind('EnterFrame', function() {
                if (this.y <= game_height/2+30) {
                    this.y = game_height/2+30;
                    this.vy = 0;
                    Crafty.trigger('beginfail');
                    if (background.y <= -120 && background.y >=-132) {
                        Crafty.trigger('slowdown');
                    }
                }
                if (this.counter > 5) {
                    clearInterval(this.fail);
                    this.image('ship_norockets.gif');
                    Crafty.audio.stop("rocket-loop");
                    setTimeout(function() {
                        Crafty.trigger('firstMessage');
                    }, 1000);
                }
            })
            .one('beginfail', function() {
                Crafty.audio.stop("rocket-loop-fade");
                this.beginFail = setInterval(function() {
                    ship.image('ship_norockets.gif');
                    Crafty.audio.stop("rocket-loop");
                    setTimeout(function() {
                        ship.image('ship_rockets.gif');
                        Crafty.audio.play("rocket-loop",1,0.1);
                    }, 300);
                }, 1300);
            })
            .one('slowdown', function() {
                clearInterval(this.beginFail);
                this.fail = setInterval(function() {
                    ship.image('ship_norockets.gif');
                    Crafty.audio.stop("rocket-loop",1,0.1);
                    setTimeout(function() {
                        ship.image('ship_rockets.gif');
                        Crafty.audio.play("rocket-loop",1,0.1);
                        ship.counter++;
                    }, 150);
                }, 300);
                
            });
        var gold1 = Crafty.e('gold')
            .attr({x:game_width/2-12, y: -96})
            .bind('started', function() {
                this.vy = 2;
            })
            .bind('EnterFrame', function() {
                if (this.y >= game_height*0.6) {
                    Crafty.audio.play("getGold");
                    this.destroy();
                }
            });
        var gold2 = Crafty.e('gold')
            .attr({x:game_width/2-12, y: -96})
            .bind('slowdown', function() {
                this.vy = 0.55;
            })
            .bind('EnterFrame', function() {
                if (this.y >= game_height*0.2) {
                    this.vy = 0;
                    this.y = game_height*0.2;
                }
            });
        var plot = Crafty.e('2D, DOM, Text')
            .textFont({size: '16px', family: 'Press Start 2P', lineHeight: '32px'})
            .textColor('#fff')
            .textAlign('center')
            .text("")
            .attr({x:game_width*0.25, y:game_height*0.72, w:game_width*0.5})
            .one('firstMessage', function() {
                this.text("Your engines don't work.");
                Crafty.audio.play("uh-oh");
            })
            .one('secondMessage', function() {
                this.text("");
                setTimeout(function() {
                    plot.text("And some gold is right in front of your ship.");
                    setTimeout(function() {
                        plot.text("");
                        setTimeout(function() {
                            plot.attr({x:game_width*0.2, y:game_height*0.72, w:game_width*0.6});
                            plot.text("Luckily, your plasma cannon obeys Newton's Laws of Motion.");
                            setTimeout(function() {
                                plot.text("");
                                toSkip.text("");
                                setTimeout(function() {
                                    Crafty.enterScene("arcade");
                                }, 400);
                            }, 4000)
                        }, 400);
                    }, 3500);
                }, 400);
            });
    });
    
    Crafty.defineScene("arcade", function() {
        Crafty.audio.play("music", -1);
        astSpawnInterval = 3000;
        goldCount = 0;
        var background = Crafty.e('2D, Canvas, Image')
            .image('background.jpg', 'repeat')
            .attr({x:0, y:0, z:-1000, w:game_width, h:game_height*2})
            .bind('ExitFrame', function() {
                while (-Crafty.viewport.y < this.y) {
                    this.y -= game_height;
                }
                while (-Crafty.viewport.y > this.y+game_height) {
                    this.y += game_height;
                }
            });
        var controlsHint = Crafty.e('2D, DOM, Text')
            .textFont({size: '12px', family: 'Press Start 2P', lineHeight: '32px'})
            .textColor('#ddd')
            .textAlign('center')
            .text("[Mouse to aim, Space to shoot]")
            .attr({x:game_width*0.25, y:game_height*0.72, w:game_width*0.5});
        setTimeout(function() {
            controlsHint.destroy();
        }, 5000);
        
        var firstGold = Crafty.e('gold')
            .attr({x: game_width/2-12, y: game_height*0.2});
        firstGold.reproduce = true;
            
        asteroidSpawner = null;
        setTimeout(function() {
            asteroidSpawner = setInterval(spawnRandomAsteroids, astSpawnInterval);
        }, 15000); //15000
        
        $(window).blur(function() {
            clearInterval(asteroidSpawner);
        });
        
        $(window).focus(function() {
            asteroidSpawner = setInterval(spawnRandomAsteroids, astSpawnInterval);
        });
        
        var mouse_handler = Crafty.e('2D, Canvas, Mouse, Keyboard')
            .attr({x:0, y:0, w:game_width, h:game_height})
            .bind('MouseMove', function(e){
                mouse_x = e.realX;
                mouse_y = e.realY;
            })
            .bind('ViewportScroll', function() {    
                this.lastY = this.y;
                this.x = -Crafty.viewport.x;
                this.y = -Crafty.viewport.y;
                mouse_y += this.y - this.lastY;
                
            })
            .bind('KeyDown', function(e) {
                if (e.key == Crafty.keys.ESC) {
                    Crafty.pause();
                }
            })
            .bind('Pause', function() {
                clearInterval(asteroidSpawner);
            })
            .bind('Unause', function() {
                asteroidSpawner = setInterval(spawnRandomAsteroids, astSpawnInterval);
            })
            .bind('GameOver', function() {
                clearInterval(asteroidSpawner);
                Crafty.audio.stop("music");
                console.log("Game Over");
                var GO = Crafty.e('2D, DOM, Text')
                    .textFont({size: '32px', family: 'Press Start 2P'})
                    .textColor('#fff')
                    .textAlign('center')
                    .text("Game Over")
                    .attr({x:-Crafty.viewport.x, y:-Crafty.viewport.y + game_height*0.3, w: game_width})
                    .bind('KeyUp', function(e) {
                        if (e.key == Crafty.keys.SPACE) {
                            Crafty.audio.play("menuStart");
                            setTimeout(function() {
                                Crafty.enterScene("arcade");
                            }, 10)
                        }
                    });
                Crafty.e('2D, DOM, Text')
                    .textFont({size: '16px', family: 'Press Start 2P'})
                    .textColor('#fff')
                    .textAlign('center')
                    .text("Score: "+goldCount*50)
                    .attr({x:-Crafty.viewport.x, y:-Crafty.viewport.y + game_height*0.3+48, w: game_width});
                Crafty.e('2D, DOM, Text')
                    .textFont({size: '16px', family: 'Press Start 2P'})
                    .textColor('#fff')
                    .textAlign('center')
                    .text("Gold: "+goldCount)
                    .attr({x:-Crafty.viewport.x, y:-Crafty.viewport.y + game_height*0.3+72, w: game_width});
                Crafty.e('2D, DOM, Text')
                    .textFont({size: '16px', family: 'Press Start 2P'})
                    .textColor('#fff')
                    .textAlign('center')
                    .text("Press Space to Restart")
                    .attr({x:-Crafty.viewport.x, y:-Crafty.viewport.y + game_height*0.63, w: game_width});
                Crafty.e('2D, DOM, Text')
                    .textFont({size: '12px', family: 'Press Start 2P'})
                    .textColor('#aaa')
                    .textAlign('center')
                    .text("(F5 to see the intro again)")
                    .attr({x:-Crafty.viewport.x, y:-Crafty.viewport.y + game_height-24, w: game_width});
            });
        
        var playerHealth = Crafty.e('healthbar');
        playerHealth.health = 100;
        
        var ship = Crafty.e('2D, DOM, Image, Collision')
            .image('ship.gif')
            .attr({w:36, h:36, z:10, x:game_width/2-18, y:game_height/2-18})
            .origin('center')
            .collision(new Crafty.polygon([36,18, 1,36, 1,0]))
            .onHit('asteroid', function(hitDatas) {
                if (this.has("Collision")){
                    Crafty.trigger('blinkPlayer');
                    this.timeout(function() {
                            Crafty.trigger('unblinkPlayer');
                        }, 2000);
                    var other = hitDatas[0].obj;
                    var size = 'smlx'.indexOf(other.getName().charAt(9));
                    var loss = (size+1)*(size+1)*5;
                    playerHealth.health -= loss;
                    if (playerHealth.health <= 0) {
                        setTimeout(function() {
                            Crafty.trigger('GameOver');
                        }, 1000);
                        Crafty.e('particleExplosion').start(this.x+18, this.y+18, 127, 200, 45, 15, 0xffff55ff, 0xff000033, 2, 18);
                        Crafty.audio.play("die");
                        this.destroy();
                        turret.destroy();
                        playerHealth.destroy();
                    }
                    else {
                        if (size>0) {
                            Crafty.audio.play("hitBig");
                        }
                        else {Crafty.audio.play("hitSmall");}
                    }
                }
            })
            .onHit('gold', function(hitDatas) {
                var other = hitDatas[0].obj;
                playerHealth.health = Math.min(100, playerHealth.health+15);
                Crafty.audio.play("getGold");
                other.destroy();
                goldCount++;
                if (goldCount > 0 && goldCount%5 == 0 && astSpawnInterval > 500) {
                    console.log("Level Up!");
                    astSpawnInterval -= 500;
                    clearInterval(asteroidSpawner);
                    asteroidSpawner = setInterval(spawnRandomAsteroids, astSpawnInterval);
                }
            })
            .bind('ExitFrame', function(e){
                this.x = turret.x;
                this.y = turret.y;
                if (e.frame < 10) {
                    //~ this.rotation = -90;
                }
                if (turret.drotation < 90 && turret.drotation > -90) {    
                    this.rotation += turret.drotation/50;
                }
            })
            .bind('blinkPlayer', function() {
                this.image('ship_blink.gif');
                this.removeComponent("Collision");
            })
            .bind('unblinkPlayer', function() {
                this.image('ship.gif');
                this.addComponent("Collision");
            })
            .bind('goldIsGone', function() {
                setTimeout(spawn_gold_again, 3000);
            });
        ship.rotation = -90;
        playerHealth.setParent(ship, -9, 42);
        
        var stopFollower = Crafty.e('2D, Canvas').attr({w:1, h:1, x:game_width/2, y:0});
        
        var weaponCharge = 1;
        var turret = Crafty.e('2D, DOM, Image, dRotation, manualMotion, Keyboard')
            .image('turret.gif')
            .attr({w:36, h:36, z:11})
            .origin('center')
            .attr({x:game_width/2-18, y:game_height/2-18})
            .bind('EnterFrame', function() {
                this.prevRotation = this.rotation;
                this.rotation = angle_to_mouse(this.x+this.w/2, this.y+this.h/2);
                if (this.rotation == this.prevRotation) {
                    this.drotation = 0;
                }
                
                this.x += this.vx;
                this.y += this.vy;
                
                //Loop horizontally
                if (this.x > game_width) {
                    this.x = -this.w;
                }
                if (this.x < -this.w) {
                    this.x = game_width;
                }
                
                //Tell the viewport when to follow the player
                if (this.y+this.h/2 > -Crafty.viewport.y + game_height*0.6) {
                    Crafty.viewport.follow(this, 0, game_height*(0.6-0.5));
                }
                else if (this.y+this.h/2 < -Crafty.viewport.y + game_height*0.4) {
                    Crafty.viewport.follow(this, 0, -game_height*(0.6-0.5));
                }
                else {
                    stopFollower.attr({x:game_width/2, y:-Crafty.viewport.y+game_height/2 - 0.5});
                    Crafty.viewport.follow(stopFollower, 0, 0);
                }
                
                //Charge weapon if spacebar is pushed
                if (this.isDown('SPACE') && weaponCharge < 5) {
                    weaponCharge += 0.1;
                }
            })
            .bind('KeyUp', function(e) {
                if (e.key == Crafty.keys.SPACE) {
                    create_bullet(this.x+this.w/2, this.y+this.h/2, 18, this._rotation, 5*weaponCharge);
                    this.vx -= weaponCharge*Math.cos(this._rotation*Math.PI/180);
                    this.vy -= weaponCharge*Math.sin(this._rotation*Math.PI/180);
                    var maxSpeed = 10;
                    var v = new Crafty.math.Vector2D(this.vx, this.vy);
                    if (v.magnitude() > maxSpeed) {
                        v.scaleToMagnitude(maxSpeed);
                        this.vx = v.x;
                        this.vy = v.y;
                    }
                    
                    weaponCharge = 1;
                }
            })
            .bind('blinkPlayer', function() {
                this.image('turret_blink.gif');
            })
            .bind('unblinkPlayer', function() {
                this.image('turret.gif');
            });
        
        var scoreText = Crafty.e('DOM, 2D, Text')
            .textAlign('left')
            .textFont({size: '16px', family: 'Press Start 2P'})
            .textColor('#fff')
            .attr({x: 8, y: 8})
            .bind('PreRender', function() {
                this.text(goldCount*50);
                this.x = -Crafty.viewport.x + 8;
                this.y = -Crafty.viewport.y + 8;
            })
            .bind('GameOver', function() {
                this.destroy();
            });
        
        Crafty.viewport.bounds = {min:{x:0, y:-Infinity}, max:{x:game_width, y:+Infinity}};
        
        function spawnRandomAsteroids() {
            var sizeSequence = 'smlx';
            var size = sizeSequence.charAt(Math.floor(Math.random()*4 ));
            var sizeInt = sizeSequence.indexOf(size);
            var speed = 5-sizeInt*(Math.random()*0.2 + 1.3);
            speed /= 2;
            var v = new Crafty.math.Vector2D(Math.random()*2 - 1, Math.random()*2 - 1)
                .scaleToMagnitude(speed);
            if (turret.vy > 4) {
                v = new Crafty.math.Vector2D(Math.random()*0.5 - 0.25, Math.random()*2 - 2)
                    .scaleToMagnitude(speed);
            }
            if (turret.vy < -4) {
                v = new Crafty.math.Vector2D(Math.random()*0.5 - 0.25, Math.random()*2)
                    .scaleToMagnitude(speed);
            }
            var startX=0, startY=0;
            var angle = Math.atan2(v.y, v.x); //returns value between -pi and pi
            if (angle <= Math.PI*-0.75 || angle > Math.PI*0.75) {
                startX = -Crafty.viewport.x+game_width;
                startY = -Crafty.viewport.y+Math.random()*(game_height/2)+(game_height/4);
            }
            else if (angle <= Math.PI*-0.25 && angle > Math.PI*-0.75) {
                startY = -Crafty.viewport.y + game_height;
                startX = -Crafty.viewport.x+Math.random()*(game_width/2)+(game_width/4);
            }
            else if (angle <= 0.25*Math.PI && angle > -0.25*Math.PI) {
                startX = -Crafty.viewport.x-96;
                startY = -Crafty.viewport.y+Math.random()*(game_height/2)+(game_height/4);
            }
            else if (angle <= Math.PI*0.75 && angle > Math.PI*0.25) {
                startY = -Crafty.viewport.y - 96;
                startX = -Crafty.viewport.x+Math.random()*(game_width/2)+(game_width/4);
            }
            var hasGold = false;
            var chance = Math.random()*(sizeInt)/2;
            if (chance < 0.15 && goldCount > 2) {
                hasGold = true;
            }
            var astr = spawn_asteroid(size, startX, startY, v.x, v.y, hasGold);
        }
        
        function angle_to_mouse(x, y) {
            var dx = mouse_x-x;
            var dy = mouse_y-y;
            var radians = Math.atan2(dy, dx);
            degrees = radians*180/Math.PI;
            return degrees;
        }
        
        function create_bullet(x_start, y_start, start_offset_px, angle_deg, speed) {
            var offset_x = x_start + start_offset_px*Math.cos(angle_deg*Math.PI/180);
            var offset_y = y_start + start_offset_px*Math.sin(angle_deg*Math.PI/180);
            var vx = turret.vx + speed*Math.cos(angle_deg*Math.PI/180);
            var vy = turret.vy + speed*Math.sin(angle_deg*Math.PI/180);
            Crafty.audio.play("shoot",1,0.5);
            Crafty.e('2D, Canvas, Color, Collision')
                .color('#44ff44')
                .attr({x: offset_x-2, y: offset_y-2, w:4, h:4})
                .bind('EnterFrame', function() {
                    var rayDirection = new Crafty.math.Vector2D(vx, vy).normalize();
                    var rayCast = Crafty.raycast({_x:this.x+2, _y:this.y+2}, rayDirection, speed);
                    if (rayCast.length > 0) {
                        var other = rayCast[0].obj;
                        for (var i=0; i<rayCast.length; i++) {
                            if (rayCast[i].obj.getName().startsWith('asteroid')) {
                                other = rayCast[i].obj;
                                i = rayCast.length;
                            }
                        }
                        if (other.getName().startsWith('asteroid')) {
                            Crafty.e('particleExplosion').start(this.x, this.y, 150, 30, 45, 10, 0x8a8273ff, 0x6e5c3e33, 4, 6);
                            this.destroy();
                            var thisSize = other.getName().charAt(9);
                            if (thisSize != 's') {
                                var hasGold = false;
                                if (other.getName().charAt(other.getName().length-1) == 'g') {
                                    hasGold = true;
                                }
                                var sizeSequence = 'smlx';
                                var nextSize = sizeSequence.charAt(sizeSequence.indexOf(thisSize)-1);
                                var random_v = [0,0,0,0];
                                var other_v = Math.sqrt(other.vx*other.vx + other.vy*other.vy);
                                for (var i=0; i<4; i++) {
                                    random_v[i] = other_v*Math.random()*3 - other_v*1.5;
                                }
                                if (hasGold && thisSize == 'm') {
                                    spawn_gold_at(other.x, other.y, random_v[0]/2, random_v[1]/2);
                                    spawn_gold_at(other.x, other.y, random_v[2]/2, random_v[3]/2);
                                    Crafty.audio.play("breakGold");
                                }
                                else {
                                    spawn_asteroid(nextSize, other.x+3*random_v[0], other.y+3*random_v[1], random_v[0], random_v[1], hasGold);
                                    spawn_asteroid(nextSize, other.x+3*random_v[2], other.y+3*random_v[3], random_v[2], random_v[3], hasGold);
                                    if (thisSize!='s' && thisSize!='m') {
                                        Crafty.audio.play("breakBig");
                                    }
                                    else {Crafty.audio.play("breakSmall");}
                                }
                            }
                            else {
                                Crafty.audio.play("breakSmall");
                            }
                            other.destroy();
                        }
                    }
                    if (this.x+2 < -Crafty.viewport.x-50 || this.y+2 < -Crafty.viewport.y-50 || this.x+2 > -Crafty.viewport.x+game_width+50 || this.y+2 > -Crafty.viewport.y+game_height+50) {
                        this.destroy();
                    }
                    
                    this.x += vx;
                    this.y += vy;
                });
        }
        
        function spawn_asteroid(size, start_x, start_y, start_vx, start_vy, hasGold) {
            if (size == 'x') {
                var rot_v = Math.random()*180 - 90;
                var astr = Crafty.e('2D, Canvas, Image, manualMotion, AngularMotion, Collision, asteroid')
                    .attr({x:start_x, y:start_y, vx:start_vx, vy:start_vy,
                        w:96, h:96, vrotation:rot_v})
                    .origin('center')
                    .collision(new Crafty.polygon([27,2, 79,0, 85,7, 95,62, 88,77, 40,93, 2,85, 0,67, 3,32, 12,8]));
                if (hasGold) {
                    astr.image('asteroid_x_g.gif');
                    astr.setName('asteroid_x_'+astr[0]+'_g');
                }
                else {
                    astr.image('asteroid_x.gif');
                    astr.setName('asteroid_x_'+astr[0]);
                }
            }
            else if (size == 'l') {
                var rot_v = Math.random()*270 - 135;
                var astr = Crafty.e('2D, Canvas, Image, manualMotion, AngularMotion, Collision, asteroid')
                    .attr({x:start_x, y:start_y, vx:start_vx, vy:start_vy,
                        w:72, h:72, vrotation:rot_v})
                    .origin('center')
                    .collision(new Crafty.polygon([32,0, 63,10, 71,26, 37,71, 12,70, 0,59, 10,29]));
                if (hasGold) {
                    astr.image('asteroid_l_g.gif');
                    astr.setName('asteroid_l_'+astr[0]+'_g');
                }
                else {
                    astr.image('asteroid_l.gif');
                    astr.setName('asteroid_l_'+astr[0]);
                }
            }
            else if (size == 'm') {
                var rot_v = Math.random()*360 - 180;
                var astr = Crafty.e('2D, Canvas, Image, manualMotion, AngularMotion, Collision, asteroid')
                    .attr({x:start_x, y:start_y, vx:start_vx, vy:start_vy,
                        w:48, h:48, vrotation:rot_v})
                    .origin('center')
                    .collision(new Crafty.polygon([18,0, 27,0, 45,8, 47,24, 47,31, 39,39, 23,47, 5,39, 0,31, 0,22, 10,6]));
                if (hasGold) {
                    astr.image('asteroid_m_g.gif');
                    astr.setName('asteroid_m_'+astr[0]+'_g');
                }
                else {
                    astr.image('asteroid_m.gif');
                    astr.setName('asteroid_m_'+astr[0]);
                }
            }
            else if (size=='s') {
                var rot_v = Math.random()*540 - 270;
                var astr = Crafty.e('2D, Canvas, Image, manualMotion, AngularMotion, Collision, asteroid')
                    .attr({x:start_x, y:start_y, vx:start_vx, vy:start_vy,
                        w:24, h:24, vrotation:rot_v})
                    .origin('center')
                    .collision(new Crafty.polygon([8,0, 19,0, 23,4, 23,15, 19,23, 4,23, 0,19, 0,12]))
                    .image('asteroid_s.gif');
                astr.setName('asteroid_s_'+astr[0]);
            }
            return astr;
        }
        
        function spawn_gold_again() {
            var speed = 1;
            var v = new Crafty.math.Vector2D(Math.random()*2 - 1, Math.random()*2 - 1)
                .scaleToMagnitude(speed);
            if (turret.vy > 4) {
                v = new Crafty.math.Vector2D(Math.random()*0.5 - 0.25, Math.random()*2 - 2)
                    .scaleToMagnitude(speed);
            }
            if (turret.vy < -4) {
                v = new Crafty.math.Vector2D(Math.random()*0.5 - 0.25, Math.random()*2)
                    .scaleToMagnitude(speed);
            }
            var startX=0, startY=0;
            var angle = Math.atan2(v.y, v.x); //returns value between -pi and pi
            if (angle <= Math.PI*-0.75 || angle > Math.PI*0.75) {
                startX = -Crafty.viewport.x+game_width;
                startY = -Crafty.viewport.y+Math.random()*(game_height/2)+(game_height/4);
            }
            else if (angle <= Math.PI*-0.25 && angle > Math.PI*-0.75) {
                startY = -Crafty.viewport.y + game_height;
                startX = -Crafty.viewport.x+Math.random()*(game_width/2)+(game_width/4);
            }
            else if (angle <= 0.25*Math.PI && angle > -0.25*Math.PI) {
                startX = -Crafty.viewport.x-96;
                startY = -Crafty.viewport.y+Math.random()*(game_height/2)+(game_height/4);
            }
            else if (angle <= Math.PI*0.75 && angle > Math.PI*0.25) {
                startY = -Crafty.viewport.y - 96;
                startX = -Crafty.viewport.x+Math.random()*(game_width/2)+(game_width/4);
            }
            var gld = Crafty.e('gold')
                .attr({x: startX, y: startY, vx: v.x, vy:v.y});
            gld.reproduce = true;
            return gld;
        }
        function spawn_gold_at(startX, startY, start_vx, start_vy) {
            var gld = Crafty.e('gold')
                .attr({x: startX, y: startY, vx: start_vx, vy:start_vy});
            return gld;
        }
        
    });
    
});
