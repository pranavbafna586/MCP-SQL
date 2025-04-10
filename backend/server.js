// server.js - Launcher script for the MCP server
require("dotenv").config();
const path = require("path");
const express = require("express");
const app = require("./src/index");

// Serve static frontend files in production
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend");
  app.use(express.static(frontendPath));

  app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });

  console.log(`Serving frontend files from ${frontendPath}`);
}

// Note: The actual server start is in src/index.js
console.log("MCP Server initialized");
