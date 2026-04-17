const  mongoose=require('mongoose');







const usercredential =new mongoose.Schema({



    name:{

        type:String,

        required:true,

    },



    userid:{

        type:Number,

        required:true,

       

    }

})



module.exports=mongoose.model('usercredential',usercredential);