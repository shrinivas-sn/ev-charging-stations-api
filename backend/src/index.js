"use strict";

const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`India EV Charging Station Directory API running on port ${PORT}`);
});

module.exports = app;
