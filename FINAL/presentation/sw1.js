'use strict';
console.log("Loading Service Worker v1");

const CACHE_NAME = 'static-cache-v1';

const FILES_TO_CACHE = [
	'/',
	'index.html',
	'assets/css/in5.slider.css',
	'assets/css/mediaelementplayer.min.css',
	'assets/css/pages.css',
	'assets/js/in5.config.js',
	'assets/js/in5.viewer.js',
	'assets/js/jquery.anythingslider.min.js',
	'assets/js/jquery.colorbox-min.js',
	'assets/js/jquery.min.js',
	'assets/js/jquery.touchSwipe.min.js',
	'assets/js/mediaelement-and-player.min.js',
	'assets/js/swfobject.js',
	'assets/js/vmouse.min.js',
	'assets/images/controls.png',
	'assets/images/bigplay.png',
	'assets/images/loading.gif',
	'images/icon-128x128.png',
	'images/icon-144x144.png',
	'images/icon-152x152.png',
	'images/icon-192x192.png',
	'images/icon-256x256.png',
	'images/icon-512x512.png'
];

self.addEventListener('install', function(event) {
	console.log('[ServiceWorker] Install');
	event.waitUntil(
		caches.open(CACHE_NAME).then(function(cache) {
			console.log('[ServiceWorker] Pre-caching offline page');
			return cache.addAll(FILES_TO_CACHE);
		})
	);
	
	self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
	evt.waitUntil(
		caches.keys().then((keyList) => {
			return Promise.all(keyList.map((key) => {
				if (key !== CACHE_NAME) {
					console.log('[ServiceWorker] Removing old cache', key);
					return caches.delete(key);
				}
			}));
		})
	);

  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
	event.respondWith(
		caches.open(CACHE_NAME).then(function(cache) {
			return cache.match(event.request).then(function (response) {
				return response || fetch(event.request).then(function(response) {
					cache.put(event.request, response.clone());
					return response;
				});
			});
		})
	);
});