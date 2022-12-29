/*eslint-env es6*/

//VARIABLES----------------------------------------
//button selectors
var playBtn = document.getElementById('play'); //play button
var pauseBtn = document.getElementById('pause'); //pause button
var fwdBtn = document.getElementById('fwd'); //fast forward button
var rewBtn = document.getElementById('rew'); //rewind button
var flipBtn = document.getElementById('flip'); //flip tape button

//sounds & array
var sideA = new Howl({ 
	src:['https://bafybeihjzr6jlwat4f6hny3mlqutrxsd4sqbqtm6avxuamhjot2w7nb5km.ipfs.dweb.link/SideA.mp3'], 
	onend:function(){unpop(); sides[0].seek(sides[0].duration()-1); scaleSpools();} 
}); //first audio track
var sideB = new Howl({ 
	src:['https://bafybeihmw7nh4q4v67ioyiips2op6hapbitovdv4s4e2ko4nxvq6xqse74.ipfs.dweb.link/SideB.mp3'], 
	onend:function(){unpop(); sides[1].seek(sides[1].duration()-1); scaleSpools();} 
}); //second audio track
var sides = [sideA, sideB]; //allows each side to be referenced independently
var cassette = sides[0]; //complile the tracks into one cassette tape

//rewind sound variables
var rewinding = false; // is the cassette rewinding?
var rewInt; //id for the rewind interval so the clear function can kill it
var rewSpd = 125; //set the speed at which to call rewind() ⛓ changes the pace of the rewind ⛓
var chop = .666; //set the distance between audio keyframes ⛓ changes the chop of the rewind ⛓

//animation variables
var lastPop; //the most recent button clicked

var casBody = document.getElementById('casBody'); //cassette body svg
var faceA = document.getElementById('faceA'); //art for side A
var faceB = document.getElementById('faceB'); //art for side B

var svgDoc; //svg file text

var gears = []; //rotating gears while cassette plays
var rotDeg = 0; //sets rotation degrees to accept a number
var gearInt; //id for the gear rotation interval so the clear function can kill it

var fadeDur = 200; //how long it takes the art to change

var spools = []; //scaling spools while cassette plays
var maxSpool = 1.25; //the biggest the spool can get
var minSpool = maxSpool/2; //the smallest the spool can get

//loading variables
var loadInt;
var loader = document.getElementById('loading'); //flip tape button

//LOAD EVENTS----------------------------------------
//set a load interval for the sounds when the page loads
window.addEventListener("load", function(){ loadInt = setInterval(loading, 1); }, true); 

//once cassette is not loading, 
function loading(){
	if(cassette.state() != "loading"){
		clearInterval(loadInt); //end the load interval
		$(loader).fadeOut(); //clear the spinning loader
		//setInterval(tapeLog, 2000); //debug log
	}else(null)
}

//debug log
/*function tapeLog(){
	console.log("A: "+sides[0].seek()+", B: "+sides[1].seek())
	console.log("Left Spool: "+(maxSpool-((cassette.seek()/cassette.duration())*minSpool))+ " Right Spool: "+(minSpool+((cassette.seek()/cassette.duration())*minSpool)));
	console.log(screw);
}*/

//retreives the SVG text contents so we can mess with em (doesnt function locally, must be hosted)
casBody.addEventListener("load",function() {
	svgDoc = casBody.contentDocument;
	gears = [svgDoc.getElementById('Left_Gear'), svgDoc.getElementById('Right_Gear')]; //get gears
	spools = [svgDoc.getElementById('Left_Spool'), svgDoc.getElementById('Right_Spool')]; //get spools
	$(gears[0]).css({ 'transform-origin': '242.1987px 238.0296px' }); //centers the left gear on itself
	$(gears[1]).css({ 'transform-origin': '592.4888px 238.0296px' }); //centers the right gear on itself
	$(spools[0]).css({ 'transform-origin': '242.1987px 238.0296px' }); //centers the left spool on itself
	$(spools[1]).css({ 'transform-origin': '592.4888px 238.0296px' }); //centers the right spool on itself
	$(spools[1]).css({'transform':'scale('+maxSpool+')'});
	$(spools[0]).css({'transform':'scale('+minSpool+')'});
}, false);

