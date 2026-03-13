import express, { type Response, type Router } from "express";

const apiRoutes: Router = express.Router();

apiRoutes.get("/", (res: Response) => {
	res.send("Working");
});

export default apiRoutes;
