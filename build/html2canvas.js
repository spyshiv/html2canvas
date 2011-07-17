/* 
 * html2canvas v0.12 <http://html2canvas.hertzen.com>
 * Copyright (c) 2011 Niklas von Hertzen. All rights reserved.
 * http://www.twitter.com/niklasvh 
 * 
 * Released under MIT License
 */

/*
 * The MIT License

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Creates a render of the element el
 * @constructor
 */

function html2canvas(el, userOptions) {

    var options = userOptions || {};
  
    
    this.opts = this.extendObj(options, {          
        logging: false,
        ready: function (canvas) {
            document.body.appendChild(canvas);
        },
        iframeDefault: "default",
        flashCanvasPath: "http://html2canvas.hertzen.com/external/flashcanvas/flashcanvas.js",
        renderViewport: false,
        reorderZ: true
    });
    
    this.element = el;
    
    var imageLoaded,
    canvas,
    ctx,
    bgx,
    bgy,
    image;
    this.imagesLoaded = 0;
    this.images = [];
    this.fontData = [];
    this.numDraws = 0;
    this.contextStacks = [];
    this.ignoreElements = "IFRAME|OBJECT|PARAM";
    this.needReorder = false;
    this.blockElements = new RegExp("(BR|PARAM)");
    
    this.ignoreRe = new RegExp("("+this.ignoreElements+")");
    
    // test how to measure text bounding boxes
    this.useRangeBounds = false;
    
    // Check disabled as Opera doesn't provide bounds.height/bottom even though it supports the method.
    // TODO take the check back into use, but fix the issue for Opera
    /*
    if (document.createRange){
        var r = document.createRange();
        this.useRangeBounds = new Boolean(r.getBoundingClientRect);
    }*/
  
    // Start script
    this.init();
    
    return this;
}
	
        
        
                                
html2canvas.prototype.init = function(){
     
    var _ = this;
       
    this.ctx = new this.stackingContext($(document).width(),$(document).height());    
              
    if (!this.ctx){
        // canvas not initialized, let's kill it here
        this.log('Canvas not available');
        return;
    }
       
    this.canvas = this.ctx.canvas;
        
    this.log('Finding background images');
        
    this.getImages(this.element);
            
    this.log('Finding images');
    this.each(document.images,function(i,e){
        _.preloadImage(_.getAttr(e,'src'));
    });
      
        
    if (this.images.length == 0){
        this.start();
    }  
        
        
}

/*
 * Check whether all assets have been loaded and start traversing the DOM
 */
 
html2canvas.prototype.start = function(){
          
    if (this.images.length == 0 || this.imagesLoaded==this.images.length/2){    
        this.log('Started parsing');
        this.bodyOverflow = document.getElementsByTagName('body')[0].style.overflow;
        document.getElementsByTagName('body')[0].style.overflow = "hidden";
       
        var ctx = this.newElement(this.element, this.ctx) || this.ctx;		
          
        this.parseElement(this.element,ctx);      
     
    }            
}


html2canvas.prototype.stackingContext = function(width,height){
    this.canvas = document.createElement('canvas');
        
    // TODO remove jQuery dependency
    this.canvas.width = $(document).width();
    this.canvas.height = $(document).height();
    
    if (!this.canvas.getContext){
           
    // TODO include Flashcanvas
    /*
        var script = document.createElement('script');
        script.type = "text/javascript";
        script.src = this.opts.flashCanvasPath;
        var s = document.getElementsByTagName('script')[0]; 
        s.parentNode.insertBefore(script, s);

        if (typeof FlashCanvas != "undefined") {
                
            FlashCanvas.initElement(this.canvas);
            this.ctx = this.canvas.getContext('2d');
        }	*/
            
    }else{
        this.ctx = this.canvas.getContext('2d');
    }    
    
    // set common settings for canvas
    this.ctx.textBaseline = "bottom";
    
    return this.ctx;
          
}

