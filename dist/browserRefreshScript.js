// This script is injected inside the browser.
// It allows doing automatic refresh.
(function () {
    function retry() {
        if (isRetryAsked)
            return;
        isRetryAsked = true;
        setTimeout(() => { tryOpenSocket(); }, retryDelay);
    }
    function tryOpenSocket() {
        isRetryAsked = false;
        retryDelay += 100;
        if (retryDelay > 1000)
            retryDelay = 1000;
        //console.clear();
        console.log("Retry, delay:", retryDelay);
        const ws = new WebSocket(wsUrl);
        ws.onopen = function () {
            console.clear();
            if (mustRefreshOnOpen)
                window.location.reload();
        };
        ws.onclose = function () {
            mustRefreshOnOpen = true;
            retry();
        };
        ws.onerror = function () {
            console.clear();
            retry();
        };
    }
    let mustRefreshOnOpen = false;
    let retryDelay = 500;
    let isRetryAsked = false;
    const wsUrl = window.location.origin + "/jopi-autorefresh-rkrkrjrktht/wssocket";
    tryOpenSocket();
})();
export {};
//# sourceMappingURL=browserRefreshScript.js.map