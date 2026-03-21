const express = require('express');
const router = express.Router();
const resend = require('./email');
const prisma = require('../prisma.client');
const crypto =require('crypto');
require('dotenv').config();
const bcrypt = require('bcrypt');
const path = require('path');

router.post('/emailreset',async(req,res)=>{
    const {email} = req.body;

    try {
        const existing = await prisma.registerd_users.findUnique({
            where:{email:email},
        })
        if(!existing){
            return res.status(404).json({message:'user email not found'})
        }
        const token  = crypto.randomBytes(32).toString('hex');
        await prisma.registerd_users.update({
            where:{email:email},
            data:{
                token,
                resetTokenExpiry:new Date(Date.now() +60*60*1000),
            }
        })

        const send=resend();
        await send.emails.send({
            from:'onboarding@resend.dev',
            to:email,
            subject:'Smart bursary Password reset',
            html:`
           <!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #166534;">Smart Bursary — Password Reset</h2>
  <p>Click the button below to reset your password:</p>
  <br/>
  <a href="${process.env.FRONTENDURL}/password.html?token=${token}" 
     style="display:inline-block; padding:12px 24px; background-color:#166534; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold; font-size:14px;">
    Reset Password
  </a>
  <br/><br/>
  <p style="color:#666; font-size:12px;">Link expires in 1 hour. If you did not request this, ignore this email.</p>
</body>
</html>`
        })
        return res.status(200).json({message:'link sent to your email address '});

        
    } catch (error) {
        console.error(error)
     return res.status(500).json({message:'something went wrong '});
    }
})


router.get('/', (req, res) => {
res.sendFile(path.join(__dirname,'../public/password.html'))
})

router.post('/savenewpassword',async(req,res)=>{
    const {token,PASSWORD}  =req.body;

    try {
         const user = await prisma.registerd_users.findFirst({
        where:{
            token,
            resetTokenExpiry:
            {gt:new Date()}
        }
    })
    if(!user){
        return res.status(422).json({message:'User not found or token expired'});
    }
     const savednewpass = await bcrypt.hash(PASSWORD,12);
       await prisma.registerd_users.update({
        where:{id:user.id},
        data:{
              registerpassword:savednewpass,
            token:null,
            resetTokenExpiry:null,
        }
     })
     return res.status(200).json({message:'password set succefully'});
    } catch (error) {
        console.error(error);
        
        return res.status(500).json({message:'something went wrong try again'}); 
    }
   
    
})
module.exports=router