html2canvas.prototype.storageContext = function(width,height){
    this.storage = [];

    
    
    // todo simplify this whole section
    this.fillRect = function(x, y, w, h){
        this.storage.push(
        {
            type: "function",
            name:"fillRect",
            arguments:[x,y,w,h]            
        });
        
    };
        
    this.drawImage = function(image,sx,sy,sw,sh,dx,dy,dw,dh){     
        this.storage.push(
        {
            type: "function",
            name:"drawImage",
            arguments:[image,sx,sy,sw,sh,dx,dy,dw,dh]            
        });
    };
    
    this.fillText = function(currentText,x,y){
        
        this.storage.push(
        {
            type: "function",
            name:"fillText",
            arguments:[currentText,x,y]            
        });      
    }  
    
    return this;
    
}


/*
* Finished rendering, send callback
*/ 

html2canvas.prototype.finish = function(){
    this.log("Finished rendering");
    document.getElementsByTagName('body')[0].style.overflow = this.bodyOverflow;
    
    if (this.opts.renderViewport){
        // let's crop it to viewport only then
        var newCanvas = document.createElement('canvas');
        var newctx = newCanvas.getContext('2d');
        newCanvas.width = window.innerWidth;
        newCanvas.height = window.innerHeight;
            
    }
    this.opts.ready(this);          
}



    
html2canvas.prototype.drawBackground = function(el,bounds,ctx){
               
     
    var background_image = this.getCSS(el,"background-image");
    var background_repeat = this.getCSS(el,"background-repeat");
        
    if (typeof background_image != "undefined" && /^(1|none)$/.test(background_image)==false){
            
        background_image = this.backgroundImageUrl(background_image);
        var image = this.loadImage(background_image);
					

        var bgp = this.getBackgroundPosition(el,bounds,image),
        bgy;


        if (image){
            switch(background_repeat){
					
                case "repeat-x":
                    this.drawbackgroundRepeatX(ctx,image,bgp,bounds.left,bounds.top,bounds.width,bounds.height);                     
                    break;
                         
                case "repeat-y":
                    this.drawbackgroundRepeatY(ctx,image,bgp,bounds.left,bounds.top,bounds.width,bounds.height);                                             
                    break;
                          
                case "no-repeat":
                        
                    this.drawBackgroundRepeat(ctx,image,bgp.left+bounds.left,bgp.top+bounds.top,Math.min(bounds.width,image.width),Math.min(bounds.height,image.height),bounds.left,bounds.top);
                    // ctx.drawImage(image,(bounds.left+bgp.left),(bounds.top+bgp.top));	                      
                    break;
                        
                default:
                    var height,
                    add;
                        
                              
                    bgp.top = bgp.top-Math.ceil(bgp.top/image.height)*image.height;                
                        
                        
                    for(bgy=(bounds.top+bgp.top);bgy<bounds.height+bounds.top;){  
           
                        
           
                        var h = Math.min(image.height,(bounds.height+bounds.top)-bgy);
                           
                            
                        if ( Math.floor(bgy+image.height)>h+bgy){
                            height = (h+bgy)-bgy;
                        }else{
                            height = image.height;
                        }
                        // console.log(height);
                            
                        if (bgy<bounds.top){
                            add = bounds.top-bgy;
                            bgy = bounds.top;
                                
                        }else{
                            add = 0;
                        }
                                              
                        this.drawbackgroundRepeatX(ctx,image,bgp,bounds.left,bgy,bounds.width,height);  
                        if (add>0){
                            bgp.top += add;
                        }
                        bgy = Math.floor(bgy+image.height)-add; 
                    }
                    break;
                        
					
            }	
        }else{
                    
            this.log("Error loading background:" + background_image);
        //console.log(images);
        }
					
    }
}
   


/*
 * Function to retrieve the actual src of a background-image
 */

