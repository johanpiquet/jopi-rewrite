import { JopiRequest } from "./core.js";
const newInterval = NodeSpace.timer.newInterval;
export class LoadBalancer {
    servers = [];
    totalWeight = 0;
    head;
    tail;
    lastUsedServer;
    isTimerStarted = false;
    addServer(server, weight) {
        if (server.loadBalancer)
            throw Error("Server already added to a load balancer");
        server.loadBalancer = this;
        if (!weight)
            weight = 1;
        else if (weight > 1)
            weight = 1;
        else if (weight < 0)
            weight = 0;
        const lbServer = { fetcher: server, weight };
        if (!this.head)
            this.head = lbServer;
        lbServer.next = this.head;
        if (this.tail)
            this.tail.next = lbServer;
        this.tail = lbServer;
        this.servers.push(lbServer);
        this.totalWeight += lbServer.weight;
    }
    replaceServer(oldServer, newServer, weight) {
        const lbServer = this.servers.find(s => s.fetcher === oldServer);
        if (!lbServer)
            return;
        newServer.loadBalancer = this;
        lbServer.isServerDown = false;
        lbServer.fetcher = newServer;
        if (weight !== undefined)
            lbServer.weight = weight;
    }
    selectServer() {
        if (this.servers.length === 0)
            return undefined;
        const lastUsedServer = this.lastUsedServer || this.tail;
        let cursor = lastUsedServer.next;
        let round = 0;
        let random = Math.random();
        while (true) {
            if (cursor === lastUsedServer) {
                round++;
                if (round === 1) {
                    // If we are here, it's mean we have tested all the server but no one is ok.
                    // Then reduce the random value to 0 to include a server with weight 0.
                    //
                    random = 0;
                }
                else if (round === 2) {
                    // No server despite that?
                    return undefined;
                }
            }
            if (cursor.isServerDown)
                continue;
            if (random < cursor.weight)
                break;
            cursor = cursor.next;
        }
        this.lastUsedServer = cursor;
        return cursor;
    }
    async fetch(method, url, body, headers) {
        const server = this.selectServer();
        if (!server)
            return new Response("", { status: 521 });
        const res = await server.fetcher.fetch(method, url, body, headers);
        if (res.status === 521) {
            this.declareServerDown(server);
            // We retry with the next server.
            // It's ok since the body isn't consumed yey.
            return this.fetch(method, url, body, headers);
        }
        return res;
    }
    async directProxy(serverRequest) {
        const server = this.selectServer();
        if (!server)
            return new Response("", { status: 521 });
        const res = await server.fetcher.directProxy(serverRequest);
        if (res.status === 521) {
            this.declareServerDown(server);
        }
        return res;
    }
    declareServerDown(server) {
        if (server.isServerDown)
            return;
        server.isServerDown = true;
        if (!this.isTimerStarted) {
            newInterval(2000, () => this.onTimer());
        }
    }
    onTimer() {
        let hasServerDown = false;
        this.servers.forEach(async (server) => {
            if (!server.isServerDown)
                return;
            if (await server.fetcher.checkIfServerOk()) {
                server.isServerDown = false;
            }
            else {
                hasServerDown = true;
            }
        });
        if (!hasServerDown) {
            this.isTimerStarted = false;
            // Returning false will stop the timer.
            return false;
        }
        // The timer will continue.
        return true;
    }
}
//# sourceMappingURL=loadBalancing.js.map