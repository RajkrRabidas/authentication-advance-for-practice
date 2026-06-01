const redisClient = require("../config/redis");
const registerSchema = require("../config/zod");
const TryCatch = require("../middlewares/tryCatch");
const { sanitize } = require("mongo-sanitize");
const UserModel = require("../models/User.model");

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

    const ratelimitKey = await `register-rate-limit${req.ip}:${email}`;
    if (await redisClient.get(ratelimitKey)) {
      return res
        .status(429)
        .json({ message: "Too many request, try agian later" });
    }

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyKey = `verify-token:${verifyToken}`;

    const dataToStore = Json.stringify({
      name,
      email,
      password: hashedPassword,
    });

    await redisClient.set(verifyKey, dataToStore, { EX: 300 });

    const subject = "Verify your email";
    const html = getVerifyEmailHtml({ email, token: verifyToken });
    await sendMail({ email, subject, html });

    await redisClient.set(ratelimitKey, "true", { EX: 60 }); // 1 min rate limit

    res.status(200).json({
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {}
});