html2canvas.prototype.backgroundImageUrl = function(src){
    if (src.substr(0,5)=='url("'){
        src = src.substr(5);
        src = src.substr(0,src.length-2);                 
    }else{
        src = src.substr(4);
        src = src.substr(0,src.length-1);  
    }
    return src;            
}
    
    
/*
 * Function to retrieve background-position, both in pixels and %
 */
    
html2canvas.prototype.getBackgroundPosition = function(el,bounds,image){

    var bgposition = this.getCSS(el,"background-position").split(" "),
    top,
    left,
    percentage;

    if (bgposition.length==1){
        var val = bgposition,
        bgposition = [];
        
        bgposition[0] = val,
        bgposition[1] = val;
    }  

    if (bgposition[0].toString().indexOf("%")!=-1){   
   
        percentage = (parseFloat(bgposition[0])/100);        
        left =  ((bounds.width * percentage)-(image.width*percentage));
      
    }else{
        left = parseInt(bgposition[0],10);
    }

    if (bgposition[1].toString().indexOf("%")!=-1){  

        percentage = (parseFloat(bgposition[1])/100);     
        top =  ((bounds.height * percentage)-(image.height*percentage));
    }else{
        top = parseInt(bgposition[1],10);
    }
          
    return {
        top: top,
        left: left
    };
         
}



    
html2canvas.prototype.drawbackgroundRepeatY = function(ctx,image,bgp,x,y,w,h){
        
    var height,
    width = Math.min(image.width,w),bgy;   
            
    bgp.top = bgp.top-Math.ceil(bgp.top/image.height)*image.height;                
        
        
    for(bgy=(y+bgp.top);bgy<h+y;){   
            
         
        if ( Math.floor(bgy+image.height)>h+y){
            height = (h+y)-bgy;
        }else{
            height = image.height;
        }
        this.drawBackgroundRepeat(ctx,image,x+bgp.left,bgy,width,height,x,y);   
      
        bgy = Math.floor(bgy+image.height); 
                              
    } 
}
    
html2canvas.prototype.drawbackgroundRepeatX = function(ctx,image,bgp,x,y,w,h){
                           
    var height = Math.min(image.height,h),
    width,bgx;             
        
            
    bgp.left = bgp.left-Math.ceil(bgp.left/image.width)*image.width;                
        
        
    for(bgx=(x+bgp.left);bgx<w+x;){   

        if (Math.floor(bgx+image.width)>w+x){
            width = (w+x)-bgx;
        }else{
            width = image.width;
        }
                
        this.drawBackgroundRepeat(ctx,image,bgx,(y+bgp.top),width,height,x,y);       
             
        bgx = Math.floor(bgx+image.width); 

                                
    } 
}
    
html2canvas.prototype.drawBackgroundRepeat = function(ctx,image,x,y,width,height,elx,ely){
    var sourceX = 0,
    sourceY=0;
    if (elx-x>0){
        sourceX = elx-x;
    }
        
    if (ely-y>0){
        sourceY = ely-y;
    }

    this.drawImage(
        ctx,
        image,
        sourceX, // source X
        sourceY, // source Y 
        width-sourceX, // source Width
        height-sourceY, // source Height
        x+sourceX, // destination X
        y+sourceY, // destination Y
        width-sourceX, // destination width
        height-sourceY // destination height
        );
}
/*
 * Function to provide border details for an element
 */

html2canvas.prototype.getBorderData = function(el){
     
    var borders = [];
    var _ = this;
    this.each(["top","right","bottom","left"],function(i,borderSide){
        borders.push({
            width: parseInt(_.getCSS(el,'border-'+borderSide+'-width'),10),
            color: _.getCSS(el,'border-'+borderSide+'-color')
        });
    });
            
    return borders;
            
}




