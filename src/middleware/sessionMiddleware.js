import { v4 as uuidv4 } from "uuid";

export const sessionMiddleware = async(req,res,next)=>{
    let sessionId = req.cookies?.sessionId;

    if(!sessionId){
        sessionId=uuidv4();
        res.cookie("sessionId",sessionId,{
            httpOnly:true,
            maxAge:30*24*60*60*1000,
            // sameSite:'lax',
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
        })
    }

     req.sessionId = sessionId;
  next();
}


