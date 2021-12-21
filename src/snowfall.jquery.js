/*  Snowfall jquery plugin

    ====================================================================
    LICENSE
    ====================================================================
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing, software
       distributed under the License is distributed on an "AS IS" BASIS,
       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
       See the License for the specific language governing permissions and
       limitations under the License.
    ====================================================================

    Version 2.0 Dec 21st 2021
    Forked from version 1.74 https://github.com/loktar00/JQuery-Snowfall
    Heavily modified and cleaned up for thewellcommunity.org 

    Version 1.7.4
    Bug fixes, removed requestAnimationFrame polyfill.

    Updated to use gulpjs for build process.

    Version 1.6 Dec 8th 2012
    Added the ability to use images as snow flakes instead of just solid colored elements.

    $(element).snowfall({image :"images/flake.png", minSize: 10, maxSize:32});
    Pure version

    snowFall.snow(elementCollection, {image : "images/flake.png", minSize: 10, maxSize:32});
    elementCollection can be any valid element such as document.body

    Version 1.51 Dec 2nd 2012
    fixed bug where snow collection didn't happen if a valid doctype was declared.

    Version 1.5 Oct 5th 2011
    Added collecting snow! Uses the canvas element to collect snow. In order to initialize snow collection use the following

    $(document).snowfall({collection : 'element'});

    element = any valid jquery selector.

    The plugin then creates a canvas above every element that matches the selector, and collects the snow. If there are a varrying amount of elements the
    flakes get assigned a random one on start they will collide.

    Version 1.4 Dec 8th 2010
    Fixed issues (I hope) with scroll bars flickering due to snow going over the edge of the screen.
    Added round snowflakes via css, will not work for any version of IE. - Thanks to Luke Barker of http://www.infinite-eye.com/
    Added shadows as an option via css again will not work with IE. The idea behind shadows, is to show flakes on lighter colored web sites - Thanks Yutt

    Version 1.3.1 Nov 25th 2010
    Updated script that caused flakes not to show at all if plugin was initialized with no options, also added the fixes that Han Bongers suggested

    Developed by Jason Brown for any bugs or questions email me at loktar69@hotmail
    info on the plugin is located on Somethinghitme.com

    values for snow options are

    flakeCount,
    flakeColor,
    flakeIndex,
    minSize,
    maxSize,
    minSpeed,
    maxSpeed,
    round,      true or false, makes the snowflakes rounded if the browser supports it.
    shadow      true or false, gives the snowflakes a shadow if the browser supports it.

    Example Usage :
    $(document).snowfall({flakeCount : 100, maxSpeed : 10});

    -or-

    $('#element').snowfall({flakeCount : 800, maxSpeed : 5, maxSize : 5});

    -or with defaults-

    $(document).snowfall();

    - To clear -
    $('#element').snowfall('clear');
*/

// requestAnimationFrame polyfill from https://github.com/darius/requestAnimationFrame
if (!Date.now)
    Date.now = function() { return new Date().getTime(); };

(function() {
    'use strict';

    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
        var vp = vendors[i];
        window.requestAnimationFrame = window[vp+'RequestAnimationFrame'];
        window.cancelAnimationFrame = (window[vp+'CancelAnimationFrame']
                                   || window[vp+'CancelRequestAnimationFrame']);
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) // iOS6 is buggy
        || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
        var lastTime = 0;
        window.requestAnimationFrame = function(callback) {
            var now = Date.now();
            var nextTime = Math.max(lastTime + 16, now);
            return setTimeout(function() { callback(lastTime = nextTime); },
                              nextTime - now);
        };
        window.cancelAnimationFrame = clearTimeout;
    }
}());