html2canvas.prototype.newElement = function(el,parentStack){
					
    var bounds = this.getBounds(el);    
            
    var x = bounds.left;
    var y = bounds.top;
    var w = bounds.width;
    var h = bounds.height;   
    var _ = this,
    image;       
    var bgcolor = this.getCSS(el,"background-color");

    var zindex = this.formatZ(this.getCSS(el,"z-index"),this.getCSS(el,"position"),parentStack.zIndex,el.parentNode);
    
    //console.log(el.nodeName+":"+zindex+":"+this.getCSS(el,"position")+":"+this.numDraws+":"+this.getCSS(el,"z-index"))
    
    var opacity = this.getCSS(el,"opacity");   
    
    //if (this.getCSS(el,"position")!="static"){
          
          /*
        this.contextStacks.push(ctx);
        
        ctx = new this.storageContext(); 
        */
       
       
    
       
       var stack = {
           ctx: new this.storageContext(),
           zIndex: zindex,
           opacity: opacity
       };
       
        var stackLength =  this.contextStacks.push(stack);
        
        var ctx = this.contextStacks[stackLength-1].ctx; 
    //}
			

    /*
     *  TODO add support for different border-style's than solid   
     */            
    var borders = this.getBorderData(el);    
    
    this.each(borders,function(borderSide,borderData){
        if (borderData.width>0){
            var bx = x,
            by = y,
            bw = w,
            bh = h-(borders[2].width);
            switch(borderSide){
                case 0:
                    // top border
                    bh = borders[0].width;
                    break;
                case 1:
                    // right border
                    bx = x+w-(borders[1].width);
                    bw = borders[1].width;                              
                    break;
                case 2:
                    // bottom border
                    by = (by+h)-(borders[2].width);
                    bh = borders[2].width;
                    break;
                case 3:
                    // left border
                    bw = borders[3].width;  
                    break;
            }		
                   
            _.newRect(ctx,bx,by,bw,bh,borderData.color);	
                
                    
          
        }
                
    });



    if (this.ignoreRe.test(el.nodeName) && this.opts.iframeDefault != "transparent"){ 
        if (this.opts.iframeDefault=="default"){
            bgcolor = "#efefef";
        /*
             * TODO write X over frame
             */
        }else{
            bgcolor = this.opts.iframeDefault;           
        }
    }
               
    // draw base element bgcolor       
    this.newRect(
        ctx,
        x+borders[3].width,
        y+borders[0].width,
        w-(borders[1].width+borders[3].width),
        h-(borders[0].width+borders[2].width),
        bgcolor
        );
           
    this.drawBackground(el,{
        left: x+borders[3].width,
        top: y+borders[0].width,
        width: w-(borders[1].width+borders[3].width),
        height: h-(borders[0].width+borders[2].width)
    }
    ,ctx);
        
    if (el.nodeName=="IMG"){
        image = _.loadImage(_.getAttr(el,'src'));
        if (image){
            
            this.drawImage(
                ctx,
                image,
                0, //sx
                0, //sy
                image.width, //sw
                image.height, //sh
                x+parseInt(_.getCSS(el,'padding-left'),10) + borders[3].width, //dx
                y+parseInt(_.getCSS(el,'padding-top'),10) + borders[0].width, // dy
                bounds.width - (borders[1].width + borders[3].width + parseInt(_.getCSS(el,'padding-left'),10) + parseInt(_.getCSS(el,'padding-right'),10)), //dw
                bounds.height - (borders[0].width + borders[2].width + parseInt(_.getCSS(el,'padding-top'),10) + parseInt(_.getCSS(el,'padding-bottom'),10)) //dh       
                );
           
        }else{
            this.log("Error loading <img>:" + _.getAttr(el,'src'));
        }
    }
    
         

        return this.contextStacks[stackLength-1];

			
				
}






/*
 * Function to draw the text on the canvas
 */ 
               
html2canvas.prototype.printText = function(currentText,x,y,ctx){
    if (this.trim(currentText).length>0){	
        
        ctx.fillText(currentText,x,y);
        this.numDraws++;
    }           
}


