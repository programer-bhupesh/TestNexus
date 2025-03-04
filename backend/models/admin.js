const mongoose=require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const Schema=mongoose.Schema;

const AdminSchema=new Schema({
    email:{
        type:String,
        unique:true
    },
    password:{
        type:String
    }
});
AdminSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("Admin",AdminSchema)
