const userdata=require('../model/usercredential');

exports.userdata = async(req,res)=>{

    try{

        const {name,userid}=req.body;


        if(!name || !userid){

            return res.status(400).json({message:"please fill the data"});
        }

        const user =new userdata({name,userid});

        await user.save();


        res.status(201).json({ message: 'User credential created successfully' });


       
    }
     catch(error){


        res.status(501).json({message:error.message
        });
            
        }

}