// Drawing a rectangle 								
html2canvas.prototype.newRect = function(ctx,x,y,w,h,bgcolor){
    
    if (bgcolor!="transparent"){
        this.setContextVariable(ctx,"fillStyle",bgcolor);
        ctx.fillRect (x, y, w, h);
        this.numDraws++;
    }
}

html2canvas.prototype.drawImage = function(ctx,image,sx,sy,sw,sh,dx,dy,dw,dh){
    ctx.drawImage(
        image,
        sx, //sx
        sy, //sy
        sw, //sw
        sh, //sh
        dx, //dx
        dy, // dy
        dw, //dw
        dh //dh      
        );
    this.numDraws++; 
    
}
/*
 * Function to find all images from <img> and background-image   
 */            
html2canvas.prototype.getImages = function(el) {
        
    var self = this;
    
    if (!this.ignoreRe.test(el.nodeName)){
        // TODO remove jQuery dependancy
        this.each($(el).contents(),function(i,element){    
            var ignRe = new RegExp("("+this.ignoreElements+")");
            if (!ignRe.test(element.nodeName)){
                self.getImages(element);
            }
        })
    }
          
    if (el.nodeType==1 || typeof el.nodeType == "undefined"){
        var background_image = this.getCSS(el,'background-image');
           
        if (background_image && background_image != "1" && background_image != "none" && background_image.substring(0,7)!="-webkit" && background_image.substring(0,4)!="-moz"){
            var src = this.backgroundImageUrl(background_image);                    
            this.preloadImage(src);                    
        }
    }
}  


/*
 * Load image from storage
 */
    
html2canvas.prototype.loadImage = function(src){	
        
    var imgIndex = this.images.indexOf(src);
    if (imgIndex!=-1){
        return this.images[imgIndex+1];
    }else{
        return false;
    }
				
}


        
html2canvas.prototype.preloadImage = function(src){
        
    if (this.images.indexOf(src)==-1){
        this.images.push(src);
                   
        var img = new Image();   
        // TODO remove jQuery dependancy
        var _ = this;
        $(img).load(function(){
            _.imagesLoaded++;               
            _.start();        
                
        });	
        img.onerror = function(){
            _.images.splice(_.images.indexOf(img.src),2);
            _.imagesLoaded++;
            _.start();                           
        }
        img.src = src; 
        this.images.push(img);
                  
    }     
          
}
    


html2canvas.prototype.canvasRenderer = function(queue){
    var _ = this;

    queue = this.sortQueue(queue);

    this.each(queue,function(i,storageContext){
       
        if (storageContext.ctx.storage){
            _.each(storageContext.ctx.storage,function(a,renderItem){
                
                switch(renderItem.type){
                    case "variable":
                        _.ctx[renderItem.name] = renderItem.arguments;              
                        break;
                    case "function":
                        if (renderItem.name=="fillRect"){
                            _.ctx.fillRect(renderItem.arguments[0],renderItem.arguments[1],renderItem.arguments[2],renderItem.arguments[3]);
                        }else if(renderItem.name=="fillText"){
                            _.ctx.fillText(renderItem.arguments[0],renderItem.arguments[1],renderItem.arguments[2]);
                        }else if(renderItem.name=="drawImage"){
                            _.ctx.drawImage(
                                renderItem.arguments[0],
                                renderItem.arguments[1],
                                renderItem.arguments[2],
                                renderItem.arguments[3],
                                renderItem.arguments[4],
                                renderItem.arguments[5],
                                renderItem.arguments[6],
                                renderItem.arguments[7],
                                renderItem.arguments[8]
                                );
                        }else{
                            this.log(renderItem);
                        }
                       
  
                        break;
                    default:
                               
                }
                
                  
            });

        }
       
    });
    
    
};     

/*
 * Sort elements based on z-index and position attributes
 */


