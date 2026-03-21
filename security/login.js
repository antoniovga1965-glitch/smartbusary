const express = require('express');
const router = express.Router();
const limit = require('express-rate-limit');
const cookieparser = require('cookie-parser');
const z = require('zod');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const prisma = require("../prisma.client");
const winston = require('../security/winston');


const loginschemas = z.object({
loginname:z.string().min(2,'Minimum of 2 names required to login'),
loginpassword:z.string().min(6,'Enter your password to gain acess'),
});


const verifyloginschemas = (req,res,next)=>{
    const verifiedloginsheme = loginschemas.safeParse(req.body);
    if(!verifiedloginsheme.success){
        return res.status(422).json({message:'Something is wrong in your input fields check and try again later'});
    }
    next();
}



const limitor = limit({
    windowMs:15*60*1000,
    max:20,
    message:{message:'Too many login attempts try again after 15 minutes'}
})

router.post('/loginroute',verifyloginschemas,limitor,async(req,res)=>{
const {loginname,loginpassword} = req.body;
if(!loginname ||!loginpassword){
     winston.info(`${loginname} tried to login in with empty login credentials`)
    return res.status(422).json({message:'Fill in the fields to validate them'});
   
}

try {
    const match = await prisma.registerd_users.findFirst({
        where:{registername:loginname}
    })

    if(!match){
         winston.info(`${loginname} tried to login in with incorrect credentials`)
        return res.status(401).json({message:'Incorrect login credentials check and try again'});
       
    }
    const passwordcompare = await bcrypt.compare(loginpassword,match.registerpassword);
    if(!passwordcompare){
        return res.status(422).json({message:'Incorrect login credentials check and try again'});
    }

    const token = jwt.sign({id:match.id,name:match.registername,role:match.role},process.env.JWT_SECRET,{expiresIn:'1h'});

    res.cookie('token',token,{
        httpOnly:true,
        sameSite:'lax',
        secure:false,
        maxAge:60*1000*1000,
    })

    if(match.role==='admin'){
        return res.status(200).json({message:`Dear ${loginname}Logged in sucessfully`,redirect:`/admin.html`});

    }else if(match.role==='student'){
        return res.status(200).json({message:`Dear ${loginname}Logged in sucessfully`,redirect:`/student.html`});
    }
    
    winston.info(`${loginname} logged in succesfully`)
    
    
    
} catch (error) {
    console.error(error);
    winston.warn("something bad during login happened")
     return res.status(500).json({message:`Something wrong happened check and try again `})
    
}
})



module.exports=router;