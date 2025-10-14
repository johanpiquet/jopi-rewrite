// This script is injected inside the browser.
// It allows doing automatic refresh.

(function() {
    const ws = new WebSocket("JOPIN_WEBSOCKET_URL");

    ws.onopen = function () {
        console.log("Jopi Loader - Connection open");
    }

    ws.onclose = function () {
        console.log("Jopi Loader - Connection closed");
    }

    ws.onerror = function () {
        console.log("Jopi Loader - Connection error");
    }

    ws.onmessage = (e) => {
        let msg = e.data;

        if (msg==="browser-refresh-asked") {
            window.location.reload();
        }
    }
})();