const http = require("http");
const app = require("./app");
const { API_PORT } = require("./_variables");
const server = http.createServer(app);

const port = API_PORT || process.env.PORT;

// server listening
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