//BUTTON CLICKS----------------------------------------
//changes the side of the cassette tape to play
$(flipBtn).click(function(){
	//when side A is playing, pause side A and flip to side B
	if(cassette == sides[0]){ 
		cassette.pause();
		cassette = sides[1];
		$(faceA).fadeOut(fadeDur, "swing");
		$(faceB).fadeIn(fadeDur, "swing");
		chkRatio(1, 0); //set the ratio of the tape's sides
	} 	
	//when side B is playing, pause side B and flip to side A
	else if(cassette == sides[1]){
		cassette.pause();
		cassette = sides[0];
		$(faceB).fadeOut(fadeDur, "swing");
		$(faceA).fadeIn(fadeDur, "swing");
		chkRatio(0, 1); //set the ratio of the tape's sides
	} 

	cancelRewind();
	popButton(String($(this).attr("id"))); //pass string of the clicked button id to the button animator
	lastPop = null; //prevents button from "sticking" after first click
	stopTape(); //stop the animation
	scaleSpools();
});

//plays the cassette tape at normal speed
$(playBtn).click(function(){
	if(cassette.seek() >= cassette.duration() - 1){return null} //dont play if cassette is over
	else if(!cassette.playing()){cassette.play(); cassette.volume(1);} //if it's not playing yet
	else{cassette.rate(1.0); cassette.volume(1);} //if it's rewinding or fast forwarding
	
	cancelRewind(); //kill existing rewind interval
	popButton(String($(this).attr("id"))); //pass id of this button as a string to the button animator
	stopTape(); //stop the animation
	gearInt = setInterval(playTape, 1, 1, 1); //play the animation
});

//stops the cassette tape in place so it can resume playing
$(pauseBtn).click(function(){
	cassette.pause();
	cassette.volume(1);
	cassette.rate(1.0); //and resets it to a normal speed
	
	cancelRewind();
	popButton(String($(this).attr("id")));
	lastPop = null; //prevents button from "sticking" after first click
	stopTape(); //stop the animation
});

//plays the cassette tape at 4x speed to simulate fast forward
$(fwdBtn).click(function(){
	if(cassette.playing()){cassette.rate(4.0); cassette.volume(.05);} //if it's already playing
	else if(cassette.seek() >= cassette.duration() - 1){return null} //dont play if cassette is over
	else{
		cassette.rate(4.0);
		cassette.volume(.05);
		cassette.play();} //or play it then fast forward if not
	
	cancelRewind();
	popButton(String($(this).attr("id")));
	stopTape(); //stop the animation
	gearInt = setInterval(playTape, 1, 1, 4); //play the animation fast
});


//plays the tape at -4x speed to simulate rewind
$(rewBtn).click(function(){
	if(cassette.playing() && !rewinding){
		rewinding = true;
		cassette.rate(2.0);
		cassette.volume(.05);
		rewInt = setInterval(rewind,rewSpd);} //if the cassette tape is playing and not rewinding
	
	else if(!cassette.playing() && cassette.seek() > 0){
		cassette.play();
		rewinding = true;
		cassette.rate(2.0);
		cassette.volume(.05);
		rewInt = setInterval(rewind,rewSpd);} //if the cassette tape is not playing and not rewinding
	
	else if(cassette.seek() == 0){
		cassette.pause();
		rewinding = false;
		return null;} //if the cassette tape is already rewound do nothing
	
	popButton(String($(this).attr("id")));
	stopTape(); //stop the animation
	gearInt = setInterval(playTape, 1, -1, 4); //play the animation fast and backwards
});

//FUNCTIONS----------------------------------------
//set the ratio of the tape's sides
function chkRatio(f, p){
	sides[f].seek(sides[f].duration() - sides[p].seek() - 1);
}

//rewind the tape in a way that mimics howler.js native rate option
function rewind(){
	if(rewinding){
		var playhead = cassette.seek(); //get current play time
		cassette.seek(playhead -= chop); //reduce value of current play time
		checkTape(playhead);} //pass current play time to check if its done
	else{return null}
}

