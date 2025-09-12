// import { json } from "express";
import { asyncHandeller } from "../utils/asyncHandeller.js";
import {ApiError} from "../utils/apierror.js"
import { User } from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiresponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";



const generateAccessTokenAndRefreshToken = async(userId)=>
{
    try {
        const user = await User.findById(userId)    
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
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
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
         const {email, username, password} = req.body
            console.log(email);

         if (!username && !email) {
        throw new ApiError(400, "username or email is required")
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

        const logedInUser = await User.findById(user._id).select("-password -refreshToken")

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
                $unset: 
                {
                  refreshToken: 1,
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

    const refeshAccessToken = asyncHandeller(async (req, res)=>{

      const incomingRfreshToken =  req.cookies?.refreshToken  || req.body.refreshToken
      if (!incomingRfreshToken) {
        throw new ApiError(401, 'Unauthorized reques')
      }

     try {
        const decodedToken = jwt.verify(
           incomingRfreshToken,
           process.env.REFRESH_TOKEN_SECRET
         )
   
       const user = await  User.findById(decodedToken?._id)
       if (!user) {
           throw new ApiError(401, " INVALID REFRESH TOKEN")
       }
   
       if (incomingRfreshToken !== user?.refreshToken) {
           throw new ApiError(401,"Refresh Token is expired or used")
       }
   
       const options = {
           httpOnly: true,
           secure: true
       }
   
       const {accessToken, newrefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
   
        return res
        .status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
       .json(
           new ApiResponse(
               200,
               {
                   accessToken,
                   refreshToken: newrefreshToken,
               },
               "Access token refresh"
           )
       )
       
     } catch (error) {
             throw new ApiError(401, error?.message || "Invalid refresh token") 
            }
    })

    const changeCurrentUserPassword = asyncHandeller(async(req,res)=>{
        const { newPassword, oldPassword, confirmPassowrd } = req.body

        // if (!(newPassword === confirmPassowrd)) {
        //     throw new ApiError(400, "Please enter correct password")
        // }

     const user = await User.findById(req.user?._id) //may it id
      const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
      
      if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
      }

      user.password = newPassword
      await  user.save({validateBeforeSave: false})

      return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password change succesfully"))

    })

    const getCurrentUser = asyncHandeller(async(req, res )=>{
        return res
            .status(200
            .json(new ApiResponse(200, req.user, "Current user fetch succecfully"))
        )
    })

    const updateAccountDetails = asyncHandeller(async(req, res )=>{
        const {fullname, email} = req.body

        if (!fullname || !email) {
            throw new ApiError(400, "All feilds are required")
        }

      const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email,
            }
        },
        {new: true}

    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user, "Account details updated succesfully"))

    })

    const updateUserAvatar = asyncHandeller(async(req, res)=>{

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatart file is missing")
    }

      const avatar = await uploadCloudinary(avatarLocalPath)

      if (!avatar.url) {
        throw new ApiError(400,"Error while uploading avatar")
      }

    const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
      ).select("-password")

      return res
      .status(200)
        .json(
            new ApiResponse(200, user, "Avatar updated successfully")
        )

    })
    const updateUserCoverImage = asyncHandeller(async(req, res)=>{

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400,"Cover image file is missing")
    }

      const coverImage = await uploadCloudinary(coverImageLocalPath)

      if (!coverImage.url) {
        throw new ApiError(400,"Error while uploading Image")
      }

    const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
      ).select("-password")

      return res
      .status(200)
        .json(
            new ApiResponse(200, user, "cover image updated successfully")
        )
    })

    const getuserChannelProfile = asyncHandeller(async(req, res)=>{

        const {username} = req.params

        if (!username?.trim()) {
            throw new ApiError(400, "Username is missing")
        }

      const channel = await User.aggregate(
        [
            {
                $match: {
                    username: username?.toLowerCase
                }          
             },

             {
                $lookup: {
                    from : "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
             },

            {
                 $lookup: {
                    from : "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscriberdTo"    
             }
            },

            {
                $addFields:{
                    subscriberCounts: {
                        $size: "$subscribers"
                    },
                    channelSubscribedToCount:{
                        $sized: "$subscriberdTo"
                    },
                    isSubscribed: {
                        $cond:{
                            if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                            then:true,
                            else: false
                        }
                    }
                }
            },
            {
           $project: {
            fullname: 1,
            username: 1,
            subscriberCounts: 1,
            channelSubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1
           }
           }
        ])

        if (!channel?.length) {
            throw new ApiError(404,"channel does not exist")
        }

        return res
        .status(200)
        .json(
            new ApiError(200, channel[0], "User channel fetched successfully")
        )
    })


    const getWatchHistory = asyncHandeller(async(req, res)=>{
       const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField:"owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner: {
                    $first: "$owner"
                }
            }
        }
       ])

       return res
       .status(200)
       .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watch history fetch succecfully"
        )
       )

    })

export {
     registerUser,
     loginUser,
     logoutUser,
     refeshAccessToken,
     changeCurrentUserPassword,
     getCurrentUser,
     updateAccountDetails,
     updateUserAvatar,
     updateUserCoverImage,
     getuserChannelProfile,
     getWatchHistory,
    }