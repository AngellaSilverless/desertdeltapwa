const DB_NAME       = 'indexeddb-desertdelta';
const DB_STORE_NAME = 'desertdelta';
const DB_VERSION    = 1;

var db;
var transaction;
var blobURLs = [];
var updated = false;

/*************************************************/
/*               DATABASE FUNCTIONS              */
/*************************************************/


/* Open Indexed Database */

function openDB() {
	logInfo("Opening database ...");
	var request = indexedDB.open(DB_NAME, DB_VERSION);
	
	request.onsuccess = function(event) {
		db = this.result;
		
		if(!updated) {
			readResources();
		} else {
			logInfo("Downloading files...");
			loadBlobs();
		}
	}
	
	request.onerror = function(event) {
		logError("opendDB FAILED - Error: ", event.target.errorCode);
	}
	
	request.onupgradeneeded = function(event) {
		updated = true;
		logInfo("Updating database...");
		var store = event.target.result.createObjectStore(DB_STORE_NAME, {
			autoIncrement: true
		});
	}
}

/* Retrieve store object - Mode ("readonly" or "readwrite") */

function getObjectStore(store_name, mode) {
	var storeObject = db.transaction(store_name, mode);
	return storeObject.objectStore(store_name);
}

/* Delete Database Store Data */

function clearObjectStore() {
	var req = indexedDB.deleteDatabase(DB_NAME);
	req.onsuccess = function () {
		logInfo("Deleted database successfully");
	};
	
	req.onerror = function () {
		logError("Error deleting database");
	};
}

/* Add resources to database */

function addResources() {
	var item = 0;
	var itemsLength = blobURLs.length;
	
	logInfo("Inserting resources in database ...");
	
	logInfo("<div id='progress-bar'><span id='progress'>" + Math.round(item/itemsLength * 100) + "</span>% completed</div>");
	
	for (let i = 0; i < blobURLs.length; i++) { 
		let store = getObjectStore(DB_STORE_NAME, "readwrite");
		var request;
		
		try {
			request = store.add(blobURLs[i]);
		} catch(e) {
			if(e.name == "DataCloneError") {
				logError("Your browser does not support Blob storage");
			}
			
			var reader = new FileReader();
			
			reader.onload = function(event) {
				
				let store = getObjectStore(DB_STORE_NAME, "readwrite", true);
				let req;
				
				var data = event.target.result;
				var obj  = {
					id:       blobURLs[i].id,
					resource: blobURLs[i].resource,
					type:     blobURLs[i].type,
					data:     event.target.result
				}
				
				try {
					req  = store.add(data);
				} catch(e) {
					logError("Your browser could not store blob data");
					
					throw e;
				}
			};
			
			reader.readAsDataURL(blobURLs[i].data);
		}
		
		request.onsuccess = function(event) {
			item++;
			document.getElementById("progress").innerHTML = Math.round(item/itemsLength * 100);

			if(i == blobURLs.length - 1){
				readResources();
			}
		}
		
		request.onerror = function() {
			logError("Error inserting resource in database");
			throw new Error("Stop script");
			return false;
		}
	}
}
function loadBlobs() {
	
	var resourceRequest = {
	    send : function(resource, id, url, resourceType){
	        var promise = new Promise(function(resolve, reject){
	            var xhr = new XMLHttpRequest();
	            xhr.open('GET', encodeURI(url), true);
	            xhr.responseType = 'arraybuffer';
	            
	            xhr.onload = function(e) {
	                if (xhr.status === 200 || xhr.status === 0) {
	                    var resourceBlob = this.response;
					    blobURLs.push({
						    id:       id,
						    data:     resourceBlob,
						    type:     xhr.getResponseHeader("Content-Type"),
						    resource: resourceType
						    
						});
						
						item++;
						document.getElementById("progress3").innerHTML = Math.round(item/itemsLength * 100);
			
	                    resolve();
	                } else {
	                    console.log("XHR Status: ", xhr.status);
	                }
	            };
	            
	            xhr.onerror = function (e) {
					logError("An error occurred during the HTTP request");
					clearObjectStore();
				};

	            xhr.send();
	        });
	        return promise;
	    }
	}
	
	var images = uniqueElements([...document.getElementsByTagName("img")]);
	var videos = [...document.getElementsByTagName("source")];
	var posters = [...document.getElementsByTagName("video")];
	
	var item = 0;
	var itemsLength = images.length + videos.length + posters.length;
	
	logInfo("<div id='progress-bar3'><span id='progress3'>" + Math.round(item/itemsLength * 100) + "</span>% completed</div>");
	
	var promiseLimit = 3;
	var promiseCount = 0;
	
	var promises = new Array(Math.ceil(itemsLength / promiseLimit));
	for(let i = 0; i < promises.length; i++) {
		promises[i] = [];
	}
	
	for (let i = 0; i < images.length; i++) {
		promises[Math.ceil(++promiseCount/promiseLimit) - 1].push({
			element: images[i],
			id:      images[i].id,
			url:     images[i].getAttribute("data-url"),
			type:    "image"
		});
		//promises[Math.ceil(++promiseCount/promiseLimit) - 1].push(resourceRequest.send(images[i], images[i].id, images[i].getAttribute("data-url"), "image"));
	}
	
	for (let i = 0; i < videos.length; i++) {
		var parent = videos[i].parentElement;
		while(!parent.id || !parent.classList.contains("pageItem")) {
			parent = parent.parentElement;
		}
		promises[Math.ceil(++promiseCount/promiseLimit) - 1].push({
			element: videos[i],
			id:      parent.id,
			url:     videos[i].getAttribute("data-url"),
			type:    "video"
		});
		//promises[Math.ceil(++promiseCount/promiseLimit) - 1].push(resourceRequest.send(videos[i], parent.id, videos[i].getAttribute("data-url"), "video"));
	}
	
	for (let i = 0; i < posters.length; i++) { 
		var parent = posters[i].parentElement;
		while(!parent.id || !parent.classList.contains("pageItem")) {
			parent = parent.parentElement;
		}
		promises[Math.ceil(++promiseCount/promiseLimit) - 1].push({
			element: posters[i],
			id:      parent.id,
			url:     posters[i].getAttribute("data-poster"),
			type:    "poster"
		});
		//promises[Math.ceil(++promiseCount/promiseLimit) - 1].push(resourceRequest.send(posters[i], parent.id, posters[i].getAttribute("data-poster"), "poster"));
	}
	
	sendPromises(0);
	
	function sendPromises(promiseOrder) {
		var childPromise = [];
		var info = promises[promiseOrder];
		
		for(let i = 0; i < promiseLimit; i++) {
			if(info[i])
				childPromise.push(resourceRequest.send(info[i].element, info[i].id, info[i].url, info[i].type));
		}
		
		Promise.all(childPromise).then(function() {
			
			// Break recursive function
			if(promiseOrder < promises.length - 1) {
				sendPromises(promiseOrder + 1);
			} else {
				addResources();
			}
		});
	}
}

