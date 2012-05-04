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


var mW=4;
var mH=3;


var bBoardLoaded = false;
var bKingLoaded = false;
var bQueenLoaded = false;
var bRookLoaded = false;
var bBishopLoaded = false;
var bKnightLoaded = false;
var bPawnLoaded = false;

var oSelectorCanvas;	// for drawing the selector square
var oValidCanvas;	// for drawing "valid move" squares

var iWidth = 1200;
var iHeight = 900;

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


function init() 
{

	oScene = new Canvas3D.Scene($("scenecontainer"), iWidth, iHeight, true);

	oCam = new Canvas3D.Camera();

	oCam.setPosition(new Canvas3D.Vec3(0,50,-100));

	oCam.setScale(18);
	oCam.setFOV(110);
	oCam.setFocalDistance(50);

	oCam.setReverseX(true);

	//oScene.setUpVector(new Canvas3D.Vec3(0,-1,0));

	oCam.lookAt(new Canvas3D.Vec3(0,0,0), oScene.getUpVector());

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

	//XHR("meshes/king.json3d", onKingLoaded);
	//XHR("meshes/queen.json3d", onQueenLoaded);
	//XHR("meshes/bishop.json3d", onBishopLoaded);
	XHR("meshes/knight.json3d", onKnightLoaded);
	//XHR("meshes/rook.json3d", onRookLoaded);
	//XHR("meshes/pawn.json3d", onPawnLoaded);

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

				var oRegion = checkMouseRegions(e.clientX - oPos.x, e.clientY - oPos.y);
				if (oRegion) {
					iSelectorX = oRegion.x;
					iSelectorY = oRegion.y;
	
					updateSelector();
					if (bPieceSelected)
						attemptMovePiece();
					else 
						selectPiece();
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

	if (iX < 0 || iX > 7 || iY < 0 || iY > 7) {
		return false;
	}
	for (var i=0;i<aPieces.length;i++) {
		if (aPieces[i].pos[0] == iX && aPieces[i].pos[1] == iY) {
			oPiece = aPieces[i];
			if (oPiece.color == strActivePlayer) {
				oSelectedPiece = aPieces[i];
				bPieceSelected = true;
			}
		}
	}
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

	if (oPiece.type ==  "pawn") { 
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
	}

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
				if (oTargetPiece.color != oPiece.color) {
					return true;
				}
			} else {
				return true;
			}
		}
	}

	if (oPiece.type == "rook" || oPiece.type == "queen") {
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
	}
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
Canvas3D.addEvent(window, "load", init);

})();