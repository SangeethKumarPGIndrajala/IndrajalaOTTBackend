const jwt=require("jsonwebtoken");
//token verification
const userAuth=(req,res,next) =>{
    const token=req.header('x-access-protected')
    if(!token){
        return res.status(500).json({message:"access denied"})
    }
    try {
        const decoded=jwt.verify(token,process.env.SECRET)
        req.user=decoded
        next()
    } catch (error) {
        res.status(500).json({error:'invalid token'})
    }
}
module.exports={userAuth}