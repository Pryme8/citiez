var engine = null;
importScripts('./Vector2.js');
Object.prototype.length = function(){
	var l=0;
	for(key in this){
		 if (this.hasOwnProperty(key)) l++;
	}
	return l;
};

onmessage = function(e) {
var type = null;
  if(e.data.length){
  	type = e.data[0];
  }
	switch(type){
	case "init" :  engine = new wEngine(e.data[1]);
	break;
	case "syncMaps" :  engine.syncMaps(e.data[1]);
	break;
	case "updateData" :  engine.updateData(e.data[1], e.data[2]);
	break;
	case "setOrigin" :  engine.updateOrigin(e.data[1]);
	break;
	case "startStep" :  engine._startStep();
	break;
	
	}
}

wEngine = function(){
	this.step = [];
	this.rules = {};
	this.maps = {};
	this.n = 0;
	this.alphabet = {};
	this.origin = new vec2();
	this.roadData = null;
	this.buildAlphabet();
	this.intVal = null;
	this.maxThreads = 12;
	this.treads = [];
	this.brain = {i:0, cIO:0, done:0}
	this.brain.stack = [];
	this.brain.cleanup = [];
};



wEngine.prototype.drawPoint = function(point, color){
	var x = point[0]+this.origin.x;
	var y = point[1]+this.origin.y;
	this.updateRoadData([x,y], color);
	postMessage(['Draw_Point', point, color]);

};

wEngine.prototype.updateRoadData = function(point, data){
	var map = this.maps['roads'];
	var index = (point[0] + point[1] * map.width) * 4;
	map.data[index] = data[0];
	map.data[index+1] = data[1];
	map.data[index+2] = data[2];
	map.data[index+3] = data[3];
};



wEngine.prototype.think = function(msg){
	var type = msg[0];
	switch(type){
		case 'start-stack':
		var maxThreads = this.maxThreads;
		if(this.brain.stack.length < maxThreads){
			maxThreads = this.brain.stack.length;
		}
		
				
		for(var i=0; i<maxThreads; i++){
			this.brain.cIO++;
			this.brain.i++;
			this.brain.stack[i].start();
			
		}
		
		
		break;
		case 'calculate-stack':
		this.brain.done = 0; this.brain.i = 0; this.brain.cIO = 0;
			this.brain.stack = this.step[this.n+1];
		break;
		case 'thread-done':
			//console.log(this.brain);
			this.brain.cIO--;
			this.brain.done++;
			
			if(this.brain.done < this.brain.stack.length){
				if(typeof this.brain.stack[this.brain.i] != 'undefined'){
				this.brain.cIO++;
				this.brain.stack[this.brain.i].start();
				this.brain.i++;
				}				
			}else{
			//DONE!					
				console.log('done');
				
				//START CLEAN UP!
				

				//this.step[this.n+1] = this.brain.cleanup;
				
				//this.brain.stack = [];
				this.brain.i = 0;
				this.brain.cID = 0;
				this.brain.done = 0;
				this.n++;
				postMessage(['step_complete']);
				//console.log(this);
			}
		break;
		case 'add-axiom':
				this.brain.cleanup.push(msg[1]);
				//console.log("New Axiom Added to cleanup phase!");
		break;
	};
};

wEngine.prototype.syncMaps = function(mapData){
	this.maps = mapData;
	console.log('Worker Synced Maps');
	console.log(this.maps);
};

wEngine.prototype.updateData = function(target, mapData){
	this.maps[target] = mapData;
	postMessage(['Map_Updated', target, mapData]);
};

wEngine.prototype.updateOrigin = function(loc){
	this.origin = new vec2(loc[0], loc[1]);
	postMessage(['Origin_Updated', loc]);
};





axiom = function(letter, repo, startPos, grandparent){
	this.letter = letter;
	if(typeof repo == 'string'){this.repo = repo.split('')}else{this.repo = repo};
	
	this.position = new vec2();	
	this.startPos = startPos || new vec2();

	if(grandparent){
	this.grandparent = grandparent;
	}
	this.path = [];
	this.dropped = [];
	
	this.intVal = null;
	
	return this;
};

axiom.prototype.start = function(){
	var self = this;
	this.intVal = setInterval(function(){self._run()},1000/30);
};

axiom.prototype.stop = function(){
	clearInterval(this.intVal);
};

axiom.prototype._run = function(){
	var state = this.grandparent.rules[this.letter](this);
	if(state == 'done'){
		this.stop();
		this.grandparent.think(['thread-done', axiom]);
	};
};

