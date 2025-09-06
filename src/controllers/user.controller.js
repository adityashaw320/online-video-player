// import { json } from "express";
import { asyncHandeller } from "../utils/asyncHandeller.js";
import {ApiError} from "../utils/apierror.js"
import { User } from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiresponse.js";

const registerUser = asyncHandeller(async(req, res)=>{
   //get user detail from frontend
   // validation - not empty
   // check if user alredy exists: username, email
   //check for images, check for avatar
   //upload them to cloudinary, avtar
   // create user object - create entry in db
   //remove password and refres token feilod from response
   //check for user creation 
   //return response

  const { username, fullname, email, password} = req.body
    console.log('email', email);

    if (
       [ fullname, email, username, password].some((field) => field?.trim() === "" )
    ) {
        throw new ApiError(400, "All fields are required")
    }
    
   const exitedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if (exitedUser) {
        throw new ApiError(409, "User with email or username alredy exists")
    }

   const avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(404, "Avatar file is required")
    }

  const avatar = await uploadCloudinary(avatarLocalPath)
  const coverImage = await uploadCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(404, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage.url || "",
        email, 
        password,
        username: username.toLowerCase
    })

    const createdUser = await user.findById(user._id).select(
        "-password, -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Some thing went wrong while registring a user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered succesfully")
    )

    })


export { registerUser }