html2canvas.prototype.sortQueue = function(queue){
    if (!this.opts.reorderZ || !this.needReorder) return queue;
    
    var longest = 0;
    this.each(queue,function(i,e){
        if (longest<e.zIndex.length){
            longest = e.zIndex.length;
        }
    });
    
    var counter = 0;
    //console.log(((queue.length).toString().length)-(count.length).toString().length);
    this.each(queue,function(i,e){
        
        var more = ((queue.length).toString().length)-((counter).toString().length);
        while(longest>e.zIndex.length){
            e.zIndex += "0";
        }
        e.zIndex = e.zIndex+counter;
        
        while((longest+more+(counter).toString().length)>e.zIndex.length){
            e.zIndex += "0";
        }
        counter++;
    //     console.log(e.zIndex);
    });
    
   
    
    queue = queue.sort(function(a,b){
        
        if (a.zIndex < b.zIndex) return -1; 
        if (a.zIndex > b.zIndex) return 1;
        return 0; 
    });
    
    
    /*

    console.log('after');
    this.each(queue,function(i,e){
        console.log(i+":"+e.zIndex); 
       // console.log(e.ctx.storage); 
    });    */
    
    return queue;
}

html2canvas.prototype.setContextVariable = function(ctx,variable,value){
    if (!ctx.storage){
        ctx[variable] = value;
    }else{
        ctx.storage.push(
        {
            type: "variable",
            name:variable,
            arguments:value            
        });
    }
  
}
            
html2canvas.prototype.newText = function(el,textNode,ctx){
       
    var family = this.getCSS(el,"font-family");
    var size = this.getCSS(el,"font-size");
    var color = this.getCSS(el,"color");
  
    var bold = this.getCSS(el,"font-weight");
    var font_style = this.getCSS(el,"font-style");

     
    var text_decoration = this.getCSS(el,"text-decoration");
               
             
    // apply text-transform:ation to the text
    textNode.nodeValue = this.textTransform(textNode.nodeValue,this.getCSS(el,"text-transform"));
    var text = textNode.nodeValue;		
			
    //text = $.trim(text);
    if (text.length>0){
        switch(bold){
            case "401":
                bold = "bold";
                break;
        }
            
            
        if (text_decoration!="none"){
            var metrics = this.fontMetrics(family,size);
            
        }    
        
          
        this.setContextVariable(ctx,"fillStyle",color);  
        this.setContextVariable(ctx,"font",bold+" "+font_style+" "+size+" "+family);
        //ctx.font = bold+" "+font_style+" "+size+" "+family;
        //ctx.fillStyle = color;
              
        var oldTextNode = textNode;
        for(var c=0;c<text.length;c++){
            var newTextNode = oldTextNode.splitText(1);

            if (this.useRangeBounds){
                // getBoundingClientRect is supported for ranges
                if (document.createRange){
                    var range = document.createRange();
                    range.selectNode(oldTextNode);
                }else{
                    // TODO add IE support
                    var range = document.body.createTextRange();
                }
                if (range.getBoundingClientRect()){
                    var bounds = range.getBoundingClientRect();
                }else{
                    var bounds = {};
                }
            }else{
                // it isn't supported, so let's wrap it inside an element instead and the bounds there
                var parent = oldTextNode.parentNode;
                var wrapElement = document.createElement('wrapper');
                var backupText = oldTextNode.cloneNode(true);
                wrapElement.appendChild(oldTextNode.cloneNode(true));
                parent.replaceChild(wrapElement,oldTextNode);
                    
                       
    
     
                    
                var bounds = this.getBounds(wrapElement);

    
                parent.replaceChild(backupText,wrapElement);      
            }
               
               
       

           
                                 
            this.printText(oldTextNode.nodeValue,bounds.left,bounds.bottom,ctx);
                    
            switch(text_decoration) {
                case "underline":	
                    // Draws a line at the baseline of the font
                    // TODO As some browsers display the line as more than 1px if the font-size is big, need to take that into account both in position and size         
                    this.newRect(ctx,bounds.left,Math.round(bounds.top+metrics.baseline+metrics.lineWidth),bounds.width,1,color);
                    break;
                case "overline":
                    this.newRect(ctx,bounds.left,bounds.top,bounds.width,1,color);
                    break;
                case "line-through":
                    // TODO try and find exact position for line-through
                    this.newRect(ctx,bounds.left,Math.ceil(bounds.top+metrics.middle+metrics.lineWidth),bounds.width,1,color);
                    break;
                    
            }	
                
            oldTextNode = newTextNode;
                  
                  
                  
        }
         
					
    }
			
}

