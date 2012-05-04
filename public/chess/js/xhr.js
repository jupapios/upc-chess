
// retrieves a file via XMLHTTPRequest, calls fncCallback when done or fncError on error.

var XHR = function(strURL, fncCallback, fncError) {
	var oHTTP = null;
	if (window.XMLHttpRequest) {
		oHTTP = new XMLHttpRequest();
	} else if (window.ActiveXObject) {
		oHTTP = new ActiveXObject("Microsoft.XMLHTTP");
	}
	if (oHTTP) {
		if (fncCallback) {
			if (typeof(oHTTP.onload) != "undefined")
				oHTTP.onload = function() {
					fncCallback(this);
					oHTTP = null;
				};
			else {
				oHTTP.onreadystatechange = function() {
					if (oHTTP.readyState == 4) {
						fncCallback(this);
						oHTTP = null;
					}
				};
			}
		}
		oHTTP.open("GET", strURL, true);
		oHTTP.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2000 00:00:00 GMT");
		oHTTP.send(null);
	} else {
		if (fncError) fncError();
	}
}