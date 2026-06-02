const redisClient = require("../config/redis");
const registerSchema = require("../config/zod");
const TryCatch = require("../middlewares/tryCatch");
const { sanitize } = require("mongo-sanitize");
const userModel = require("../models/User.model");

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


  } catch (error) {
    
  }WS
});