function uniqueElements(objects) {
	var uniqueAddresses = Array.from(
		new Set(objects.map(a => a.id))).map(id => {
			return objects.find(a => a.id === id)
		}
	);
	
	return uniqueAddresses;
}

function readResources() {
	logInfo("Loading resources ...");
	
	var countRequest = getObjectStore(DB_STORE_NAME, "readonly").count();
	countRequest.onsuccess = function() {
		
		var item = 0;
		var itemsLength = countRequest.result;
	
		logInfo("<div id='progress-bar'><span id='progress2'>" + Math.round(item/itemsLength * 100) + "</span>% completed</div>");
	
		var store = getObjectStore(DB_STORE_NAME, "readonly");
		
		store.openCursor().onsuccess = function(event) {
			var cursor = event.target.result;
			
			if(cursor) {
				var element = cursor.value;
				
				var arrayBuffer = new Uint8Array(element.data);
				var blob = new Blob([arrayBuffer], {type: element.type});
				var url = window.URL.createObjectURL(blob);
				
				item++;
				document.getElementById("progress2").innerHTML = Math.round(item/itemsLength * 100);
	
				if(element.resource == "image") {
					if(element.id) {
						var allElements = document.querySelectorAll('[id=' + element.id + ']');
						for(let i = 0; i < allElements.length; i++) {
							allElements[i].setAttribute("src", url);
						}
					}
				} else if(element.resource == "poster") {
					document.getElementById(element.id).getElementsByTagName("video")[0].setAttribute("poster", url);
				} else if(element.resource == "video") {
					document.getElementById(element.id).getElementsByTagName("source")[0].setAttribute("src", url);
					document.getElementById(element.id).getElementsByTagName("video")[0].load();
				}
				
				cursor.continue();
			} else {
				logSuccess("Resources LOADED");
				
				document.getElementById("logDIV").style.display = "none";
				document.getElementById("container-wrap").style.display = "block";
			}
		}
	}
}

/*************************************************/
/*              SERVICE WORKER CALL              */
/*************************************************/

if ('serviceWorker' in navigator) {
	if('indexedDB' in window) {
		navigator.serviceWorker.register('sw1.js', {
			useCache: true
		}).then((reg) => {
			openDB();
		});
	} else {
		logError("Your browser does not support IndexedDB");
	}
} else {
	logError("Your browser does not support Service Worker");
}

/*************************************************/
/*                LOG INFORMATION                */
/*************************************************/


function logInfo(text, more) {
	var div = document.getElementById("logDIV");
	
	if(more) {
		div.innerHTML += ('<br>' + text + more);
	} else {
		div.innerHTML += ('<br>' + text);
	}
}

function logError(text, more) {
	var div = document.getElementById("logDIV");
	
	if(more) {
		div.innerHTML += ('<br><span style="color:red;font-weight:bold;">' + text + more + "</span>");
	} else {
		div.innerHTML += ('<br><span style="color:red;font-weight:bold;">' + text + "</span>");
	}
	
	if(updated) {
		clearObjectStore();
	}
	throw new Error("OOPS, something went wrong!!!");
}

function logSuccess(text) {
	var div = document.getElementById("logDIV");
	
	div.innerHTML += ('<br><span style="color:green;font-weight:bold;">' + text + "</span>");
}