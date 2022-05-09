const nodemailer = require("nodemailer");
const config = process.env;

const mailHost = "smtp.gmail.com";
const mailPort = 465;

const adminEmail = config.USERNAME_EMAIL;
const adminPassword = config.PASSWORD_EMAIL;

const sendEmail = (to, subject, htmlContent) => {
  const transporter = nodemailer.createTransport({
    host: mailHost,
    port: mailPort,
    secure: true, // nếu các bạn dùng port 465 (smtps) thì để true, còn lại hãy để false cho tất cả các port khác
    auth: {
      user: adminEmail,
      pass: adminPassword,
    },
  });

  const options = {
    from: adminEmail, // địa chỉ admin email bạn dùng để gửi
    to: to, // địa chỉ gửi đến
    subject: subject, // Tiêu đề của mail
    html: htmlContent, // Phần nội dung mail mình sẽ dùng html thay vì thuần văn bản thông thường.
  };

  return transporter.sendMail(options);
};

module.exports = {
  sendEmail: sendEmail,
};
