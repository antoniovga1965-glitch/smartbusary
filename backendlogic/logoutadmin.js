const express = require('express');
const  router =express.Router();
const verifyjwt  =require('../adminmiddleware');


router.post('/logutadmin',verifyjwt,(req,res)=>{
try {
    res.clearCookie('token',{
    httpOnly:true,
     sameSite:'lax',
     secure:false,
    })
    return res.status(200).json({message:'You have logged out succesfully'})
    
} catch (error) {
    console(error);
}
})
module.exports = router;

