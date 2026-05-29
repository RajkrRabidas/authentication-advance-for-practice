const registerSchema = require("../config/zod");
const TryCatch = require("../middlewares/tryCatch");
const sanitize = require('mongo-sanitize');
const redisClient = require("../config/redis");
const UserModel = require("../models/User.model");
const becrypt = require("bcrypt");
const crypto = require("crypto");
// const sendEmail = require("../utils/sendEmail");
const { getVerifyEmailHtml } = require("../config/html");
const sendmail = require("../config/sendMail");

// validation, hashing password, verify token, saving to database, sending email, rate limiting
const registerUser = TryCatch(async (req, res) => {

    // ** zod validation starts here
    // ** Sanitize the input to prevent NoSQL injection
    const sanitizedBody = sanitize(req.body)

    //? Validate the sanitized input against the Zod schema
    const validation = registerSchema.safeParse(sanitizedBody)

    //! If validation fails, return a 400 Bad Request response with error details
    if (!validation.success) {

        let zodError = validation.error

        let firstErrorMessage = "Validation failed"
        let allError = []

        if(zodError?.issues && Array.isArray(zodError.issues)) {
            allError = zodError.issues.map((issue)=>({
                field : issue.path ? issue.path.join("."):"Validation error",
                message : issue.message || "Validation error",
                code : issue.code
            }))

            firstErrorMessage = allError[0]?.message || firstErrorMessage
        }

        return res.status(400).json({
            message: firstErrorMessage,
            error: allError
        })
    }

    // ** zod validation ends here, you can proceed with further processing (e.g., saving to database)
    const { name, email, password } = validation.data

    //! rate limiting start here

    const rateLimiteKey = `register-rate-limit:${req.ip} : ${email}`

    if(await redisClient.get(rateLimiteKey)){
        return res.status(429).json({message: "Too many reqests, try again later"})
    }
    //! rate limit end here

    //** finding the user and hashing password and verify token
    const existingUser = await UserModel.findOne({email})

    if(existingUser){
        return res.status(400).json({message: "User already exists"})
    }

    // hashing password
    const hashPassaword = await becrypt.hash(password, 10)

    // verify token
    const verifyToken = crypto.randomBytes(32).toString("hex") 

    const verifyKey = `verify-token:${verifyToken}` 

    // save user to database
    const datatostore = {
        email,
        name,
        password: hashPassaword,
        verifyToken
    }

    await redisClient.set(verifyKey, JSON.stringify(datatostore), {EX: 300}) // 5 min expire time

    const subject = "Verify your email"
    const html = getVerifyEmailHtml({ email, token: verifyToken })

    await sendmail(email, subject, html)

    await redisClient.set(rateLimiteKey, "1", {EX: 60}) // 1 min expire time for rate limiting
    
    res.json({
        message: "Registration successful, please check your email to verify your account"
    })
})

// verify user sent email with token

const verifyUser = TryCatch( async (req, res) => {
    const { token } = req.params

    if(!token) {
        return res.status(400).json({message: "Token is required"})
    }

    const verifyKey = `verify-token:${token}`

    const userDataJson = await redisClient.get(verifyKey)

    if(!userDataJson) {
        return res.status(400).json({message: "Verification link is invalid or token expired"})
    }

    await redisClient.del(verifyKey)

    const userData = JSON.parse(userDataJson)

    const existingUser = await UserModel.findOne({email:userData.email})

    if(existingUser){
        return res.status(400).json({message: "User already exists"})
    }

    const newUser = await UserModel.create({
        name: userData.name,
        email: userData.email,
        password: userData.password
    })

    res.json({message: "Email verified successfully, your account has been created",
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email
    })

})

module.exports = {registerUser, verifyUser}