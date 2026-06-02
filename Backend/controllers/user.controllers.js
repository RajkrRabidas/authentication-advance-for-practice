const redisClient = require("../config/redis");
const registerSchema = require("../config/zod");
const TryCatch = require("../middlewares/tryCatch");
const { sanitize } = require("mongo-sanitize");
const userModel = require("../models/User.model");
const { getVerifyEmailHtml } = require("../config/html");

const registerUser = TryCatch(async (req, res) => {
  const sanitizeBody = sanitize(req.body);
  const validation = registerSchema.safeParse(sanitizeBody);

  if (!validation.success) {
    const zodError = validation.error;

    let fristErrorMessage = "Validation Eror";
    let allError = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allError = zodError.issues.map((issues) => {
        field: issues.path ? issues.path.join(".") : "Validation Error";
        message: issues.message || "Validation Error";
        code: issues.code || "validation Error";
      });

      fristErrorMessage = allError[0]?.message || "Validation Error";
    }

    return res.status(400).json({
      message: firstErrorMessage,
      errors: allError,
    });
  }

  try {
      const {name, email, password} = validation.data

      const rateLimte = `register-rate-limit:${req,ip},:${email}`

      if(await redisClient.get(rateLimte)){
        return res.status(429).json({message: "Too many request, please try agian later"})
      }

      const exitingUser = await userModel.findOne({email})

      if(exitingUser){
        return res.status(429).json({message: "User already exit"})
      }

      const hashPassword = await becryt.hash(password, 10)
      const verifyToken = await crypto.randomBytes(32).toString("hex")
      const verifyKey = `verifyKey:${verifyToken}`
      const dataToStore = JSON.stringify({email, name, password: hashPassword})

      await redisClient.set(verifyKey, dataToStore, {EX:300})

      const subject = "verify your account"
      const html = getVerifyEmailHtml({email, token: verifyToken})
      await sendEmail({to: email, subject, html})

      await redisClient.set(rateLimte, "true", {EX: 60})

      return res.status(200).json({message: "Verification email sent, please check your inbox"})

  } catch (error) {
      console.error("Error in registerUser controller:", error);
      return res.status(500).json({message: "Internal Server Error"}) 
  }
});

