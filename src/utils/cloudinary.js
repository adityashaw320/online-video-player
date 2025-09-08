    import { v2 as cloudinary } from "cloudinary";
    import fs from "fs"

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });


const uploadCloudinary = async (localFilePath)=>{
try {
    if (!localFilePath)return null
    //upload the file on Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto"
    })
    //file has  been uploaded succesfully
   // console.log(response.url, "file is uploaded on cloudinary");
    fs.unlinkSync(localFilePath)
    return response;
    
} catch (error) {
    fs.unlinkSync(localFilePath)//remove the locally saved temporery file as the operation gor failed
    return null
}
}

export {uploadCloudinary}