wEngine.prototype.addLetter = function(letter, repo, rule){
	this.alphabet[letter] = new axiom(letter,repo);
	
	if(this.alphabet.length() == 1){
		this.step.push([new axiom(letter,repo)]);
		return
	};
	
	this.rules[letter] = rule;
	
};


wEngine.prototype.buildAlphabet = function(){
	var gp = this;
	this.addLetter("O", "ABCD", function(axiom){
		
		
	});
	
	this.addLetter("A", "", function(ax){
		if(!ax.state){
			ax.state = 'run';	
			ax.spawnInt = 0;
			ax.spawnGap = 50;
			ax.position = ax.startPos.clone();
					ax.baseMode = new vec2(0,-1);
		}

		
		if(ax.intVal != null){
		var popSurvey = new survey(ax.position.clone().add(gp.origin), gp.maps['population']);
		var roadSurvey = new survey(ax.position.clone().add(gp.origin), gp.maps['roads']);
		//console.log(JSON.stringify(roadSurvey[5]));
		var roadHit = false; var intersectionHit = false;
		
		//Check of North Point is Clear
		var mainPath = popSurvey[1][0]/255;
		var popClamp = 0.65;
		if(ax.state != 'done'){
		if(mainPath>popClamp){
			if(roadSurvey[1][0]==255){
				roadHit = true;
			}
			
			if(roadSurvey[1][1]==255 && roadSurvey[1][2]== 255){
				intersectionHit = true;	
			}
			
			if(!intersectionHit){
				ax.mode = ax.baseMode;
				var np = ax.position.clone().add(ax.mode);
				//console.log(np);
				ax.path.push([np.x,np.y]);
				ax.position = np.clone();
				gp.drawPoint([np.x,np.y], [255,0,0,255]);
			
				if(ax.spawnInt < ax.spawnGap){
					ax.spawnInt++;
				}else{
					ax.spawnInt = 0;
					gp.drawPoint([np.x,np.y], [0,255,255,255]);	
					//CHECK EAST AND WEST ROUTES TO CONTINUE PRIMARY ROAD OR SECONDARY.
					var altA = popSurvey[3][0]/255;
					var altB = popSurvey[5][0]/255;
				if(altA>popClamp){
					var newAxiom = new axiom('D','',np.clone(),gp);
					gp.think(['add-axiom', newAxiom]);
					
				}
				if(altB>popClamp){
					var newAxiom = new axiom('B','',np.clone(),gp);
					gp.think(['add-axiom', newAxiom]);
					
				}
				
				
				}
			}else{
				var np = ax.position.clone();
				gp.drawPoint([np.x,np.y], [0,255,255,255]);
				ax.state = 'done';	
			}
		}else{
			
			//Check Left and Right Point to see which has higher population, and follow that route. until North has more population count prevent switching back.
			var altA = popSurvey[3][0]/255;
			var altB = popSurvey[5][0]/255;
			//console.log(west+"|"+east);
			
			if(altB > popClamp || altA > popClamp){
				if(altA > altB && ax.modeClamp != 'altB'){
					if(roadSurvey[5][0]==255){
						roadHit = true;
					}
			
					if(roadSurvey[5][1]==255 && roadSurvey[5][2]== 255){
						intersectionHit = true;	
					}
					//console.log('wants to travel east');
				ax.mode = new vec2(1,0);
				ax.position = ax.position.clone().add(ax.mode);
				ax.modeClamp = 'altA';
				}else if(altA<altB && ax.modeClamp != 'altA'){
				if(roadSurvey[3][0]==255){
						roadHit = true;
					}
			
					if(roadSurvey[3][1]==255 && roadSurvey[3][2]== 255){
						intersectionHit = true;	
					}
				ax.mode = new vec2(-1,0);
				ax.position = ax.position.clone().add(ax.mode);
				ax.modeClamp = 'altB';
				}else{
				ax.state = 'done';	
				}
				var np = ax.position.clone();
				if(!intersectionHit){				
				ax.path.push([np.x,np.y]);
				gp.drawPoint([np.x,np.y], [255,0,0,255]);
				}else{
				gp.drawPoint([np.x,np.y], [0,255,255,255]);
				ax.state = 'done';	
				}
				
				
			}else{			
			ax.state = 'done';	
			}
			
		}
				
		
		}
		}
		
		return ax.state;
	});
	
	this.addLetter("B", "", function(ax){
		if(!ax.state){
			ax.state = 'run';	
			ax.spawnInt = 0;
			ax.spawnGap = 50;
			ax.position = ax.startPos.clone();
					ax.baseMode = new vec2(1,0);
		}

		
		if(ax.intVal != null){
		var popSurvey = new survey(ax.position.clone().add(gp.origin), gp.maps['population']);
		var roadSurvey = new survey(ax.position.clone().add(gp.origin), gp.maps['roads']);
		//console.log(JSON.stringify(roadSurvey[5]));
		var roadHit = false; var intersectionHit = false;
		
		//Check of North Point is Clear
		var mainPath = popSurvey[5][0]/255;
		var popClamp = 0.65;
		if(ax.state != 'done'){
		if(mainPath>popClamp){
			if(roadSurvey[5][0]==255){
				roadHit = true;
			}
			
			if(roadSurvey[5][1]==255 && roadSurvey[5][2]== 255){
				intersectionHit = true;	
			}
			
			if(!intersectionHit){
				ax.mode = ax.baseMode;
				var np = ax.position.clone().add(ax.mode);
				//console.log(np);
				ax.path.push([np.x,np.y]);
				ax.position = np.clone();
				gp.drawPoint([np.x,np.y], [255,0,0,255]);
			
				if(ax.spawnInt < ax.spawnGap){
					ax.spawnInt++;
				}else{
					ax.spawnInt = 0;
					gp.drawPoint([np.x,np.y], [0,255,255,255]);	
					//CHECK EAST AND WEST ROUTES TO CONTINUE PRIMARY ROAD OR SECONDARY.
					var altA = popSurvey[1][0]/255;
					var altB = popSurvey[7][0]/255;
				if(altA>popClamp){
					var newAxiom = new axiom('A','',np.clone(),gp);
					gp.think(['add-axiom', newAxiom]);
					
				}
				if(altB>popClamp){
					var newAxiom = new axiom('C','',np.clone(),gp);
					gp.think(['add-axiom', newAxiom]);
					
				}
				
				
				}
			}else{
				var np = ax.position.clone();
				gp.drawPoint([np.x,np.y], [0,255,255,255]);
				ax.state = 'done';	
			}
		}else{
			
			//Check Left and Right Point to see which has higher population, and follow that route. until North has more population count prevent switching back.
			var altA = popSurvey[1][0]/255;
			var altB = popSurvey[7][0]/255;
			//console.log(west+"|"+east);
			
			if(altB > popClamp || altA > popClamp){
				if(altA > altB && ax.modeClamp != 'altB'){
					if(roadSurvey[1][0]==255){
						roadHit = true;
					}
			
					if(roadSurvey[1][1]==255 && roadSurvey[1][2]== 255){
						intersectionHit = true;	
					}
					//console.log('wants to travel east');
				ax.mode = new vec2(0,-1);
				ax.position = ax.position.clone().add(ax.mode);
				ax.modeClamp = 'altA';
				}else if(altA<altB && ax.modeClamp != 'altA'){
				if(roadSurvey[7][0]==255){
						roadHit = true;
					}
			
					if(roadSurvey[7][1]==255 && roadSurvey[7][2]== 255){
						intersectionHit = true;	
					}
				ax.mode = new vec2(0,1);
				ax.position = ax.position.clone().add(ax.mode);
				ax.modeClamp = 'altB';
				}else{
				ax.state = 'done';	
				}
				
				var np = ax.position.clone();
				if(!intersectionHit){				
				ax.path.push([np.x,np.y]);
				gp.drawPoint([np.x,np.y], [255,0,0,255]);
				}else{
				gp.drawPoint([np.x,np.y], [0,255,255,255]);
				ax.state = 'done';	
				}
				
				
			}else{			
			ax.state = 'done';	
			}
			
		}
				
		
		}
		}
		
		return ax.state;
	});
	
	this.addLetter("C", "", function(ax){
		if(!ax.state){
			ax.state = 'run';	
			ax.spawnInt = 0;
			ax.spawnGap = 50;
			ax.position = ax.startPos.clone();
					ax.baseMode = new vec2(0,1);
		}

		
		if(ax.intVal != null){
		var popSurvey = new survey(ax.position.clone().add(gp.origin), gp.maps['population']);
		var roadSurvey = new survey(ax.position.clone().add(gp.origin), gp.maps['roads']);
		//console.log(JSON.stringify(roadSurvey[5]));
		var roadHit = false; var intersectionHit = false;
		
		//Check of North Point is Clear
		var mainPath = popSurvey[7][0]/255;
		var popClamp = 0.65;
		if(ax.state != 'done'){
		if(mainPath>popClamp){
			if(roadSurvey[7][0]==255){
				roadHit = true;
			}
			
			if(roadSurvey[7][1]==255 && roadSurvey[7][2]== 255){
				intersectionHit = true;	
			}
			
			if(!intersectionHit){
				ax.mode = ax.baseMode;
				var np = ax.position.clone().add(ax.mode);
				//console.log(np);
				ax.path.push([np.x,np.y]);
				ax.position = np.clone();
				gp.drawPoint([np.x,np.y], [255,0,0,255]);
			
				if(ax.spawnInt < ax.spawnGap){
					ax.spawnInt++;
				}else{
					ax.spawnInt = 0;
					gp.drawPoint([np.x,np.y], [0,255,255,255]);	
					//CHECK EAST AND WEST ROUTES TO CONTINUE PRIMARY ROAD OR SECONDARY.
					var altA = popSurvey[5][0]/255;
					var altB = popSurvey[3][0]/255;
				if(altA>popClamp){
					var newAxiom = new axiom('B','',np.clone(),gp);
					gp.think(['add-axiom', newAxiom]);
					
				}
				if(altB>popClamp){
					var newAxiom = new axiom('D','',np.clone(),gp);
					gp.think(['add-axiom', newAxiom]);
					
				}
				
				
				}
			}else{
				var np = ax.position.clone();
				gp.drawPoint([np.x,np.y], [0,255,255,255]);
				ax.state = 'done';	
			}
		}else{
			
			//Check Left and Right Point to see which has higher population, and follow that route. until North has more population count prevent switching back.
			var altA = popSurvey[5][0]/255;
			var altB = popSurvey[3][0]/255;
			//console.log(west+"|"+east);
			
			if(altB > popClamp || altA > popClamp){
				if(altA > altB && ax.modeClamp != 'altB'){
					if(roadSurvey[5][0]==255){
						roadHit = true;
					}
			
					if(roadSurvey[5][1]==255 && roadSurvey[5][2]== 255){
						intersectionHit = true;	
					}
					//console.log('wants to travel east');
				ax.mode = new vec2(1,0);
				ax.position = ax.position.clone().add(ax.mode);
				ax.modeClamp = 'altA';
				}else if(altA<altB && ax.modeClamp != 'altA'){
				if(roadSurvey[3][0]==255){
						roadHit = true;
					}
			
					if(roadSurvey[3][1]==255 && roadSurvey[3][2]== 255){
						intersectionHit = true;	
					}
				ax.mode = new vec2(-1,0);
				ax.position = ax.position.clone().add(ax.mode);
				ax.modeClamp = 'altB';
				}else{
				ax.state = 'done';	
				}
				
				var np = ax.position.clone();
				if(!intersectionHit){				
				ax.path.push([np.x,np.y]);
				gp.drawPoint([np.x,np.y], [255,0,0,255]);
				}else{
				gp.drawPoint([np.x,np.y], [0,255,255,255]);
				ax.state = 'done';	
				}
				
				
			}else{			
			ax.state = 'done';	
			}
			
		}
				
		
		}
		}
		
		return ax.state;
	});
	
this.addLetter("D", "", function(ax){
		if(!ax.state){
			ax.state = 'run';	
			ax.spawnInt = 0;
			ax.spawnGap = 50;
			ax.position = ax.startPos.clone();
					ax.baseMode = new vec2(-1,0);
		}

		
		if(ax.intVal != null){
		var popSurvey = new survey(ax.position.clone().add(gp.origin), gp.maps['population']);
		var roadSurvey = new survey(ax.position.clone().add(gp.origin), gp.maps['roads']);
		//console.log(JSON.stringify(roadSurvey[5]));
		var roadHit = false; var intersectionHit = false;
		
		//Check of North Point is Clear
		var mainPath = popSurvey[3][0]/255;
		var popClamp = 0.65;
		if(ax.state != 'done'){
		if(mainPath>popClamp){
			if(roadSurvey[3][0]==255){
				roadHit = true;
			}
			
			if(roadSurvey[3][1]==255 && roadSurvey[3][2]== 255){
				intersectionHit = true;	
			}
			
			if(!intersectionHit){
				ax.mode = ax.baseMode;
				var np = ax.position.clone().add(ax.mode);
				//console.log(np);
				ax.path.push([np.x,np.y]);
				ax.position = np.clone();
				gp.drawPoint([np.x,np.y], [255,0,0,255]);
			
				if(ax.spawnInt < ax.spawnGap){
					ax.spawnInt++;
				}else{
					ax.spawnInt = 0;
					gp.drawPoint([np.x,np.y], [0,255,255,255]);	
					//CHECK EAST AND WEST ROUTES TO CONTINUE PRIMARY ROAD OR SECONDARY.
					var altA = popSurvey[1][0]/255;
					var altB = popSurvey[7][0]/255;
				if(altA>popClamp){
					var newAxiom = new axiom('A','',np.clone(),gp);
					gp.think(['add-axiom', newAxiom]);
					
				}
				if(altB>popClamp){
					var newAxiom = new axiom('C','',np.clone(),gp);
					gp.think(['add-axiom', newAxiom]);
					
				}
				
				
				}
			}else{
				var np = ax.position.clone();
				gp.drawPoint([np.x,np.y], [0,255,255,255]);
				ax.state = 'done';	
			}
		}else{
			
			//Check Left and Right Point to see which has higher population, and follow that route. until North has more population count prevent switching back.
			var altA = popSurvey[1][0]/255;
			var altB = popSurvey[7][0]/255;
			//console.log(west+"|"+east);
			
			if(altB > popClamp || altA > popClamp){
				if(altA > altB && ax.modeClamp != 'altB'){
					if(roadSurvey[1][0]==255){
						roadHit = true;
					}
			
					if(roadSurvey[1][1]==255 && roadSurvey[1][2]== 255){
						intersectionHit = true;	
					}
					//console.log('wants to travel east');
				ax.mode = new vec2(0,-1);
				ax.position = ax.position.clone().add(ax.mode);
				ax.modeClamp = 'altA';
				}else if(altA<altB && ax.modeClamp != 'altA'){
				if(roadSurvey[7][0]==255){
						roadHit = true;
					}
			
					if(roadSurvey[7][1]==255 && roadSurvey[7][2]== 255){
						intersectionHit = true;	
					}
				ax.mode = new vec2(0,1);
				ax.position = ax.position.clone().add(ax.mode);
				ax.modeClamp = 'altB';
				}else{
				ax.state = 'done';	
				}
				var np = ax.position.clone();
				if(!intersectionHit){				
				ax.path.push([np.x,np.y]);
				gp.drawPoint([np.x,np.y], [255,0,0,255]);
				}else{
				gp.drawPoint([np.x,np.y], [0,255,255,255]);
				ax.state = 'done';	
				}
				
				
			}else{			
			ax.state = 'done';	
			}
			
		}
				
		
		}
		}
		
		return ax.state;
	});
	
	
};

