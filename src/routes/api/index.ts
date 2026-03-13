import express, { Request, Response, type Router } from "express";

const apiRoutes: Router = express.Router();

apiRoutes.get("/", (req, res) => {
	res.send("Working");
});

export default apiRoutes;
