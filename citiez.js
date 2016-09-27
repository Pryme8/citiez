//Citiez 0.0.1 prototype
// Author Andrew V Butt Sr.
// Pryme8@gmail.com


Object.prototype.length = function(){
	var l=0;
	for(key in this){
		 if (this.hasOwnProperty(key)) l++;
	}
	return l;
};



citiez = function(name, args, output){
	this.name = name || 'New-City';
	this.args = args || {};
	this.core = new citiez.core(this);
	this.worker = new Worker('./citiez.worker.js');
	var self = this;
	this.worker.onmessage = function(e){
		var type = e.data[0];
		switch(type){
			case 'Map_Updated':
			console.log('worker updated data from image');
			self.core.maps[e.data[1]] = e.data[2];
			break;
			case 'Origin_Updated':
			console.log('Worker Origin Set to:'+e.data[1][0]+":"+e.data[1][1]);
			self.drawOrigin();
			break;			
			case 'Draw_Point':
			var cvas = document.getElementById('roads');
			var ctx = cvas.getContext('2d');
			ctx.fillStyle = 'rgba('+e.data[2][0]+','+e.data[2][1]+','+e.data[2][2]+','+e.data[2][3]+')';
			ctx.fillRect(e.data[1][0]+self.core.origin.x,e.data[1][1]+self.core.origin.y, 1 , 1);
			break;
			case 'step_complete':
			console.log('worker finished Step');				
			self.core.n++;
			document.getElementById('current-step').innerHTML = self.core.n;
			self.proccessing = false;
			break;
		};
	};
	
	this.worker.postMessage(['init']);
	//this.core.maps['roads'] = (document.getElementById('roads')).getContext('2d');
	
	this.core.syncWorkerMaps(this.worker);
	
	return this;
};

citiez.core = function(parent){
	this.parent = parent;
	this.alphabet = {};
	this.rules = {};
	this.step = [];
	this.n = 0;
	this.origin = new vec2();
	this.maps = {
		'roads' : this.generateMapData('roads'),
		'population' : this.generateMapData('population'),
		'elevation' : this.generateMapData('elevation'),
		};
	
	return this;
};

citiez.core.prototype.generateMapData = function(target){
	var cvas = document.getElementById(target);
	var ctx = cvas.getContext('2d');
	var data = ctx.getImageData(0,0,cvas.width,cvas.height);
	return data;	
};

citiez.core.prototype.syncWorkerMaps = function(worker){
	worker.postMessage(['syncMaps', this.maps])
};

citiez.core.prototype.updateData = function(target, data){
	var cvas = document.getElementById(target);
	var ctx = cvas.getContext('2d');
	var data = ctx.getImageData(0,0,cvas.width,cvas.height);
	
	this.parent.worker.postMessage(['updateData', target, data]);
};

citiez.prototype.setOrigin = function(loc){
	console.log("setting Origin");
	this.core.origin = loc;
	this.worker.postMessage(['setOrigin', [loc.x, loc.y]]);
	
};


citiez.prototype.loadImage = function(url, target){
	var img = new Image();
	var self = this;
	img.onload = function(){
		var cvas = document.getElementById(target);
		cvas.width = self.args.width, cvas.height = self.args.height;
		var ctx = cvas.getContext('2d');
		ctx.drawImage(this,0,0);

			if(target == 'elevation'){
				var imgDat = ctx.getImageData(0, 0, self.args.width, self.args.height);
			
			var data = imgDat.data;
				for (var i = 0; i < data.length; i += 4) {
      			data[i]     =  data[i];     // red
      			data[i + 1] = 0; // green
      			data[i + 2] = 255 - data[i+2]; // blue
				data[i + 3] = Math.floor(255*0.5); // blue
    			}
			ctx.putImageData(imgDat, 0, 0);
			}
			var data = ctx.getImageData(0, 0, self.args.width, self.args.height);
			self.core.updateData(target, data);
	};
	img.src = url;
};

citiez.prototype.drawOrigin = function(){
	var ctx = (document.getElementById('overlay')).getContext('2d');
	ctx.clearRect(0,0,this.args.width,this.args.height);
		ctx.fillStyle="rgba(0,255,255,1)";	
		ctx.beginPath();
		ctx.arc(this.core.origin.x,this.core.origin.y,3,0,2*Math.PI);
		ctx.fill();	
};




citiez.prototype.createPopulationMap = function(file){
	var reader = new FileReader();
	
	var self = this;
	 reader.onload = function(e) {
    			self.loadImage(e.target.result, 'population');
		}
	reader.readAsDataURL(file);
};

citiez.prototype.createPopulationMapURL = function(url){
			this.loadImage(url, 'population');
};

citiez.prototype.createElevationMap = function(file){
	var reader = new FileReader();
	
	var self = this;
	 reader.onload = function(e) {
    			self.loadImage(e.target.result, 'elevation');
		}
	reader.readAsDataURL(file);
};

citiez.prototype.takeStep = function(){
	if(this.proccessing == true){return};
	this.proccessing = true;
	

	
	console.log('TAKING STEP:'+this.core.n);
	this.worker.postMessage(['startStep']);	

};


/*
citiez.map = function(name, url, parent){
	this.parent = parent;
	this.url = url;
	this.name = name || 'New-Map';
	this.img = new Image();
	var self = this;
	this.img.onload = function(){
		var cvas = document.createElement('canvas');
		cvas.width = this.width, cvas.height = this.height;
		var ctx = cvas.getContext('2d');
		ctx.drawImage(this,0,0);
		parent.core.maps[name] = cvas.getContext('2d');
		if(self.parent.output){
			if(self.name == 'population'){
		 	cvas = self.parent.output.querySelector('.out-population');
			ctx = cvas.getContext('2d');
			ctx.drawImage(this,0,0);
			}else
			if(self.name == 'elevation'){
			cvas = self.parent.output.querySelector('.out-elevation');
			ctx = cvas.getContext('2d');
			ctx.drawImage(this,0,0);
			var imgDat = ctx.getImageData(0, 0, this.width, this.height);
			self.parent.core.width = this.width;
			self.parent.core.height = this.height;
			var data = imgDat.data;
				for (var i = 0; i < data.length; i += 4) {
      			data[i]     =  data[i];     // red
      			data[i + 1] = 0; // green
      			data[i + 2] = 0; // blue
				data[i + 3] = 165; // blue
    			}


			ctx.putImageData(imgDat, 0, 0);
			
			
			}
			
		}
	};
	this.img.src = url;
};





citiez.prototype._run = function(i, n, skip){
	
	if(i<this.core.step[n].length){
	 var node = this.core.step[n][i];
	 var repo = node.repo;
	
		for(var j = 0; j < repo.length; j++){
			
			var a = repo[j];
			
			var l = this.core.alphabet[a];
			var newAx = new citiez.axiom(l.letter, l.repo, node, this);
			this.core.rules[a](newAx);
			this.core.step[n+1].push(newAx);
		}
	
	
	
	i++;
	this._run(i,n,skip);		
	}else{
	this.proccessing = false;
		
	}	
};

citiez.prototype.init = function(){
	var w = this.core.width;
	var h = this.core.height;
	w*=0.5;h*=0.5;

	this.core.origin = new vec2(w - this.core.origin.x, h - this.core.origin.y);
	
};
*/






citiez.prototype.getLocationValue = function(loc, target){
	if(target){
		var origin = this.core.origin.clone();
		target = (this.core.maps[target]).getImageData(origin.x - loc.x, origin.y - loc.y, 1, 1).data;	
	}

	return target;	
};








