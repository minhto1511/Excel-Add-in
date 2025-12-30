import express from "express";

const app = express(); //create express app

app.use(express.json());

export default app;
