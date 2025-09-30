// services/payment-service/swagger.js
import swaggerAutogen from "swagger-autogen";

const doc = {
    info: {
        title: "Payment Service API",
        description: "Payment endpoints"
    },
    host: "localhost:5002", // used by swagger-autogen for docs generation (dev)
    schemes: ["http"],
    components: {
        securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
        }
    },
    tags: [{ name: "Payments", description: "Payment endpoints" }]
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./routes/paymentRoutes.js"]; // adjust to your routes entry file(s)

swaggerAutogen()(outputFile, endpointsFiles, doc).then(() => {
    console.log("swagger-output.json created.");
});
