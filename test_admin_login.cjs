const http = require("http");

const payload = JSON.stringify({
  email: "superadmin@iraqbid.com",
  password: "IraqBid2026!"
});

const req = http.request(
  {
    hostname: "127.0.0.1",
    port: 5055,
    path: "/api/admin/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  },
  res => {
    let body = "";
    res.on("data", c => (body += c));
    res.on("end", () => {
      console.log("LOGIN RESPONSE STATUS:", res.statusCode);
      console.log("LOGIN RESPONSE BODY:", body);
    });
  }
);

req.on("error", err => console.error("HTTP error:", err));
req.write(payload);
req.end();
