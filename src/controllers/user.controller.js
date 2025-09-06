import { json } from "express";
import { asyncHandeller } from "../utils/asyncHandeller.js";

const registerUser = asyncHandeller(async(req, res)=>{
    res.status(200)+json({
        message: "ok"
    })
});

export { registerUser }