const registerSchema = require("../config/zod");
const TryCatch = require("../middlewares/tryCatch");
const sanitize = require('mongo-sanitize');

const registerUser = TryCatch(async (req, res) => {
    const sanitizedBody = sanitize(req.body)

    const validate = registerSchema.safeParse(sanitizedBody)

    if (!validate.success) {
        return res.status(400).json({
            message: "Zod validation error",
            error: validate.error
        })
    }

    const { name, email, password } = validate.data

    res.json({
        name,
        email,
        password
    })
})

module.exports = {registerUser}