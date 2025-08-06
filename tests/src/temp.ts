import "jopi-node-space"; // Optional

const myRandom = Math.trunc(Math.random() * 1000);
NodeSpace.timer.newInterval(1000, () => {console.log("Timer (newInterval)", myRandom) });