(function($){
    $.snowfall = function(element, options)
    {
        var flakes = [],
            defaults = 
            {
                flakeCount : 35,
                flakeColor : '#ffffff',
                flakePosition: 'absolute',
                flakeIndex: 999999,
                minSize : 1,
                maxSize : 2,
                minSpeed : 1,
                maxSpeed : 5,
                round : false,
                shadow : false,
                collection : false,
                collectionHeight : 40,
                deviceorientation : false
            },
            options = $.extend(defaults, options),
            random = function random(min, max)
            {
                return Math.round(min + Math.random()*(max-min));
            };

        $(element).data("snowfall", this);

        // Snow flake object
        function Flake(_x, _y, _size, _speed)
        {
            // Flake properties
            this.x  = _x;
            this.y  = _y;
            this.size = _size;
            this.speed = _speed;
            this.step = 0;
            this.stepSize = random(1,10) / 100;

            //select a random collector canvas
            if(options.collection) { this.target = canvasCollection[random(0,canvasCollection.length - 1)]; }

            var flakeMarkup = null;

            // create the flake DOM element
            if(options.image)
            {
                flakeMarkup = document.createElement("img");
                flakeMarkup.src = options.image;
            } else
            {
                flakeMarkup = document.createElement("div");
                $(flakeMarkup).css({'background' : options.flakeColor});
            }

            //set the flake element attributes
            $(flakeMarkup)
                .attr({ 'class': 'snowfall-flakes', })
                .css(
                {
                    'width' : this.size,
                    'height' : this.size,
                    'position' : options.flakePosition,
                    'top' : this.y,
                    'left' : this.x,
                    'fontSize' : 0,
                    'zIndex' : options.flakeIndex
                });

            //check if the snow container is the document or specific element
            if($(element).get(0).tagName === $(document).get(0).tagName)
            {
                //add the flake to the body for document snow container
                $('body').append($(flakeMarkup));
                element = $('body');
            } else
            {
                //add the flake to a specific snow container
                $(element).append($(flakeMarkup));
            }

            this.element = flakeMarkup;

            // Update function, used to update the snow flakes, and checks current snowflake against bounds
            this.update = function()
            {
                //calculate the next y position
                this.y += this.speed;

                //check if the flake has fallen beyond the document/snow container
                if(this.y > elHeight - (this.size + 6)) { this.reset(); }

                //set the new flake position
                this.element.style.top = this.y + 'px';
                this.element.style.left = this.x + 'px';

                //increment the x step value
                this.step += this.stepSize;

                //calculate the next x position based on device orientation
                if (doRatio === false) 
                {
                    this.x += Math.cos(this.step);
                } else 
                {
                    this.x += (doRatio + Math.cos(this.step));
                }

                // Pileup check
                // make sure collection is enabled and a target exists for this flake
                if(options.collection && this.target)
                {
                    //check if the flake has collided with it's target canvas area
                    if(this.x > this.target.x && this.x < this.target.width + this.target.x && 
                        this.y > this.target.y && this.y < this.target.height + this.target.y)
                    {
                        var ctx = this.target.element.getContext("2d"),
                            curX = this.x - this.target.x,
                            curY = this.y - this.target.y,
                            colData = this.target.colData;
                        
                        //TODO: figure out how collision data works
                        if(colData[parseInt(curX)][parseInt(curY + this.speed + this.size)] !== undefined || curY + this.speed + this.size > this.target.height)
                        {
                            if(curY+this.speed + this.size > this.target.height)
                            {
                                while(curY+this.speed + this.size > this.target.height && this.speed > 0){ this.speed *= .5; }

                                ctx.beginPath();
                                ctx.fillStyle = defaults.flakeColor;

                                if(colData[parseInt(curX)][parseInt(curY + this.speed + this.size)] == undefined)
                                {
                                    colData[parseInt(curX)][parseInt(curY + this.speed + this.size)] = 1;
                                    //ctx.fillRect(curX, (curY)+this.speed+this.size, this.size, this.size);
                                    //ctx.arc(curX, (curY)+this.speed+this.size, this.size / 2, 0, 2 * Math.PI, false);
                                    ctx.ellipse(curX + (this.size / 2.5), curY + this.speed + (this.size * 1.25), this.size / 1.25, this.size / 2.75, 0, 0, 2 * Math.PI);
                                } else
                                {
                                    colData[parseInt(curX)][parseInt(curY+this.speed)] = 1;
                                    //ctx.fillRect(curX, curY+this.speed, this.size, this.size);
                                    //ctx.arc(curX, (curY)+this.speed, this.size / 2, 0, 2 * Math.PI, false);
//ctx.fillStyle = 'green'; //DEBUG
                                    ctx.ellipse(curX + (this.size / 2.5), curY + this.speed + (this.size * 1.75), this.size / 1.25, this.size / 2.75, 0, 0, 2 * Math.PI);
                                }
                                ctx.fill();
                                this.reset();
                            }else
                            {
                                // flow to the sides
                                this.speed = 1;
                                this.stepSize = 0;

                                if(parseInt(curX)+1 < this.target.width && colData[parseInt(curX) + 1][parseInt(curY) + 1] == undefined )
                                {
                                    // go left
                                    this.x++;
                                } else if(parseInt(curX) - 1 > 0 && colData[parseInt(curX) - 1][parseInt(curY) + 1] == undefined )
                                {
                                    // go right
                                    this.x--;
                                } else
                                {
                                    //stop
                                    ctx.beginPath();
                                    ctx.fillStyle = defaults.flakeColor;
                                    //ctx.fillRect(curX, curY, this.size, this.size);
                                    //ctx.arc(curX, curY, this.size / 2, 0, 2 * Math.PI, false);
//ctx.fillStyle = 'blue'; //DEBUG
                                    ctx.ellipse(curX + (this.size / 2.5), curY + (this.size * 1.25), this.size / 1.25, this.size / 2.75, 0, 0, 2 * Math.PI);
                                    ctx.fill();
                                    colData[parseInt(curX)][parseInt(curY)] = 1;
                                    this.reset();
                                }
                            }
                        }
                    }
                }

                if(this.x + this.size > (elWidth) - widthOffset || this.x < widthOffset) { this.reset(); }
            }

            // Resets the snowflake once it reaches one of the bounds set
            this.reset = function()
            {
                this.y = 0;
                this.x = random(widthOffset, elWidth - widthOffset);
                this.stepSize = random(1,10) / 100;
                this.size = random((options.minSize * 100), (options.maxSize * 100)) / 100;
                this.element.style.width = this.size + 'px';
                this.element.style.height = this.size + 'px';
                this.speed = random(options.minSpeed, options.maxSpeed);
            }
        }

        // local vars
        var i = 0,
            elHeight = $(element).height(),
            elWidth = $(element).width(),
            widthOffset = 0,
            collectionPadding = 10,
            snowTimeout = 0,
            snowAnimReq = 0;

        // Collection Piece ******************************
        if(options.collection !== false)
        {
            var testElem = document.createElement('canvas');
            if(!!(testElem.getContext && testElem.getContext('2d')))
            {
                var canvasCollection = [],
                    collectionHeight = options.collectionHeight,
                    //get the elements that should collect snow
                    elements = $(options.collection);

                for(var i =0; i < elements.length; i++)
                {
                    var $parent = $(elements[i]);
                    //get the position relative to the document
                    var parentOffset = $parent.offset(),
                        parentWidth = $parent.innerWidth(),
                        canvasWidth = Math.round(parentWidth - (collectionPadding * 2)),
                    //get the bounds relative to the viewport
                    //var bounds = elements[i].getBoundingClientRect(),
                        $canvas = $('<canvas/>', { 'class' : 'snowfall-canvas' }),
                        collisionData = [];

                    //if(bounds.top - collectionHeight > 0)
                    //{
                        $('body').append($canvas);

                        $canvas.css(
                        {
                        	'pointer-events' : 'none',
                            'position' : options.flakePosition,
                            'left'     : Math.round(parentOffset.left + collectionPadding) + 'px',
                            'top'      : Math.round(parentOffset.top - collectionHeight) + 'px',
                            //'left'     : bounds.left + window.scrollX + 'px',
                            //'top'      : bounds.top + window.scrollY - collectionHeight + 'px',
                        	'z-index' : '1'
                        })
                        .prop(
                        {
                            width: canvasWidth,
                            //width: bounds.width,
                            height: collectionHeight
                        });

                        for(var w = 0; w < canvasWidth; w++){ collisionData[w] = []; }

                        canvasCollection.push(
                        {
                            element : $canvas.get(0),
                            parent: $parent,
                            x : Math.round(parentOffset.left + collectionPadding),
                            y : Math.round(parentOffset.top - collectionHeight),
                            width : canvasWidth,
                            //x : bounds.left,
                            //y : bounds.top - collectionHeight,
                            //width : bounds.width,
                            height: collectionHeight,
                            colData : collisionData
                        });
                    //}
                }
            }else{
                // Canvas element isnt supported
                options.collection = false;
            }
        }
        // ************************************************

        // This will reduce the horizontal scroll bar from displaying, when the effect is applied to the whole page
        if ($(element).get(0).tagName === $(document).get(0).tagName) { widthOffset = 25; }

        // Bind the window resize event so we can get the innerHeight again
        var resizeTimeout = false,
            resizeDelay = 250;
        $(window).bind("resize", function()
        {
            elHeight = $(element)[0].clientHeight;
            elWidth = $(element)[0].offsetWidth;

            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(reinitCollection, resizeDelay);
        });

        // re-initialize the collection canvases
        function reinitCollection()
        {
            //resize/reposition collection canvases
            for (var i = 0; i < canvasCollection.length; i++)
            {
                var canvasData = canvasCollection[i],
                    $parent = canvasData.parent,
                    parentOffset = $parent.offset(),
                    parentWidth = $parent.innerWidth(),
                    canvasWidth = Math.round(parentWidth - (collectionPadding * 2)),
                    ctx = canvasData.element.getContext('2d'),
                    collisionData = [];

                // clear the current canvas contents
                ctx.clearRect(0, 0, canvasData.width, canvasData.height);

                // set the element styles
                $(canvasData.element).css(
                {   
                    'left' : Math.round(parentOffset.left + collectionPadding) + 'px',
                    'top'  : Math.round(parentOffset.top - collectionHeight) + 'px'
                })
                .prop({ width: canvasWidth });
                
                for (var w = 0; w < canvasWidth; w++) { collisionData[w] = []; }

                // update the canvas collection item
                canvasData.x = Math.round(parentOffset.left + collectionPadding);
                canvasData.y = Math.round(parentOffset.top - collectionHeight);
                canvasData.width = canvasWidth;
                canvasData.colData = collisionData;
            }
        }

        // initialize the flakes
        for(i = 0; i < options.flakeCount; i+=1)
        {
            flakes.push(new Flake(random(widthOffset, elWidth - widthOffset), random(0, elHeight), random((options.minSize * 100), (options.maxSize * 100)) / 100, random(options.minSpeed, options.maxSpeed)));
        }

        // This adds the style to make the snowflakes round via border radius property
        if(options.round)
        {
            $('.snowfall-flakes').css({'-moz-border-radius' : options.maxSize, '-webkit-border-radius' : options.maxSize, 'border-radius' : options.maxSize});
        }

        // This adds shadows just below the snowflake so they pop a bit on lighter colored web pages
        if(options.shadow)
        {
            $('.snowfall-flakes').css({'-moz-box-shadow' : '1px 1px 1px #555', '-webkit-box-shadow' : '1px 1px 1px #555', 'box-shadow' : '1px 1px 1px #555'});
        }

        // On newer Macbooks Snowflakes will fall based on deviceorientation
        var doRatio = false;
        if (options.deviceorientation) 
        {
            $(window).bind('deviceorientation', function(event) { doRatio = event.originalEvent.gamma * 0.1; });
        }

        // this controls flow of the updating snow
        function snow()
        {
            for( i = 0; i < flakes.length; i += 1){ flakes[i].update(); }

            //snowTimeout = setTimeout(function(){snow()}, 30);
            snowTimeout = setTimeout(function() { snowAnimReq = requestAnimationFrame(function(){snow()}); }, 30);
        }

        snow();

        // clears the snowflakes
        this.clear = function()
        {
            $('.snowfall-canvas').remove();
            $(element).children('.snowfall-flakes').remove();
            clearTimeout(snowTimeout);
            cancelAnimationFrame(snowAnimReq);
        }
    };

    // Initialize the options and the plugin
    $.fn.snowfall = function(options)
    {
        if(typeof(options) == "object" || options == undefined)
        {
            return this.each(function(i) { (new $.snowfall(this, options)); });
        } 
        else if (typeof(options) == "string") 
        {
            return this.each(function(i)
            {
                var snow = $(this).data('snowfall');
                if(snow){ snow.clear(); }
            });
        }
    };
})(jQuery);

//CUSTOM INITIALIZATION
$(document).ready(function ()
{
    //Backdrop not necessary with dark backgrounds
    //var $Backdrop = $('<div class="Backdrop"></div>');

    //$('body').prepend($Backdrop).addClass('Snow');

    //$Backdrop.fadeIn(2500, function ()
    //{
        $(document).snowfall(
        {
            image :"/themes/thewellv9/assets/images/snowflake.png",
            collection: '#zone-hero .tagline, #zone-hero .btn-default, section.featured-banner, section.ministry-schedule, section.ministry-schedule .btn-primary',
            round: true,
            minSize: 6,
            maxSize: 15,
            flakeCount: 140,
            minSpeed: 2,
            maxSpeed: 5
        });
        setTimeout(function () { $('body').addClass('Snowing'); }, 1000);
    //});

    //clear the snow when the user plays a video
    var vimeoPlayer = $('.vimeoplayer iframe').data('player');
    vimeoPlayer.on('play', function() { $(document).snowfall('clear'); $('body').removeClass('Snowing'); console.log('Stop Snow'); });
});