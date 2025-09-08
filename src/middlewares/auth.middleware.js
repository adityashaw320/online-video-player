import { ApiError } from "../utils/apierror.js";
import { asyncHandeller } from "../utils/asyncHandeller.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";


export const verifyJWT = asyncHandeller(async(req,  _, next)=>{
  try {
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer", "")
  
      if (!token){
          throw new ApiError(401, "Unauthorized token")
      }
  
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
  
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
  
      if (!user) {
      throw new ApiError(401, "Invalid Access Token")        
      }
  
      req.user = user;
      next()
  } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
  }

})