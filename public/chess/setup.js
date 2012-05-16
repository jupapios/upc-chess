/*
 * 3D Javascript Chess
 * Copyright (c) 2008 Jacob Seidelin, cupboy@gmail.com
 * This software is free to use for non-commercial purposes. For anything else, please contact the author.
 */

(function(){

var $ = function(id) {return document.getElementById(id);};

var fDegRad = Math.PI / 180;

var oScene;
var aPieces = [];


var mW=3;
var mH=3;


var bBoardLoaded = false;
var bKnightLoaded = false;

var oSelectorCanvas;	// for drawing the selector square
var oValidCanvas;	// for drawing "valid move" squares

var iWidth = 1000;
var iHeight = 600;

var oCam;

var iSelectorX = 0;
var iSelectorY = 0;
var bPieceSelected;
var oSelectedPiece;

var aMouseRegions;
var iLastMouseRegionX = -1;
var iLastMouseRegionY = -1;

var strActivePlayer = "white";

function getElementPos(oElement) {
	var iX = -(document.body.scrollLeft+document.documentElement.scrollLeft), iY = -(document.body.scrollTop+document.documentElement.scrollTop);
	while (oElement && oElement.nodeName != "BODY") {
		iX += oElement.offsetLeft;
		iY += oElement.offsetTop;
		oElement = oElement.offsetParent;
	}
	return {
		x : iX,
		y : iY
	}
}

function moveSelect(x,y,e) {
				e = e || window.event
				//console.log(x,y,e)
				var oPos = getElementPos(oScene.getInputLayer());
				iMouseDownX = e.clientX - oPos.x;
				iMouseDownY = e.clientY - oPos.y;

				//console.log(oPos, iMouseDownX, iMouseDownY)

				try {
					var oRegion = checkMouseRegions(e.clientX - oPos.x, e.clientY - oPos.y);
					iSelectorX = oRegion.x
					iSelectorY = oRegion.y
				}
				catch(err) {
					iSelectorX = x
					iSelectorY = y
				}
			
	
				updateSelector();
				if (bPieceSelected) {
					attemptMovePiece();
					console.log('CLICK 2 TIME: ', oRegion)
					
				} else {
					selectPiece();
					console.log('CLICK 1 TIME: ', oRegion)
				}
}


function init() 
{

	oScene = new Canvas3D.Scene($("scenecontainer"), iWidth, iHeight, true);

	oCam = new Canvas3D.Camera();

	oCam.setPosition(new Canvas3D.Vec3(100,50,-120));

	oCam.setScale(18);
	oCam.setFOV(110);
	oCam.setFocalDistance(-10);

	oCam.setReverseX(true);

	//oScene.setUpVector(new Canvas3D.Vec3(0,-1,0));

	oCam.lookAt(new Canvas3D.Vec3(0,-20,0), oScene.getUpVector());

	oCam.updateRotationMatrix();

	oScene.setActiveCamera(oCam);

	oLight1 = new Canvas3D.Light();
	oLight1.setPosition(new Canvas3D.Vec3(0,30,0));
	oLight1.setIntensity(0.8);
	oScene.addLight(oLight1);

	oLight2 = new Canvas3D.Light();
	oLight2.setPosition(new Canvas3D.Vec3(100,30,100));
	oLight2.setIntensity(0.3);
	oScene.addLight(oLight2);

	oLight3 = new Canvas3D.Light();
	oLight3.setPosition(new Canvas3D.Vec3(-100,30,-100));
	oLight3.setIntensity(0.3);
	oScene.addLight(oLight3);

	XHR("meshes/board.json3d", onBoardLoaded);
	XHR("meshes/knight.json3d", onKnightLoaded);

	Canvas3D.addEvent(document, "keydown",
		function(e) {
			e = e||window.event;
			var iKeyCode = e.keyCode;
			switch (iKeyCode) {
				case 102: // numpad 4
					moveSelectorLeft(); break;
				case 100: // numpad 6
					moveSelectorRight(); break;
				case 104: // numpad 8
					moveSelectorUp(); break;
				case 98: // numpad 2
					moveSelectorDown(); break;
				case 17: // ctrl
				case 101: // numpad 5
					if (bPieceSelected)
						attemptMovePiece();
					else 
						selectPiece();
			}
		}
	);

	oSelectorCanvas = document.createElement("canvas");
	oSelectorCanvas.width = iWidth;
	oSelectorCanvas.height = iHeight;
	oSelectorCanvas.style.width = iWidth+"px";
	oSelectorCanvas.style.height = iHeight+"px";
	oSelectorCanvas.style.zIndex = 1;
	oSelectorCanvas.style.position = "absolute";
	$("scenecontainer").appendChild(oSelectorCanvas);

	oValidCanvas = document.createElement("canvas");
	oValidCanvas.width = iWidth;
	oValidCanvas.height = iHeight;
	oValidCanvas.style.width = iWidth+"px";
	oValidCanvas.style.height = iHeight+"px";
	oValidCanvas.style.zIndex = 1;
	oValidCanvas.style.position = "absolute";
	$("scenecontainer").appendChild(oValidCanvas);


	var bIsRotating = false;
	var iMouseDownX = 0;
	var iMouseDownY = 0;
	var bMouseIsDown = false;
	var bMeshesHidden = false;

	Canvas3D.addEvent(oScene.getInputLayer(), "mousedown", 
		function(e) {
			e = e || window.event;
			iMouseDownX = e.clientX;
			iMouseDownY = e.clientY;
			bMouseIsDown = true;
		}
	);


	Canvas3D.addEvent(oScene.getInputLayer(), "click", 
		function(e) {
		}
	);

	var bUnhideOrdered = false;
	Canvas3D.addEvent(oScene.getInputLayer(), "DOMMouseScroll", 
		function(e) {
			e = e || window.event;

			if (!e.shiftKey) return;

			if (e.detail) {	
				e.wheelDelta = e.detail * -40;
			} 

			if (!bMeshesHidden) {
				for (var i=0;i<aPieces.length;i++) {
					aPieces[i].mesh.hide();
				}
				bMeshesHidden = true;
			}
			hideSelector();
			hideValidMoves();


			if (e.wheelDelta > 0) {
				oCam.setScale(oCam.getScale() * 1.5);
			} else {
				oCam.setScale(oCam.getScale() / 1.5);
			}

			if (!bUnhideOrdered) {
				setTimeout( function() {
					for (var i=0;i<aPieces.length;i++) {
						aPieces[i].mesh.show();
					}
					bMeshesHidden = false;
		
					bIsRotating = false;
					oScene.setDirty(true);

					updateMouseRegions();
					updateSelector();
					updateValidMoves();
		
					showSelector();
					showValidMoves();
					bUnhideOrdered = false;
				}, 100);
				bUnhideOrdered = true;
			}


			if (e.preventDefault)
				e.preventDefault();
			else
				e.returnValue = false;
		}
	);

	Canvas3D.addEvent(oScene.getInputLayer(), "mouseup", 
		function(e) {
			e = e || window.event;

			bMouseIsDown = false;
			if (bIsRotating) {
				for (var i=0;i<aPieces.length;i++) {
					aPieces[i].mesh.show();
				}
				bMeshesHidden = false;

				bIsRotating = false;
				oScene.setDirty(true);

				updateMouseRegions();
				updateSelector();
				updateValidMoves();

				setTimeout(showSelector, 10);
				setTimeout(showValidMoves, 10);

			} else {
				var oPos = getElementPos(oScene.getInputLayer());
				iMouseDownX = e.clientX - oPos.x;
				iMouseDownY = e.clientY - oPos.y;

				console.log(oPos, iMouseDownX, iMouseDownY)

				var oRegion = checkMouseRegions(e.clientX - oPos.x, e.clientY - oPos.y);
				console.log(oRegion)
				if (oRegion) {
					iSelectorX = oRegion.x;
					iSelectorY = oRegion.y;
	
					updateSelector();
					if (bPieceSelected) {
						attemptMovePiece();
						console.log('CLICK 2 TIME: ', oRegion)
						
					} else {
						//iSelectorX = 0;
						//iSelectorY = 1
						selectPiece();
						console.log('CLICK 1 TIME: ', oRegion)
					}
				}				
			}
		}
	);

	Canvas3D.addEvent(oScene.getInputLayer(), "mousemove",
		function(e) {
			e = e || window.event;
			if (bMouseIsDown) {
				if (!bMeshesHidden) {
					for (var i=0;i<aPieces.length;i++) {
						aPieces[i].mesh.hide();
					}
					bMeshesHidden = true;
				}


				hideSelector();
				hideValidMoves();

				bIsRotating = true;

				var iMouseX = e.clientX;
				var iMouseY = e.clientY;
				var fDeltaX = (iMouseX - iMouseDownX) / 3;
				var fDeltaY = -((iMouseY - iMouseDownY) / 3);

				// save the old camera position
				var oOldCamPos = new Canvas3D.Vec3(oCam.getPosition().x,oCam.getPosition().y,oCam.getPosition().z);

				// pitch the camera, but if we're not too low or if we're moving the camera up
				oCam.pitchAroundTarget(fDeltaY);
				if (!((oCam.getPosition().y > 15 || fDeltaY < 0) && (oCam.getPosition().y < 100 || fDeltaY > 0))) {
					oCam.setPosition(oOldCamPos);
				}

				oCam.yawAroundTarget(fDeltaX);
				oCam.lookAt(oCam.getLookAt(), oScene.getUpVector());
				oCam.updateRotationMatrix();
				iMouseDownX = e.clientX;
				iMouseDownY = e.clientY;

			} else {
				var oPos = getElementPos(oScene.getInputLayer());
				var oRegion = checkMouseRegions(e.clientX - oPos.x, e.clientY - oPos.y);
				if (oRegion) {
					var bNewRegion = false;
					if (iSelectorX != oRegion.x || iSelectorY != oRegion.y)
						bNewRegion = true;

					iSelectorX = oRegion.x;
					iSelectorY = oRegion.y;

					if (bNewRegion) { 
						updateSelector();
					}
				}
			}
		}
	);


	Canvas3D.addEvent(document, "keydown",
		function(e) {
			e = e || window.event;
			var iKeyCode = e.keyCode;
			var oCam;
			if (iKeyCode == 87) { // "w"
				if (oCam = oScene.getActiveCamera()) {
					var oTarget = oCam.getLookAt();
					var fDist = oTarget.dist(oCam.getPosition());
					var fMove = 50;
					if (fDist - fMove < 40) {
						fMove = fDist - 40;
					}
					oCam.moveForward(fMove);
					updateSelector();
				}
			}
			if (iKeyCode == 83) { // "s"
				if (oCam = oScene.getActiveCamera()) {
					oCam.moveForward(-50);
					updateSelector();
				}
			}
		}
	);


	oScene.begin();

	updateMouseRegions();

	// MI TEST!

	/*var oRegion = {
		x: 0,
		y: 0
	}

	iSelectorX = oRegion.x
	iSelectorY = oRegion.y
	updateSelector()
	selectPiece()*/

 	/*oRegion = {
		x: 1,
		y: 2
	}	

	updateSelector()
	attemptMovePiece()*/

	//moveSelect(1,0)
}


// setup polygons for board squares, used to check which piece mouse is hovering over
function updateMouseRegions() {
	var oCam = oScene.getActiveCamera();

	var iOffsetX = iWidth / 2;
	var iOffsetY = iHeight / 2;

	var aPaths = [];

	for (var x=0;x<mW;x++) {
		aPaths[x] = [];

		for (var y=0;y<mH;y++) {

			var iPosX = -(x-3) * 10;
			var iPosZ = (y-4) * 10;
			var iPosY = 0;

			var oP1 = oCam.project(oCam.transformPoint(new Canvas3D.Vec3(iPosX, iPosY, iPosZ)));
			var oP2 = oCam.project(oCam.transformPoint(new Canvas3D.Vec3(iPosX+10, iPosY, iPosZ)));
			var oP3 = oCam.project(oCam.transformPoint(new Canvas3D.Vec3(iPosX+10, iPosY, iPosZ+10)));
			var oP4 = oCam.project(oCam.transformPoint(new Canvas3D.Vec3(iPosX, iPosY, iPosZ+10)));

			aPaths[x][y] = [
				[oP1.x + iOffsetX, oP1.y + iOffsetY],
				[oP2.x + iOffsetX, oP2.y + iOffsetY],
				[oP3.x + iOffsetX, oP3.y + iOffsetY],
				[oP4.x + iOffsetX, oP4.y + iOffsetY]
			];
		}
	}
	aMouseRegions = aPaths;	
}

function checkMouseRegions(iMouseX, iMouseY) {
	var iRegionX = -1;
	var iRegionY = -1;

	var oCtx = oSelectorCanvas.getContext("2d");

	var bIsLast = false;
	if (iLastMouseRegionX > -1 && iLastMouseRegionY > -1) {
		var aLastRegion = aMouseRegions[iLastMouseRegionX][iLastMouseRegionY];
		if (checkSingleMouseRegion(oCtx, aLastRegion, iMouseX, iMouseY)) {
			bIsLast = true;
		}
	}
	var bFound = false;
	if (!bIsLast) {
		for (var x=0; x<mW && !bFound; x++) {
			for (var y=0; y<mH && !bFound; y++) {
				var aRegion = aMouseRegions[x][y];
				if (checkSingleMouseRegion(oCtx, aRegion, iMouseX, iMouseY)) {
					iRegionX = x;
					iRegionY = y;
					bFound = true;
				}
			}	
		}
	}

	if (iRegionX > -1 && iRegionY > -1) {
		return {
			x : iRegionX,
			y : iRegionY
		}
	}
}

function checkSingleMouseRegion(oCtx, aRegion, x, y) 
{
	oCtx.beginPath();
	oCtx.moveTo(aRegion[0][0], aRegion[0][1]);
	oCtx.lineTo(aRegion[1][0], aRegion[1][1]);
	oCtx.lineTo(aRegion[2][0], aRegion[2][1]);
	oCtx.lineTo(aRegion[3][0], aRegion[3][1]);
	oCtx.closePath();
	return oCtx.isPointInPath(x, y);
}

function moveSelectorLeft() {
	moveSelector(-1,0);
}
function moveSelectorRight() {
	moveSelector(1,0);
}
function moveSelectorUp() {
	moveSelector(0,1);
}
function moveSelectorDown() {
	moveSelector(0,-1);
}

function moveSelector(iDeltaX, iDeltaY) {
	var fAngle = Math.atan2(oCam.getPosition().x,oCam.getPosition().z) /  fDegRad;
	// four scenarios for how to move the selector, depending on camera angle
	if (fAngle >= 135 || fAngle <= -135) {
		iSelectorX += iDeltaX;
		iSelectorY += iDeltaY;
	} else if (fAngle >= -45 && fAngle <= 45) {
		iSelectorX -= iDeltaX;
		iSelectorY -= iDeltaY;
	} else if (fAngle >= -135 && fAngle <= -45) {
		iSelectorX -= iDeltaY;
		iSelectorY += iDeltaX;
	} else if (fAngle >= 45 && fAngle <= 135) {
		iSelectorX += iDeltaY;
		iSelectorY -= iDeltaX;
	}
 	if (iSelectorX < 0) iSelectorX = 7;
 	if (iSelectorX > 7) iSelectorX = 0;
 	if (iSelectorY > 7) iSelectorY = 0;
 	if (iSelectorY < 0) iSelectorY = 7;
	updateSelector();
}

function hideSelector() 
{
	oSelectorCanvas.style.display = "none";
}
function showSelector() 
{
	oSelectorCanvas.style.display = "block";
}

function hideValidMoves() 
{
	oValidCanvas.style.display = "none";
}
function showValidMoves() 
{
	oValidCanvas.style.display = "block";
}

function updateSelector() {
	var oCtx = oSelectorCanvas.getContext("2d");
	oCtx.clearRect(0,0,iWidth,iHeight);

	var iOffsetX = iWidth / 2;
	var iOffsetY = iHeight / 2;

	// draw active selector square

	makeRegionPath(oCtx, iSelectorX, iSelectorY);
	oCtx.fillStyle = "rgba(255,255,0,0.5)";
	oCtx.fill();

	if (bPieceSelected) {
		// draw border around selected square
		makeRegionPath(oCtx, oSelectedPiece.pos[0], oSelectedPiece.pos[1]);
		oCtx.lineWidth = 2;
		oCtx.strokeStyle = "rgba(255,0,0,1)";
		oCtx.stroke();
	}
}

function makeRegionPath(oCtx, x,y) 
{
	var aRegion = aMouseRegions[x][y];
	oCtx.beginPath();
	oCtx.moveTo(aRegion[0][0], aRegion[0][1]);
	oCtx.lineTo(aRegion[1][0], aRegion[1][1]);
	oCtx.lineTo(aRegion[2][0], aRegion[2][1]);
	oCtx.lineTo(aRegion[3][0], aRegion[3][1]);
	oCtx.closePath();
}

// select a piece
function selectPiece() 
{
	var iX = iSelectorX;
	var iY = iSelectorY;

	var test = aPieces

	//console.log(1)

	if (iX < 0 || iX > 7 || iY < 0 || iY > 7) {
		return false;
	}
	//console.log('LENNGG', Object.keys(aPieces).length, test)
	if(aPieces)
	for (var i=0;i<6;i++) {
		//console.log(2)
		console.log(aPieces, test)
		if (aPieces[i].pos[0] == iX && aPieces[i].pos[1] == iY) {
			//console.log(3)
			oPiece = aPieces[i];
			if (oPiece.color == strActivePlayer) {
				//console.log(4)
				oSelectedPiece = aPieces[i];
				bPieceSelected = true;
			}
		}
	}
	//console.log(5)
	updateSelector();
	updateValidMoves();
}

function updateValidMoves() {
	var oCtx = oValidCanvas.getContext("2d");
	oCtx.clearRect(0,0,iWidth,iHeight);
	oCtx.fillStyle = "rgba(0,255,0,0.2)";

	if (!oSelectedPiece) return;

	for (var x=0; x<mW; x++) {
		for (var y=0; y<mH; y++) {
			if (isValidMove(oSelectedPiece, x, y)) {
				makeRegionPath(oCtx, x, y);
				console.log(oSelectedPiece, x,y)
				oCtx.fill();
			}
		}	
	}
}

// attempt to move the selected piece
function attemptMovePiece() 
{
	var iX = iSelectorX;
	var iY = iSelectorY;

	//console.log('INTO attemptMovePiece: ', iX, iY)

	//console.log(iX, iY, oSelectedPiece)

	if (oSelectedPiece.pos[0] == iX && oSelectedPiece.pos[1] == iY) {
		// cancel move
		bPieceSelected = false;
		oSelectedPiece = null;
		updateSelector();
		updateValidMoves();
		return;
	}

	var oTargetPiece = squareHasPiece(iX, iY);

	if (oTargetPiece) {
		if (oTargetPiece.color == strActivePlayer) {
			// select another piece
			bPieceSelected = false;
			oSelectedPiece = null;
			selectPiece();
			return;
		}
	}

	var bValidMove = isValidMove(oSelectedPiece, iX, iY);
	if (!bValidMove) return;

	var oTargetPiece = squareHasPiece(iX, iY);

	oSelectedPiece.pos[0] = iX;
	oSelectedPiece.pos[1] = iY;

	oSelectedPiece.hasmoved = true;

	oSelectedPiece = null;
	bPieceSelected = false;

	updateBoard();
	updateValidMoves();

	if (oTargetPiece) {
		removePiece(oTargetPiece);
		if (oTargetPiece.type == "king") {
			endGame();
		}
	}

	endMove();
}

function endGame() {
	alert("Congratulations, you have won!");
}

// removes a piece from the board (and the game)
function removePiece(oPiece) 
{
	var aNewPieces = [];
	for (var i=0;i<aPieces.length;i++) {
		if (aPieces[i] != oPiece) {
			aNewPieces.push(aPieces[i]);
		}
	}
	aPieces = aNewPieces;
	oScene.removeObject(oPiece.mesh);
}


// validates a proposed move. Returns true if the piece is allowed to make such a move.
function isValidMove(oPiece, iX, iY) 
{

	var iXDir = 1;
	if (oPiece.color == "black") {
		iXDir = -1;
	}

/*	if (oPiece.type ==  "pawn") { 
		if (iX*iXDir <= oPiece.pos[0]*iXDir) {
			return false;
		}
		if (iY == oPiece.pos[1]) {
			if (iX == oPiece.pos[0]+(1*iXDir)) {
				if (!squareHasPiece(iX, iY)) {
					return true;
				}
			} else if (iX == oPiece.pos[0]+(2*iXDir) && !oPiece.hasmoved) {
				if (!(squareHasPiece(iX, iY) || squareHasPiece(iX-(1*iXDir), iY))) {
					return true;
				}
			}
		} else if (iY == oPiece.pos[1]+1 || iY == oPiece.pos[1]-1) {
			if (iX == oPiece.pos[0]+(1*iXDir)) {
				var oTargetPiece;
				if (oTargetPiece = squareHasPiece(iX, iY)) {
					if (oTargetPiece.color != oPiece.color) {
						return true;
					}
				}
			}
		}
	}*/

	if (oPiece.type == "knight") {
		if (
			(iX == oPiece.pos[0]+2 && iY == oPiece.pos[1]-1) ||
			(iX == oPiece.pos[0]+2 && iY == oPiece.pos[1]+1) ||
			(iX == oPiece.pos[0]-2 && iY == oPiece.pos[1]-1) ||
			(iX == oPiece.pos[0]-2 && iY == oPiece.pos[1]+1) ||
			(iX == oPiece.pos[0]+1 && iY == oPiece.pos[1]-2) ||
			(iX == oPiece.pos[0]+1 && iY == oPiece.pos[1]+2) ||
			(iX == oPiece.pos[0]-1 && iY == oPiece.pos[1]-2) ||
			(iX == oPiece.pos[0]-1 && iY == oPiece.pos[1]+2)
		) {
			var oTargetPiece;
			if (oTargetPiece = squareHasPiece(iX, iY)) {
				/*if (oTargetPiece.color != oPiece.color) {
					return true;
				}*/
				return false;
			} else {
				return true;
			}
		}
	}

/*	if (oPiece.type == "rook" || oPiece.type == "queen") {
		if (iX == oPiece.pos[0] || iY == oPiece.pos[1]) {
			if (iX == oPiece.pos[0]) {
				if (oPiece.pos[1] < iY) {
					for (var y=oPiece.pos[1]+1;y<iY;y++) {
						if (squareHasPiece(iX, y)) {
							return false;
						}
					}
				} else {
					for (var y=oPiece.pos[1]-1;y>iY;y--) {
						if (squareHasPiece(iX, y)) {
							return false;
						}
					}
				}
			}
			if (iY == oPiece.pos[1]) {
				if (oPiece.pos[0] < iX) {
					for (var x=oPiece.pos[0]+1;x<iX;x++) {
						if (squareHasPiece(x, iY)) {
							return false;
						}
					}
				} else {
					for (var x=oPiece.pos[0]-1;x>iX;x--) {
						if (squareHasPiece(x, iY)) {
							return false;
						}
					}
				}
			}
			var oTargetPiece;
			if (oTargetPiece = squareHasPiece(iX, iY)) {
				if (oTargetPiece.color == oPiece.color) {
					return false;
				}
			}
			return true;
		}
	}
	
	if (oPiece.type == "king") {
		if (
			(iX == oPiece.pos[0] && iY == oPiece.pos[1]+1) || 
			(iX == oPiece.pos[0] && iY == oPiece.pos[1]-1) || 
			(iX == oPiece.pos[0]+1 && iY == oPiece.pos[1]) || 
			(iX == oPiece.pos[0]-1 && iY == oPiece.pos[1]) || 
			(iX == oPiece.pos[0]+1 && iY == oPiece.pos[1]+1) || 
			(iX == oPiece.pos[0]-1 && iY == oPiece.pos[1]+1) || 
			(iX == oPiece.pos[0]+1 && iY == oPiece.pos[1]-1) || 
			(iX == oPiece.pos[0]-1 && iY == oPiece.pos[1]-1)
		) {
			var oTargetPiece;
			if (oTargetPiece = squareHasPiece(iX, iY)) {
				if (oTargetPiece.color == oPiece.color) {
					return false;
				}
			}
			return true;
		}
	}

	if (oPiece.type == "bishop" || oPiece.type == "queen") {
		// only diagonally
		if (Math.abs(iX - oPiece.pos[0]) == Math.abs(iY - oPiece.pos[1])) {
			if (iX > oPiece.pos[0]) {
				if (oPiece.pos[1] < iY) {
					var x = oPiece.pos[0]+1
					for (var y=oPiece.pos[1]+1;y<iY;y++) {
						if (squareHasPiece(x, y)) {
							return false;
						}
						x++;
					}
				} else {
					var x = oPiece.pos[0]+1
					for (var y=oPiece.pos[1]-1;y>iY;y--) {
						if (squareHasPiece(x, y)) {
							return false;
						}
						x++;
					}
				}
			}
			if (iX < oPiece.pos[0]) {
				if (oPiece.pos[1] < iY) {
					var x = oPiece.pos[0]-1
					for (var y=oPiece.pos[1]+1;y<iY;y++) {
						if (squareHasPiece(x, y)) {
							return false;
						}
						x--;
					}
				} else {
					var x = oPiece.pos[0]-1
					for (var y=oPiece.pos[1]-1;y>iY;y--) {
						if (squareHasPiece(x, y)) {
							return false;
						}
						x--;
					}
				}
			}
			var oTargetPiece;
			if (oTargetPiece = squareHasPiece(iX, iY)) {
				if (oTargetPiece.color == oPiece.color) {
					return false;
				}
			}
			return true;
		}
	}*/
	return false;
}

function squareHasPiece(iX, iY) {
	for (var i=0;i<aPieces.length;i++) {
		if (aPieces[i].pos[0] == iX && aPieces[i].pos[1] == iY) {
			return aPieces[i];
		}
	}
}

function movePieceTo(oPiece, iX, iY)
{
	var oPos = getBoardPos(iX, iY);
	oPiece.mesh.setPosition(new Canvas3D.Vec3(oPos.x, 0, oPos.y));
}


function endMove() {
	updateSelector();
	if (strActivePlayer == "white") {
		strActivePlayer = "black";
	} else {
		strActivePlayer = "white";
	}
}


function createMesh(strText) {
	var oMeshData = eval("("+strText+")");
	if (oMeshData) {
		var oMesh = new Canvas3D.Mesh();

		oMesh._bShading = true;
		oMesh._bWire = false;
		oMesh._bFill = true;
		oMesh._bZSort = true;
		oMesh._bBackfaceCull = true;
		oMesh._bTexture = false;
		oMesh._bTextureShading = false;

		oMesh.setMeshData(oMeshData, oScene);
		return oMesh;
	}
}

function onBoardLoaded(oHTTP) 
{
	var oMesh = createMesh(oHTTP.responseText);
	oMesh.setForcedZ(0);
	oScene.addObject(oMesh);
	bBoardLoaded = true;
	setupGame();
}

function makePiece(strMeshText, strColor, fRot) {
	var oMesh = createMesh(strMeshText);
	for (var a=0;a<oMesh._aMaterials.length;a++) {
		if (strColor == "black") {
			oMesh._aMaterials[a].r = 100;
			oMesh._aMaterials[a].g = 80;
			oMesh._aMaterials[a].b = 80;
		} else if (strColor == "white") {
			oMesh._aMaterials[a].r = 220;
			oMesh._aMaterials[a].g = 220;
			oMesh._aMaterials[a].b = 220;
		}
	}
	if (fRot) {
		oMesh.setRotation(new Canvas3D.Vec3(0,fRot * fDegRad,0));
	}
	return oMesh;
}


function onKnightLoaded(oHTTP) 
{
	aPieces.push({
		mesh : oScene.addObject(makePiece(oHTTP.responseText, "white")), 
		color : "white",
		type : "knight",
		pos : [0,0]
	});
	aPieces.push({
		mesh : oScene.addObject(makePiece(oHTTP.responseText, "white")), 
		color : "white",
		type : "knight",
		pos : [0,1]
	});	
	aPieces.push({
		mesh : oScene.addObject(makePiece(oHTTP.responseText, "white")), 
		color : "white",
		type : "knight",
		pos : [0,2]
	});
	aPieces.push({
		mesh : oScene.addObject(makePiece(oHTTP.responseText, "black", 180)), 
		color : "black",
		type : "knight",
		pos : [3,0]
	});
	aPieces.push({
		mesh : oScene.addObject(makePiece(oHTTP.responseText, "black", 180)), 
		color : "black",
		type : "knight",
		pos : [3,1]
	});
	aPieces.push({
		mesh : oScene.addObject(makePiece(oHTTP.responseText, "black", 180)), 
		color : "black",
		type : "knight",
		pos : [3,2]
	});	
	bKnightLoaded = true;
	setupGame();
}


iBoardScale = 10;
function getBoardPos(x, y) {
	return {
		x : -((x - 4) * 10 + 5),
		y : (y - 4) * 10 + 5
	}
}

function setupGame() {
	if (!bKnightLoaded) {
		return;
	}
	for (var i=0;i<aPieces.length;i++) {
		aPieces[i].hasmoved = false;
	}
	updateBoard();
	updateSelector();
}

function updateBoard() {
	for (var i=0;i<aPieces.length;i++) {
		var oPiece = aPieces[i];
		var oPos = getBoardPos(oPiece.pos[0], oPiece.pos[1])
		oPiece.mesh.setPosition(new Canvas3D.Vec3(oPos.x, 0, oPos.y));
	}
}





Canvas3D.addEvent(window, "load", function() {
	init()

	/*$$('a').addEvent('mouseover', function () {
		for(var i=0; i<4; i++) {
			setInterval(function() {
				$$('a').set('text', this.get('text'))
			}.bind(this),200)
		}
	})	*/

	$('btn-solve').addEvent('click', function () {
		var
			time = 0,
			init_date = new Date()
			actual_date = init_date
		$$('.info').addClass('opacity')
		setTimeout(function() {
			$$('.info').setStyle('display', 'none')
			$('time').setStyle('display', 'block')
		}, 1500)
		setInterval(function() {
			$('time').set('text', time++)
		}, 1000)




		//moveSelect(0,2, undefined)
		//moveSelect(1,0, undefined)

		/*breadth(
			[
				[1,1,1],
				[0,0,0],
				[0,0,0],
				[1,1,1]
			]
		)*/

		//breadth(aPieces)

		var initial_state = [
				[1,0,1],
				[0,0,0],
				[-1,0,-1]
			]

		var initial = new Node(global_id,0,initial_state,1)
		/*var test2 = new Node(2,1,['hola2'])
		console.log(test)
		console.log(test2)
		*/
		breadth(initial)



		/* on finish
			actual_date = new Date()
			total_time = actual_date - init_date
			*/
	})

});

var global_id=1

var Node = function(id, pid, info, turn) {
	this.id = id
	this.pid = pid
	this.info = Array.clone(info),
	this.turn = turn
}

function isValid(x1, y1, x, y) {
		if (
			(x1 == x+2 && y1 == y-1) ||
			(x1 == x+2 && y1 == y+1) ||
			(x1 == x-2 && y1 == y-1) ||
			(x1 == x-2 && y1 == y+1) ||
			(x1 == x+1 && y1 == y-2) ||
			(x1 == x+1 && y1 == y+2) ||
			(x1 == x-1 && y1 == y-2) ||
			(x1 == x-1 && y1 == y+2)
		) {
			return true
		}
		return false;
}



var final_state = [
	[-1,0,-1],
	[0,0,0],
	[1,0,1]
]

function breadth(initial) {
var close = []
var open = []
	var
		actual = [],
		nodes = [],
		i, res ='', res2='', k=0

	open.push(initial)
	//console.log(open+"")

	//console.log('HOLAAAAA: ',initial.getInfo()[0][0])
	while(open.length > 0 && k<10000) {
		k++

		//global_turn*=-1
		actual = open.shift()
		//console.log(actual)
		close.push(actual)

		//console.log(close+"")
		if(areEqual(actual.info,final_state)) {
			console.log('FIN :)')
			break
		}

		//console.log(actual.pid)

		//console.log('CLOSE: ',close)
		//console.log('NODES ',actual)

		nodes = get_nodes(close,actual)
		//console.log(open.length)
		//open = open.concat(nodes)
		//console.log(open.length)
		//for(i=0;i<open.length; i++)
		//	res+=printMat(open[i].info)

		//for(i=0;i<nodes.length; i++)
		//	res2+=printMat(nodes[i].info)		

		//console.log('OPEN:'+open)
		open.append(nodes)
		//console.log(open.length)
		//console.log('ACTUAL:',actual,'NODES:',nodes)
		//console.log(nodes)
		//console.log(open.length, open, close)
	}

	/*console.log(close)
		var initial_state = [
				[1,0,1],
				[0,0,0],
				[-1,0,-1]
			]	
	var lala = isValidNode(close,initial_state)
	console.log(lala)*/
	//console.log(close)
	//console.log(close)
	//console.log('nodes',nodes)
	console.log(':(', close.length)

	//console.log('HOLAAAAA: ',initial.getInfo()[0][0])
}

function get_nodes(close,node_in) {
	var 
		i,
		j,
		x,
		y,
		child = null,
		list_node = [],
		node_actual = Array.clone(node_in.info)
	//console.log(global_turn)

	for(i=0;i<node_actual.length; i++) {
		for(j=0;j<node_actual[i].length; j++) {
			if(node_actual[i][j] === node_in.turn) {
						//console.log('ij(',i,j,') xy(',x,y,')')
				for (x=0; x<mW; x++) {
					for (y=0; y<mH; y++) {
						//console.log(i,j, x, y)
						if(isValid(i, j, x, y) && Math.abs(node_actual[x][y]) !== 1 ) {
							child = Array.clone(node_actual)
							//child = mslice(node_actual)
							child[x][y] = node_in.turn
							child[i][j] = 0
							if(isValidNode(close,child)){
								global_id += 1
								list_node.push(new Node(global_id, node_in.id, child, node_in.turn*-1))
							} else {
								child = []
							}						
						}
					}
				}
			}
		}
	}

	//console.log(list_node)
	
	//console.log(22222,node[0][0])
		/*for(var i=0; i<node.length; i++) {
			row = node[i]
			for(var j=0; j<row.length; j++) {
				box = row[j]
				if(box!==0) {

				}
			}
		}*/
		/*for(var i=0; i<aPieces.length; i++) {
			oSelectedPiece = aPieces[i]
			for (var x=0; x<mW; x++) {
				for (var y=0; y<mH; y++) {
					if (isValid(oSelectedPiece, x, y)) {
						var tmp2 = aPieces
						/*var copy = node
						console.log(copy)
						copy[oSelectedPiece.pos[0]][oSelectedPiece.pos[1]] = 0	
						copy[x][y] = oSelectedPiece.type == "white" ? 1 : -1
						tmp.push(copy)
						
						//tmp = aPieces
						tmp2[i].pos[0] = x
						tmp2[i].pos[1] = y
						tmp.push(tmp2)
					}
				}	
			}	
		}*/

		//4x3

		//Se ejecuta 4 veces
		/*for(var i=0; i<mW; i++) {
			//console.log(node[i])

			//Se ejecuta 3 veces
			for(var j=0; j<mH; j++) {

				// Solo recorre para los 6 caballos
				// siempre se ejcuta 3 veces
				if(node_actual[i][j] == global_turn) {
					//console.log('HOLA')
					for (var x=0; x<mW; x++) {
						for (var y=0; y<mH; y++) {
							if((i != x || j != y) && isValid(i, j, x, y)) {
								var tmp2 = Array.clone(node_actual)
								tmp2[i][j] = 0
								tmp2[x][y] = global_turn
								if(isValidNode(tmp2)){
									//console.log(node_lalaa)
									global_id += 1
									tmp.push(new Node(global_id, node_lalaa.id, tmp2))
								}
								//tmp2 = null
							}
						}	
					}

				}

			}
		}*/
		/*if(flag) global_turn += 1
		else global_turn -= 1
		flag = !flag*/
		return list_node
}

/*iSelectorX = 1
iSelectorY = 0
attemptMovePiece()*/

function isValidNode(close,node_to) {
	//console.log('ENVALIDADOD',close)
	for(var z=0;z<close.length;z++) { 
		if(areEqual(close[z].info,node_to))
			return false
	}
	return true
}

function mslice(matrix){
	var temp = []
	for(var i=0;i<matrix.length; i++){
		temp.push(Array.clone(matrix[i]))
	}
	return temp
}

/*function areEqual_old(matrix1, matrix2) {
	var i=0, j=0
	for(;i<matrix1.length; i++)
		for(;j<matrix1[i].length; j++)
			if(!!(matrix1[i][j]) != !!(matrix2[i][j]))
				return false
	return true
}*/

function areEqual(matrix1, matrix2) {
	for(var pp=0;pp<matrix1.length; pp++) {
		for(var qq=0;qq<matrix1[pp].length; qq++) {
			if(matrix1[pp][qq] !== matrix2[pp][qq]) {
				return false
			}
		}
	}
	return true
}

function printMat(arr){
	var i, j, res = '';
	for(j=0; j<arr.length;j++){
		for(i=0;i<arr[j].length;i++){res  += arr[j][i]+','}
		res += '|' 
	}
 	return ('['+res+']');
}

})();