/*
 * Function to find baseline for font with a specicic size
 */
html2canvas.prototype.fontMetrics = function(font,fontSize){
    
    
    var findMetrics = this.fontData.indexOf(font+"-"+fontSize);
    
    if (findMetrics>-1){
        return this.fontData[findMetrics+1];
    }
    
    var container = document.createElement('div');
    document.getElementsByTagName('body')[0].appendChild(container);
    
    // jquery to speed this up, TODO remove jquery dependancy
    $(container).css({
        visibility:'hidden',
        fontFamily:font,
        fontSize:fontSize,
        margin:0,
        padding:0
    });
    

    
    var img = document.createElement('img');
    img.src = "http://html2canvas.hertzen.com/images/8.jpg";
    img.width = 1;
    img.height = 1;
    
    $(img).css({
        margin:0,
        padding:0
    });
    var span = document.createElement('span');
    
    $(span).css({
        fontFamily:font,
        fontSize:fontSize,
        margin:0,
        padding:0
    });
    
    
    span.appendChild(document.createTextNode('Hidden Text'));
    container.appendChild(span);
    container.appendChild(img);
    var baseline = (img.offsetTop-span.offsetTop)+1;
    
    container.removeChild(span);
    container.appendChild(document.createTextNode('Hidden Text'));
    
    $(container).css('line-height','normal');
    $(img).css("vertical-align","super");
    var middle = (img.offsetTop-container.offsetTop)+1;  
    
    var metricsObj = {
        baseline: baseline,
        lineWidth: 1,
        middle: middle
    };
    
    
    this.fontData.push(font+"-"+fontSize);
    this.fontData.push(metricsObj);
    
    $(container).remove();
    
    
    
    return metricsObj;
    
}


/*
 * Function to apply text-transform attribute to text
 */    
html2canvas.prototype.textTransform = function(text,transform){
    switch(transform){
        case "lowercase":
            return text.toLowerCase();
            break;
					
        case "capitalize":
            return text.replace( /(^|\s|:|-|\(|\))([a-z])/g , function(m,p1,p2){
                return p1+p2.toUpperCase();
            } );
            break;
					
        case "uppercase":
            return text.toUpperCase();
            break;
        default:
            return text;
				
    }
        
}
     
     
     
/*
 *Function to trim whitespace from text
 */
html2canvas.prototype.trim = function(text) {
    return text.replace(/^\s*/, "").replace(/\s*$/, "");
}
 
    
html2canvas.prototype.parseElement = function(element,ctx){
    var _ = this;    
    this.each(element.children,function(index,el){	   
        _.parsing(el,{
            ctx:ctx
        });	
    });
        
    this.canvasRenderer(this.contextStacks);
    this.finish();
}


        
html2canvas.prototype.parsing = function(el,stack){
    
    var _ = this;
    
    //if (!this.blockElements.test(el.nodeName)){
        
        stack = this.newElement(el,stack) || stack;
    
    
        var ctx = stack.ctx;
    
   
        if (!this.ignoreRe.test(el.nodeName)){
            
         		
        
            // TODO remove jQuery dependancy

            var contents = this.contentsInZ(el);
            
        
            if (contents.length == 1){
	
                // check nodeType
                if (contents[0].nodeType==1){
                    // it's an element, so let's look inside it
                    this.parsing(contents[0],stack);
                }else if (contents[0].nodeType==3){   
                    // it's a text node, so lets print the text
                
                    this.newText(el,contents[0],stack.ctx);
                }
            }else{
		
                this.each(contents,function(cid,cel){
					
                    if (cel.nodeType==1){
                        // element
                        _.parsing(cel,stack);								
                    }else if (cel.nodeType==3){   
                        _.newText(el,cel,ctx);
                    }              
						
                });
                
            }
        }	
    
   // }
}
    

