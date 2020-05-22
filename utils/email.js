const jwt = require("jsonwebtoken");

require("dotenv").config();

const {
	EMAIL_CONFIRMATION_JWT_SECRET_KEY,
	PASSWORD_RESET_JWT_SECRET_KEY
} = process.env;

const sendConfirmationEmail = (user, transporter) => {
	return new Promise((resolve, reject) => {
		const confirmationCode = jwt.sign(
			{ user_id: user._id },
			EMAIL_CONFIRMATION_JWT_SECRET_KEY,
			{ expiresIn: 60 * 60 }
		);

		const mailOptions = {
			to: user.email,
			subject: "IFHelper Email Confirmation",
			html: `
                <p>Welcome to IFHelper ${user.first_name}!</p>
                <br />
                <p>
                    Click 
                        <a href="/confirm-email?code=${confirmationCode}">
                         here
                        </a>
                    to confirm your email.
                </p> 
                <br/ >
                <p>This code will only last for 1 hour so be quick!</p>
            `
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				reject(error);
			} else {
				resolve(info);
			}
		});
	});
};

const sendPasswordResetEmail = (user, transporter) => {
	return new Promise((resolve, reject) => {
		const confirmationCode = jwt.sign(
			{ user_id: user._id },
			PASSWORD_RESET_JWT_SECRET_KEY,
			{ expiresIn: 60 * 60 }
		);

		const mailOptions = {
			to: user.email,
			subject: "IFHelper Password Reset",
			html: `
                <p>Welcome to IFHelper ${user.first_name}!</p>
                <br />
                <p>
                    Click 
                        <a href="/confirm-email?code=${confirmationCode}">
                         here
                        </a>
                    to reset your password.
                </p> 
                <br/ >
                <p>This code will only last for 1 hour so be quick!</p>
            `
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				reject(error);
			} else {
				resolve(info);
			}
		});
	});
};

module.exports = { sendConfirmationEmail, sendPasswordResetEmail };
