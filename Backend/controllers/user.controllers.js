const redisClient = require("../config/redis");
const { registerSchema, loginSchema } = require("../config/zod");
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
  const validation = loginSchema.safeParse(sanitizeBody);

  if (!validation.success) {
    const zodError = validation.error;
    let fristErrorMessage = "Validation failed";
    let allError = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allError = zodError.issues.map((issues) => ({
        field: issue.path ? issue.path.join(".") : "unknown",
        message: issue.message || "validation error",
        code: issue.code || "validation_error",
      }));

      firstErrorMessage = allError[0]?.message || "Validation Failed";
    }
    return res.status(400).json({
      message: firstErrorMessage,
      errors: allError,
    });
  }
  try {
    const { email, password } = validation.data;

    const rateLimitKey = `login-rate-limit:${req.ip}, :${email}`;

    if (await redisClient.get(rateLimitKey)) {
      return res
        .status(429)
        .json({ message: "Too many requests. Please try again later." });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpKey = `otp:${email}`;

    await redisClient.set(otpKey, JSON.stringify({ otp }), { EX: 300 });

    const subject = "Your OTP Code";
    const html = getOtpHtml({ email, otp });

    await sendEmail({ email, subject, html });

    await redisClient.set(ratelimitKey, "ture", { EX: 60 }); // 1 min rate limit

    res
      .status(200)
      .json({ message: "Otp sent to your email, it is valid for 5 min" });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