//stop the cassette tape if it's fully rewound
function checkTape(isZero){
	if(isZero <= 0 && cassette.playing){
		cassette.stop();
		cassette.volume(1);
		cassette.rate(1.0); //and set it to a normal speed
		cancelRewind();
		unpop();}
	else{return null}
}

//stop rewind function from speeding up each click
function cancelRewind(){
	rewinding = false;
	clearInterval(rewInt);//by clearing the rewind interval
}

//unpops the buttons when the tape ends or is fully rewound
function unpop(){
	$(playBtn).css({'transform':'translate(0px, 0px)','box-shadow':'0px 3px 0px 0px #58595b'});
	$(rewBtn).css({'transform':'translate(0px, 0px)','box-shadow':'0px 3px 0px 0px #58595b'});
	$(fwdBtn).css({'transform':'translate(0px, 0px)','box-shadow':'0px 3px 0px 0px #58595b'});
	lastPop = null; //prevents double popping
	cassette.volume(1);
	cassette.rate(1.0); //make sure cassette doesnt play ay 4x speed when played again
	stopTape(); //stop the animation
}

//pop in the button that was clicked while popping out the previous button
function popButton(popIn){
	switch(true){
		//check if either the pause/flip buttons were clicked	
		case popIn == "pause" || popIn == "flip":
			$(document.getElementById(popIn)).css({
				'transform':'translate(0px, 3px)',
				'box-shadow':'0px 0px 0px 0px black'}); //then pop in the clicked button 
			setTimeout(function(){
				$(document.getElementById(popIn)).css({
					'transform':'translate(0px, 0px)',
					'box-shadow':'0px 3px 0px 0px #58595b'})}, 250); //then after a delay pop it out
			if(lastPop != null){
				$(document.getElementById(lastPop)).css({
					'transform':'translate(0px, 0px)',
					'box-shadow':'0px 3px 0px 0px #58595b'});} //if a button was popped in already, pop it out
			break;
			
		//check if a button was clicked	
		case popIn != lastPop:
			if(lastPop == null){ //if it was the first time
				$(document.getElementById(popIn)).css({
					'transform':'translate(0px, 3px)',
					'box-shadow':'0px 0px 0px 0px black'});//pop in the clicked button
			}
			else if(lastPop != null){ //if it was not the first time
				$(document.getElementById(popIn)).css({
					'transform':'translate(0px, 3px)',
					'box-shadow':'0px 0px 0px 0px black'}); //pop in the clicked button
				$(document.getElementById(lastPop)).css({
					'transform':'translate(0px, 0px)',
					'box-shadow':'0px 3px 0px 0px #58595b'}); } //and pop out the old one
			break;
			
		//check if this was the same as the most recent button clicked	
		case popIn == lastPop && popIn != "pause" || popIn != "flip":
			$(document.getElementById(popIn)).css({
				'transform':'translate(0px, 1.5px)',
				'box-shadow':'0px 1.5px 0px 0px #58595b'}); //then pop it halfway out 
			setTimeout(function(){
				$(document.getElementById(popIn)).css({
					'transform':'translate(0px, 3px)',
					'box-shadow':'0px 0px 0px 0px black'});}, 250); //then pop it back in
			break;
	}
	
	lastPop = String(popIn); //set the just clicked button as the most recent button clicked
}

//rotates the gears based on setInterval of button clicked
function playTape(dir,spd){
	rotDeg += spd * dir; //how far to rotate the gears
	$(gears).css({'transform':'rotate('+rotDeg+'deg)'}); //rotate the gears
	scaleSpools();
}

//animation interval killer
function stopTape(){
	clearInterval(gearInt); //gear spin interval
}

//animation that scales the brown spools of tape as the cassete plays 
function scaleSpools(){
	var rPlay = cassette.seek()/cassette.duration(); //get play completeness ratio
	$(spools[1]).css({'transform':'scale('+(maxSpool-(rPlay*minSpool))+')'}); //set the right spool to scale with play
	$(spools[0]).css({'transform':'scale('+(minSpool+(rPlay*minSpool))+')'}); //set the left spool to scale with play
}