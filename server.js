const express = require("express");
const app = express();
const PORT = process.env.PORT;
const SERVER_ID = process.env.SERVER_ID;

app.get("/", (req, res) => {
  res.json({
    message: "Ответ от сервера: ",
    server: SERVER_ID,
    port: PORT
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server ${SERVER_ID} port ${PORT}`);
});
