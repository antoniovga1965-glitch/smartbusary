const express = require('express');
const router = express.Router();
const cookieparser = require('cookie-parser');

router.post('/logoutstudent',(req,res)=>{
    try {
        res.clearCookie('token',{
        httpOnly:true,
        sameSite:"lax",
        secure:false,
    })
    return res.status(200).json({message:'logged out succesfully'})
    } catch (error) {
        console.error(error)
         return res.status(500).json({message:'Failed to log you out try agan'})
    }
    
})
module.exports =router;