import { Router } from "express";
import {
     loginUser,
     logoutUser,
     registerUser, 
     refeshAccessToken,
     changeCurrentUserPassword,
     getCurrentUser, 
     updateAccountDetails, 
     updateUserAvatar, 
     updateUserCoverImage, 
     getuserChannelProfile, 
     getWatchHistory
     }
     from "../controllers/user.controller.js";

import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route('/refresh-token').post(refeshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentUserPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("cover-image"), updateUserCoverImage)
router.route("/c/:username").get(verifyJWT, getuserChannelProfile)
router.route("/watch-history").get(verifyJWT, getWatchHistory)

export default router