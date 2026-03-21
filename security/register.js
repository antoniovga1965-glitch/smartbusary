const express = require("express");
const router = express.Router();
const limit = require("express-rate-limit");
const cookieparser = require("cookie-parser");
const z = require("zod");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma.client");
const bcrypt = require('bcrypt');
const winston = require('../security/winston');


const registerschemas = z.object({
  REGISTERNAME: z.string().min(2, "Full names required"),
  REGISTERADMISSION: z.string().regex(/^\d{1,5}$/, "Admission is required"),
  REGISTERSCHOOL: z.string().min(2, "Enter your correct school name"),
  REGISTERCOUNTY: z.string().min(1, "Enter your county name"),
  REGISTERPASSWORD: z
    .string()
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@!#$%^&*]{8,}$/,
      "Password must contain one letter one digit and special characters",
    ),
  EMAILREGISTER: z.string().email("Your  is email required"),
});

const verifysecondaryschemas = (req, res, next) => {
  const parsedschemas = registerschemas.safeParse(req.body);
  if (!parsedschemas.success) {
    return res.status(422).json({
      message:
        "Check your fields and try again ensure all fields recieve correct credentials",
    });
  }
  next();
};

const registerlimitor = limit({
  windowMs: 1000 * 60 * 1000,
  max: 1000,
  message: { message: "Too many login attempts try again later" },
  trustProxy: true,
});

router.post(
  "/registerroute",
  verifysecondaryschemas,
  registerlimitor,
  async (req, res) => {
    const {
      REGISTERNAME,
      REGISTERCOUNTY,
      REGISTERSCHOOL,
      REGISTERADMISSION,
      REGISTERPASSWORD,
      EMAILREGISTER,
    } = req.body;

    if (
      !REGISTERNAME ||
      !REGISTERCOUNTY ||
      !REGISTERSCHOOL ||
      !REGISTERADMISSION ||
      !REGISTERPASSWORD ||
      !EMAILREGISTER
    ) {
      winston.info(`${REGISTERNAME} from ${REGISTERSCHOOL} tried loggin in on empty fields`);
      return res.status(422).json({
        message: "Please fill in the required fields before registering",
        
      });
    }

    try {
      const Existing = await prisma.registerd_users.findUnique({
        where: { registeradmission: REGISTERADMISSION },
      });

      if (Existing) {
        winston.info(`${REGISTERNAME} tried to register while he existed`);
        return res.status(409).json({ message: "user already exist" });
      }

      const hashedpassword = await bcrypt.hash(REGISTERPASSWORD,12);


      const registeredApplicant = await prisma.registerd_users.create({
        data: {
          registername: REGISTERNAME,
          registeradmission: REGISTERADMISSION,
          registerschool: REGISTERSCHOOL,
          registercounty: REGISTERCOUNTY,
          registerpassword: hashedpassword,
          email: EMAILREGISTER,
        },
      });

      const token = jwt.sign(
        { id:registeredApplicant.id, role:'student', user: REGISTERNAME },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: 60 * 1000 * 1000,
      });

      winston.info(`${REGISTERNAME} from ${REGISTERCOUNTY} registered succesfully in smart bursary app`)
      return res
        .status(200)
        .json({
          message: `Dear ${REGISTERNAME} your have created an account with Smart bursaries,Proceed to apply`,
        });
    } catch (error) {
        console.error(error);
        winston.error(error);
      return res
        .status(500)
        .json({
          message:
            "Failed to create account check your credentials and try again",
        });
    }
  },
);

module.exports = router;
