const prisma = require('./prisma.client');
const jwt = require('jsonwebtoken');

const verifyadmin = async(req,res,next)=>{
    const token = req.cookies.token;
    if(!token){
        res.status(422).json({messsage:'No token found'})
    }
    try {
        const decoded = jwt.verify(token,process.env.JWT_SECRET);

        const user= await prisma.registerd_users.findUnique({
            where:{id:decoded.id}
        })

        if(!user){
            return res.status(422).json({message:'user not found'})
        }
            

        if(user.role!=='admin'){
            return res.status(409).json({message:'only administrators are allowed to use this site!'});
        }

        

        req.user = user;
        next();
    } catch (error) {
        return res.status(500).json({message:'invalid token'})
    }

}

module.exports = verifyadmin;
