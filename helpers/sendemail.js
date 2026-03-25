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
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4; padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:8px; padding:40px; max-width:600px;">
          <tr>
            <td>
              <h2 style="color:#166534; margin-top:0;">Smart Bursary &#8212; Password Reset</h2>
              <p style="color:#333333; font-size:15px;">Click the button below to reset your password:</p>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding:16px 0;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#166534" style="border-radius:8px;">
                    <a href="${process.env.FRONTENDURL}/password.html?token=${token}"
                       target="_blank"
                       style="display:inline-block; padding:12px 24px; background-color:#166534; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold; font-size:14px; mso-padding-alt:12px 24px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <p style="color:#555555; font-size:13px; margin-top:8px;">If the button above does not work, copy and paste the link below into your browser:</p>
              <p style="word-break:break-all; font-size:13px;">
                <a href="${process.env.FRONTENDURL}/password.html?token=${token}"
                   target="_blank"
                   style="color:#166534;">
                  ${process.env.FRONTENDURL}/password.html?token=${token}
                </a>
              </p>
              <p style="color:#999999; font-size:12px; margin-top:24px;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
