const registerSchema = require("../config/zod");
const TryCatch = require("../middlewares/tryCatch");
const {sanitize} = require("mongo-sanitize")

const registerUser = TryCatch(async (req, res) => {
    const sanitizeBody = sanitize(req.body)

    const validation = registerSchema.safeParse(sanitizeBody)

    if(!validation.success) {
        const zodError = validation.error
        let fristErrorMessage = "validation Failed"
        let allError = []

        if(allError?.issus && Array.isArray(zodError.issues)){
            allError = zodError.issues.map((issues) => (
                {
                    field: issues.path ? issues.path.join(".") : "Unknow Error",
                    message: issues.message || "Validation error",
                    code: issues.code || "validation_error"
                }
            ))
            fristErrorMessage = allError[0]?.message || fristErrorMessage

            return res.status(400).json({
                success: false,
                message: fristErrorMessage,
                errors: allError
            })
        }
    }

    
})