// Simple logger
html2canvas.prototype.log = function(a){
    
    if (this.opts.logging){
        
        var logger = window.console.log || function(log){
            alert(log);
        };
    /*
        if (typeof(window.console) != "undefined" && console.log){
            console.log(a);
        }else{
            alert(a);
        }*/
    }
}                    


/**
 * Function to provide bounds for element
 * @return {Bounds} object with position and dimension information
 */
html2canvas.prototype.getBounds = function(el){
        
    window.scroll(0,0);
        
    if (el.getBoundingClientRect){	
        var bounds = el.getBoundingClientRect();	
        bounds.top = bounds.top;
        bounds.left = bounds.left;
        return bounds;
    }else{
            
        // TODO remove jQuery dependancy
        var p = $(el).offset();       
          
        return {               
            left: p.left + parseInt(this.getCSS(el,"border-left-width"),10),
            top: p.top + parseInt(this.getCSS(el,"border-top-width"),10),
            width:$(el).innerWidth(),
            height:$(el).innerHeight()                
        }

    }           
}
    
     
     
/*
 * Function for looping through array
 */
html2canvas.prototype.each = function(arrayLoop,callbackFunc){
    callbackFunc = callbackFunc || function(){};
    for (var i=0;i<arrayLoop.length;i++){       
        callbackFunc(i,arrayLoop[i]);
    }
}


/*
 * Function to get childNodes of an element in the order they should be rendered (based on z-index)
 * reference http://www.w3.org/TR/CSS21/zindex.html
 */

html2canvas.prototype.contentsInZ = function(el){
    
    // TODO remove jQuery dependency
    
    var contents = $(el).contents();
    
    return contents;
 
}

    
/*
 * Function for fetching the element attribute
 */  
html2canvas.prototype.getAttr = function(el,attribute){
    return el.getAttribute(attribute);
//return $(el).attr(attribute);
}

/*
 * Function to extend object
 */
html2canvas.prototype.extendObj = function(options,defaults){
    for (var key in options){              
        defaults[key] = options[key];
    }
    return defaults;           
}


html2canvas.prototype.leadingZero = function(num,size){
    
    var s = "000000000" + num;
    return s.substr(s.length-size);    
}    
    
html2canvas.prototype.formatZ = function(zindex,position,parentZ,parentNode){
    
    if (!parentZ){
        parentZ = "0";
    }


    if (position!="static" && parentZ.charAt(0)=="0"){
        this.needReorder = true;
        parentZ = "1"+parentZ.slice(1);        
    }

    if (zindex=="auto"){
        var parentPosition = this.getCSS(parentNode,"position");
        if (parentPosition!="static" && typeof parentPosition != "undefined"){
            zindex = 0;
        }else{
            return parentZ;
        }
    }
    
    var b = this.leadingZero(this.numDraws,9);  
    
    
    var s = this.leadingZero(zindex+1,9);

    // var s = "000000000" + num;
    return parentZ+""+""+s+""+b;
    
    
    
}
    
/*
 * Get element childNodes
 */
    
html2canvas.prototype.getContents = function(el){
    return (el.nodeName ==  "iframe" ) ?
    el.contentDocument || el.contentWindow.document :
    el.childNodes;
}

    
/*
 * Function for fetching the css attribute
 * TODO remove jQuery dependancy
 */
html2canvas.prototype.getCSS = function(el,attribute){
    return $(el).css(attribute);
}
