// import { json } from "express";
import { asyncHandeller } from "../utils/asyncHandeller.js";
import {ApiError} from "../utils/apierror.js"
import { User } from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiresponse.js";

const generateAccessTokenAndRefreshToken = async(userId)=>
{
    try {
        const user = await user.findById(userId)    
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return({accessToken, refreshToken})

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refesh token and acces token")
    
    }

}


const registerUser = asyncHandeller( async (req, res)=>{
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
    // console.log('email', email);npm run dev

    if (
       [ fullname, email, username, password].some((field) => field?.trim() === "" )
    ) {
        throw new ApiError(400, "All fields are required")
    }
    
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
     console.log(req.files);
     

   const avatarLocalPath = req.files?.avatar[0]?.path;
//    const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

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

    const createdUser = await user.findOne(user._id).select(
        "-password, -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Some thing went wrong while registring a user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered succesfully")
    )

    })

    const loginUser = asyncHandeller( async (req, res)=>{
        //req.body ->  data
        //username or email
        //find the user
        //password check
        //access token, refresh token
        //send cookies
        const { username, email, password} = req.body

        if (!username || !email) {
            throw new ApiError(400, "All fields are required")
        }

        const user = await User.findOne({
            $or: [{ username }, { email }]
        })

        if (!user) {
            throw new ApiError(404, "User not found")
        }

      const isPasswordValid = await user.isPasswordCorrect(password)

        if (!isPasswordValid) {
            throw new ApiError(401, "incorrect password")
        }
        
        const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

        const logedInUser = await user.findById(user._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
        new ApiResponse(
            200,
            {
                user: logedInUser, accessToken, refreshToken
        },
        "user loged in successfully"
    )
        )
    })

    const logoutUser = asyncHandeller(async(req, res)=>{
       await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: 
                {
                  refreshToken: undefined,
                }
            },
            {
                new: true
            },
        )

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200,{}, "user logged out" ))
    })


export {
     registerUser,
     loginUser,
     logoutUser,
    }