import express, { Router, Request, Response } from "express";

const apiRoutes: Router = express.Router();

apiRoutes.get("/", (req,res)=>{
  res.send("Working")
})



export default apiRoutes;
