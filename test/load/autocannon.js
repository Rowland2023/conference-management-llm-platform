import autocannon from "autocannon";
import crypto from "crypto";

const instance = autocannon({
  url: "http://localhost:3000/health",
  method: "GET",
  connections: 100,
  duration: 20,
  headers: {
    "X-Correlation-Id": crypto.randomUUID()
  }
});

autocannon.track(instance);

instance.on("done", (result) => {
  console.log(result);
});