const CACHE_NAME = "project-manager-v1";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./styles.css",
    "./program.js",
    "./manifest.json",
    "./Logo-1.png"
];


self.addEventListener(
    "install",
    event => {

        event.waitUntil(
            caches.open(
                CACHE_NAME
            )
            .then(
                cache =>
                    cache.addAll(
                        FILES_TO_CACHE
                    )
            )
        );

    }
);


self.addEventListener(
    "fetch",
    event => {

        event.respondWith(
            caches.match(
                event.request
            )
            .then(
                cachedResponse =>
                    cachedResponse ||
                    fetch(
                        event.request
                    )
            )
        );

    }
);