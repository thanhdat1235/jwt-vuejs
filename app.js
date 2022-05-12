require("dotenv").config();
require("./config/database").connect();
const bcryptjs = require("bcryptjs");
const bodyParser = require("body-parser");
const express = require("express");
const User = require("./model/user");
const auth = require("./middleware/auth");
const cors = require("cors");
const { authManagerRole, authAdminRole } = require("./middleware/authenRoles");
const crypto = require("crypto");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");
const { sendEmail } = require("./utils/emailUtils");
const {
  redisClient,
  generateToken,
  destroyToken,
} = require("./middleware/jwt");

const app = express();
const corsOptions = {
  origin: "*",
  exposedHeaders: "Authorization",
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(express.json());

app.post("/register", async (req, res) => {
  try {
    // Get user input
    const { first_name, last_name, email, password, gender, address, role } =
      req.body;

    // Validate user input
    if (!email || !password || !first_name || !last_name || role) {
      return res.status(400).send("All input is required");
    }

    // Validate if user exist in our database
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).send({ messages: "Email already exists" });
    }

    encryptedPassword = await bcryptjs.hash(password, 10);

    const user = await User.create({
      first_name,
      last_name,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
      created_at: new Date(),
      gender,
      address,
      otp_code: null,
      role: "user",
    });

    res.status(201).json(user);
  } catch (err) {
    throw err;
  }
});

app.post("/login", async (req, res) => {
  try {
    // Get user input
    const { email, password } = req.body;
    // Validate user input
    if (!(email && password)) {
      return res.status(400).send("All input is required");
    }
    // Validate if user exist in our database
    const user = await User.findOne({ email });

    if (user && (await bcryptjs.compare(password, user.password))) {
      // Create token
      const token = await generateToken(user._id.toString(), email, user.role);

      // user
      return res.status(200).setHeader("Authorization", token).json(user);
    }

    return res.status(400).json({
      message: "Invalid Credentials",
    });
  } catch (err) {
    throw err;
  }
});

app.get("/users/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;

    const user = await User.findById(id, { password: 0, otp_code: 0 }).exec();

    return res.status(200).json(user);
  } catch (error) {
    throw error;
  }
});

app.get("/users", auth, async (req, res) => {
  const users = await User.find({}, { password: 0 });
  return res.status(200).json(users);
});

app.put("/users/:id", auth, authManagerRole, async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findByIdAndUpdate(id, req.body, { new: true });
    return res.json(user);
  } catch (error) {
    throw error;
  }
});

app.delete("/users/:id", auth, authAdminRole, async (req, res) => {
  try {
    const id = req.params.id;
    await User.findByIdAndDelete(id, { new: true });
    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    throw error;
  }
});

app.patch("/users/:id", auth, authAdminRole, async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findByIdAndUpdate(id, req.body, { new: true });
    return res.status(200).json(user);
  } catch (error) {
    throw error;
  }
});

/**
 * 1. get email tu request -> findOne User by email -> co: thi gui email
 *                                                  -> khong thi nem loi
 * Tao ra 1 otp_code -> luu vao db -> gui cho email vs url kem otp
 * * Gui email
 *
 *
 * ------------- Kiem tra token khi ng dung click vao link tren email ----------------------------------------------------
 *
 * 1. get token tu params
 * 2. Kiem tra thong tin token co hop le hay ko va co trong db
 * 3. Neu dung -> redirect to trang doi mat khaur
 * 4. Sai -> thong bao loi
 *
 *
 */
let randomFixedInteger = function (length) {
  return Math.floor(
    Math.pow(10, length - 1) +
    Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1)
  );
};

// try {
//   const user = await User.findOneAndUpdate(
//     { email: req.body.email },
//     { otp_code: "1234" },
//     { upsert: true }
//   );
//   console.log(user);
// } catch (error) {
//   console.log(error);
// }

// try {
//   User.findOne({ email: req.body.email }, async (err, user) => {
//     if (!user) {
//       return res
//         .status(409)
//         .send({ message: "User with email does not already exists" });
//     }
//     const otp_code = randomFixedInteger(6);
//     const resUpdateUser = User.findOneAndUpdate(
//       { email: req.body.email },
//       { otp_code: otp_code }
//     );

//     sendEmail(
//       user.email,
//       "Mã xác thực OTP",
//       `<p>Ma OTP cua ban la: ${otp_code}</p>`
//     ).then((response) => {
//       res.status(200).send({ message: "OTP sended to your email account" });
//     });
//   });
// } catch (error) {
//   res.status(500).send({ message: "Internal Server Error" });
// }

app.put("/forgotpassword", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user)
    return res
      .status(404)
      .send({ message: "User with email does not already exists" });

  const otp_code = randomFixedInteger(6);

  const updateUser = await User.findOneAndUpdate(
    { email },
    { otp_code: otp_code },
    { upsert: true }
  );

  if (!updateUser) {
    return res.status(404).send({ message: "Update OTP failed" });
  }

  const subject = "Mã xác thực OTP";
  const htmlContent = `<p>Ma OTP cua ban la: ${otp_code}</p>`;
  const resSendEmail = await sendEmail(email, subject, htmlContent);

  if (!resSendEmail)
    return res.status(500).send({ message: "Send OTP failed" });

  return res.status(200).send({ message: "OTP sended to your email account" });
});

// Verify OTP

app.post("/verify-otp/:email", async (req, res) => {
  const email = req.params.email;
  const { OTP } = req.body;
  const user = await User.findOne({ email });
  if (!user)
    return res
      .status(404)
      .send({ message: "User with email does not already exists" });
  if (OTP !== user.otp_code) {
    return res.status(400).send({ message: "Invalid OTP" });
  }
  return res.status(200).send({ message: "Verify OTP successfully" });
});

// Reset password
app.post("/reset-password/:email", async (req, res) => {
  const email = req.params.email;
  const { password } = req.body;
  encryptedPassword = await bcryptjs.hash(password, 10);
  try {
    const user = await User.findOneAndUpdate(
      { email },
      { password: encryptedPassword },
      { upsert: true }
    );
    res.status(200).send({ message: "Password updated successfully" });
  } catch (error) {
    console.log(error);
  }
});

// Logout
app.post("/logout", auth, async (req, res) => {
  try {
    const token = req.headers["authorization"];
    await destroyToken(token);

    return res.status(204).send({ message: "Logout successfully" });
  } catch (error) {
    console.log(error);
  }
});

module.exports = app;
