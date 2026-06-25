const redisClient = require("../config/redis");
const { registerSchema, loginSchema } = require("../config/zod");
const TryCatch = require("../middlewares/tryCatch");
const { sanitize } = require("mongo-sanitize");
const userModel = require("../models/User.model");
const { getVerifyEmailHtml } = require("../config/html");
const { tr } = require("zod/v4/locales");

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
    const { name, email, password } = validation.data;

    const rateLimte = `register-rate-limit:${(req, ip)},:${email}`;

    if (await redisClient.get(rateLimte)) {
      return res
        .status(429)
        .json({ message: "Too many request, please try agian later" });
    }

    const exitingUser = await userModel.findOne({ email });

    if (exitingUser) {
      return res.status(429).json({ message: "User already exit" });
    }

    const hashPassword = await becryt.hash(password, 10);
    const verifyToken = await crypto.randomBytes(32).toString("hex");
    const verifyKey = `verifyKey:${verifyToken}`;
    const dataToStore = JSON.stringify({ email, name, password: hashPassword });
    await redisClient.set(verifyKey, dataToStore, { EX: 300 });

    const subject = "verify your account";
    const html = getVerifyEmailHtml({ email, token: verifyToken });
    await sendEmail({ to: email, subject, html });

    await redisClient.set(rateLimte, "true", { EX: 60 });

    return res
      .status(200)
      .json({ message: "Verification email sent, please check your inbox" });
  } catch (error) {
    console.error("Error in registerUser controller:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

const verifyUser = TryCatch(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ message: "token is requeded" });
  }

  const verifyKey = `verify-token:${token}`;

  const userDataJson = await redisClient.get(verifyKey);

  if (!userDataJson) {
    return res.status(400).json({ message: "Invaild data" });
  }

  await redisClient.del(verifyKey);

  const userData = JSON.parse(userDataJson);

  const existingUser = await userModel.findOne({ email: userData.email });

  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const newUser = await userModel.create({
    name: userData.name,
    email: userData.email,
    password: userData.password,
  });

  res
    .status(200)
    .json({ message: "Email verified successfully", user: newUser });
});

const loginUser = TryCatch(async (req, res) => {
  const sanitizeBody = sanitize(req.body);
  const validation = loginSchema(sanitizeBody);

  if (!validation.data) {
    const zodError = validation.error;
    let fristErrorMessagge = "Validation failed";
    let allError = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allError = zodError.issues.map((issue) => {
        field: issue.path() ? issue.path().join(".") : "validation error";
        message: issue.message || "validation failed";
        code: issue.code || "validation Error";
      });
      fristErrorMessagge = allError[0]?.message || "validation failed";
    }
    return res.status(400).json({
      message: firstErrorMessage,
      errors: allError,
    });
  }

  try {
    const { name, email, password } = validation.data;

    const ratelimit = `ligin-ratelimit-key:${req.ip},:${email}`;

    if (await redisClient.get(ratelimit)) {
      return res
        .status(429)
        .json({ message: "Too many request, please try agin later" });
    }

    let user = await userModel.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "user already exist" });
    }

    const comparePassword = await becryt.compare(password, user.password);

    if (!comparePassword) {
      return res.status.json({ message: "Invalid credentials" });
    }

    const otp = Math.floor(10000 + Math.random() * 900000).toString();

    const otpKey = `otpkey:${email}`;

    await redisClient.set(otpKey, JSON.stringify(otp));

    const subject = "Your OTP Code";
    const html = getOtpEmailHtml({ name: user.name, otp });
    await sendEmail({ to: email, subject, html });

    await redisClient.set(ratelimit, "true", { EX: 300 });

    res
      .status(200)
      .json({ message: "Otp sent to your email, please check your inbox" });
  } catch (error) {
    console.error("Error in loginUser controller:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

const verifyOtp = TryCatch(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "please provide all details" });
  }

  const otpKey = `otpKey:${email}`;

  const storeOtpString = await redisClient.get(otpKey);

  if (!storeOtpString) {
    return res.status(400).json({ message: "Otp Expied" });
  }

  const storeOtp = JSON.parse(storeOtp);

  if (storeOtp !== otp) {
    return res.status(400).json({ message: "invalid Otp" });
  }

  await redisClient.del(otpKey);

  let user = await userModel.findOne({ email });

  await generateToken(user.id, res);

  res.status(200).json({ message: `welcome ${user.name}`, user });
});

const myProfile = TryCatch( (req, res) => {
  const user = req.user
  res.json(user)
})

const refeashToken = TryCatch( async (req, res) => {
  try {
      const refreashToken = req.cookie?.refreash_token

  if(!refreashToken){
    return res.status(403).json({message:"Please login - no token provided"})
  }
  const decode = await VerifyRefreshToken(refreashToken)

  if(!decode){
    return res.status(403).json({message: "Invalid refresh token"})
  }

  await generateNewAccessToken(decode.id,res)

  res.status(200).json({message: "Access token refreshed", user: req.user})
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
})


module.exports = {
  registerUser,
  verifyUser,
  loginUser,
  verifyOtp
};