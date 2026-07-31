import autocannon from "autocannon";

autocannon({

    url: "http://localhost:3000",

    connections: 100,

    duration: 30,

    pipelining: 10

}, console.log);