// swagger.js
const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "Auto-generated API Docs",
    description: "This doc is generated automatically",
  },
  host: "localhost:3000",
  schemes: ["http"],
  basePath: "/",
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./src/routes/index.js"]; // hoặc route chính

// swaggerAutogen(outputFile, endpointsFiles, doc);
