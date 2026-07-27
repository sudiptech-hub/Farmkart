const transporter = require("../config/nodemailer");

exports.sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Farm Market OTP Verification",
    html: `
      <h2>Farm Market</h2>

      <p>Your OTP is</p>

      <h1>${otp}</h1>

      <p>This OTP expires in 5 minutes.</p>
    `,
  });
};
