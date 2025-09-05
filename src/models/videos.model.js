import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile:{
            type: String, //cloudnary url
            required: true,
        },
        thumbnail:{
             type: String, //cloudnary url
            required: true,
        },
        titel:{
            type:String, 
            required: true,
        },
        description :{
            type: String, 
            required: true
        },
        duraation:{
            type: Number, 
            required: true
        },
        views:{
            type: Number,
            default: 0
        },
        isPublish:{
            type: Boolean,
            default: true
        },
        owner:{
            type: Schema.Types.ObjectId,
            ref:'User'

        }
}, 
{
    timestamps: true
}
)

videoSchema.plugin(mongooseAggregatePaginate)


export const Videos = mongoose.model("Videos", videoSchema)