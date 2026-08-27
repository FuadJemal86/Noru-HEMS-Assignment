const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require("cookie-parser");
const { main: mainPrisma } = require("./prisma/prisma");
const hrRouter = require("./Routes/hr.routes");

dotenv.config();


const app = express();

// Trust proxy for correct IP addresses (important for VPS behind nginx)
app.set("trust proxy", true);

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://usify.stockwise.store",
            "http://localhost:5174",
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "UPDATE"],
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use("/api/hr", hrRouter);

// Global error handler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});




// Test database connection 
mainPrisma
    .$connect()
    .then(() => {
        console.log("Connected to database via Prisma main!");
    })
    .catch((err) => {
        console.error("Database connection failed:", err.message);
    });

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please use a different port or stop the existing server.`);
        console.error(`   You can find and kill the process using: lsof -ti:${PORT} | xargs kill -9`);
    } else {
        console.error('Server error:', err);
    }
    setTimeout(() => process.exit(1), 1000);
});


// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
        process.exit(1);
    }
});

// Keep the process alive
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        mainPrisma.$disconnect().then(() => {
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        mainPrisma.$disconnect().then(() => {
            process.exit(0);
        });
    });
});
