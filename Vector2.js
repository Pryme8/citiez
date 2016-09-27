//2016 Andrew V Butt Sr. Pryme8@gmail.com
//Vector2 Object.
//Common 2d array functions.

vec2 = function(x,y){  //Create the Basic Vector Object.
	x = x || 0;  //Make sure there is some sort of value;
	y = y || 0;
	this.x = x;
	this.y = y;
	return this;
};

vec2.prototype.copy = function(vec) {
	this.x = vec.x;
	this.y = vec.y;
    return this;
};

vec2.prototype.clone = function (vec) {
	var x = this.x;
	var y = this.y;
    return new vec2(x, y); //Make a new Instances of the vector.
};

vec2.prototype.perp = function() { //Get the Perpendicular angle;
    var x = this.x;
	var y = this.y;
    this.x = y;
    this.y = -x;
    return this;
};

vec2.prototype.rotate = function (angle) { //Rotate a vec by an angle in radians.
    var x = this.x;
    var y = this.y;
    this.x = x * Math.cos(angle) - y * Math.sin(angle);
    this.y = x * Math.sin(angle) + y * Math.cos(angle);
    return this;
};

vec2.prototype.reverse = function() { //Reverse the Vector
    this.x = -this.x;
    this.y = -this.y;
    return this;
};

vec2.prototype.normalize = function() { //Normalize the Vector
    var d = this.len();
    if(d > 0) {
      this.x = this.x / d;
      this.y = this.y / d;
    }
    return this;
};

vec2.prototype.add = function(input) { //ADD OTHER VECTOR
    this.x += input.x;
    this.y += input.y;
    return this;
};

vec2.prototype.subtract = function(input) { //SUBTRACT OTHER VECTOR
    this.x -= input.x;
    this.y -= input.y;
    return this;
};

vec2.prototype.scale = function(x,y) { //SCALE THE VECTOR BY THE X or and X AND Y
    this.x *= x;
    this.y *= y || x;
    return this; 
};

vec2.prototype.dot = function(input) {
    return (this.x * input.x + this.y * input.y);
};


vec2.prototype.len2 = function() {
    return this.dot(this);
};
vec2.prototype.len = function() {
    return Math.sqrt(this.len2());
};

vec2.prototype.project = function(axis) {  //Project a vector onto anouther.
    var t = this.dot(axis) / axis.len2();
    this.x = t * axis.x;
    this.y = t * axis.y;
    return this;
};

vec2.prototype.projectN = function(axis) { //Project onto a vector of unit length.
    var t = this.dot(axis);
    this.x = t * axis.x;
    this.y = t * axis.y;
    return this;
};

vec2.prototype.reflect = function(axis) { //Reflect vector to a vector.
    var x = this.x;
    var y = this.y;
    this.project(axis).scale(2);
    this.x -= x;
    this.y -= y;
    return this;
};

vec2.prototype.reflectN = function(axis) {  //Reflect on an Arbitrary Axis
    var x = this.x;
    var y = this.y;
    this.projectN(axis).scale(2);
    this.x -= x;
    this.y -= y;
    return this;
};

vec2.prototype.getValue = function(v){  //Returns value of float or array,
	if((v == 'x' || v == 0) ){
		return parseFloat(this.x);
	}else if((v == 'y' || v == 1)){
		return parseFloat(this.y);
	}else{
		return [this.x,this.y];
	}
}