survey = function(loc, map){
	var grid = 
	[
		[-1,-1],[ 0,-1],[ 1, -1],
		[-1, 0],[ 0, 0],[ 1,  0],
		[-1, 1],[ 0, 1],[ 1,  1]
	];
	
	var newData = []
	for(var i=0; i<grid.length; i++){
	var pos = loc.clone().add(new vec2(grid[i][0],grid[i][1]));

	var pI = (pos.x + pos.y * map.width) * 4;
	newData.push([map.data[pI],map.data[pI+1],map.data[pI+2],map.data[pI+3]]);
	};
	
	return newData;
};


wEngine.prototype._startStep = function(){
	if(this.brain.cleanup.length){
		this.step.push(this.brain.cleanup);
		this.brain.cleanup = [];
	}else{
		this.step.push([]);
	}
	
	//Check Last Step, and Spawn Correct Axioms
	for(var i=0; i< this.step[this.n].length; i++){
		var parentAxiom = this.step[this.n][i];
		var repo = parentAxiom.repo;
		for(var j = 0; j < repo.length; j++){
			
			var a = parentAxiom.repo[j];
			var dFlag = false;
				for(var k=0; k<parentAxiom.dropped.length; k++){
					if(a == parentAxiom.dropped[k]){dFlag = true; k=parentAxiom.dropped.length;}
				};
			
			if(!dFlag){
			var l = this.alphabet[a];
			var position = parentAxiom.position || new vec2();
			var newAx = new axiom(l.letter, l.repo, position, this);
			//console.log('New Axiom -> '+JSON.stringify(newAx));
			this.rules[a](newAx);
			this.step[this.n+1].push(newAx);
			}
		};
	};
	this.think(['calculate-stack']);
	this.think(['start-stack']);
	//console.log(this);
};



