export default function generatePasswordResetEmailHTML(
	codeURL: string
): string {
	return `
    <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="ie=edge">
            <title>CommuteAnalyzer Email</title>
            <style>
            * {
                margin: 0;
                padding: 0;
                font-size: 16px;
                color: #000;
                font-family: Helvetica, Arial, sans-serif;
            }
            .mt-1 {
                margin-top: 4px;
            }
            .mt-2 {
                margin-top: 8px;
            }
            .mt-4 {
                margin-top: 16px;
            }
            .mt-6 {
                margin-top: 24px;
            }
            .mt-8 {
                margin-top: 32px;
            }
            .mb-1 {
                margin-bottom: 4px;
            }
            .mb-2 {
                margin-bottom: 8px;
            }
            .mb-4 {
                margin-bottom: 16px;
            }
            .mb-6 {
                margin-bottom: 24px;
            }
            .mb-8 {
                margin-bottom: 32px;
            }
            .ml-1 {
                margin-left: 4px;
            }
            .ml-2 {
                margin-left: 8px;
            }
            .ml-4 {
                margin-left: 16px;
            }
            .ml-6 {
                margin-left: 24px;
            }
            .ml-8 {
                margin-left: 32px;
            }
            .mr-1 {
                margin-right: 4px;
            }
            .mr-2 {
                margin-right: 8px;
            }
            .mr-4 {
                margin-right: 16px;
            }
            .mr-6 {
                margin-right: 24px;
            }
            .mr-8 {
                margin-right: 32px;
            }
            .pb-1 {
                padding-bottom: 4px;
            }
            .pb-2 {
                padding-bottom: 8px;
            }
            .pb-4 {
                padding-bottom: 16px;
            }
            .pb-6 {
                padding-bottom: 24px;
            }
            .pb-8 {
                padding-bottom: 32px;
            }
            .pt-1 {
                padding-top: 4px;
            }
            .pt-2 {
                padding-top: 8px;
            }
            .pt-4 {
                padding-top: 16px;
            }
            .pt-6 {
                padding-top: 24px;
            }
            .pt-8 {
                padding-top: 32px;
            }
            .pl-1 {
                padding-left: 4px;
            }
            .pl-2 {
                padding-left: 8px;
            }
            .pl-4 {
                padding-left: 16px;
            }
            .pl-6 {
                padding-left: 24px;
            }
            .pl-8 {
                padding-left: 32px;
            }
            .pr-1 {
                padding-right: 4px;
            }
            .pr-2 {
                padding-right: 8px;
            }
            .pr-4 {
                padding-right: 16px;
            }
            .pr-6 {
                padding-right: 24px;
            }
            .pr-8 {
                padding-right: 32px;
            }
            .fw-bold {
                font-weight: bold;
            }
            .fw-600 {
                font-weight: 600;
            }
            .inline-block {
                display: inline-block;
            }
            .block {
                display: block;
            }
            .right-0 {
                position: absolute;
                right: 0;
            }
            p {
                font-size: 18px;
                line-height: 28px;
            }
            .wrapper {
                width: 472px;
                text-align: left;
                padding: 45px 64px 32px 64px;
                border-bottom: 1px solid #C1CFCA;
            }
            .wrapper.lineless {
                border: 0;
                padding-top: 16px;
                position: relative;
            }
            .header {
                font-size: 24px;
            }
            .title {
                font-size: 18px;
                line-height: 27px;
            }
            .info-wrapper {
                border-left: 2px solid #188D77;
            }
            .info-wrapper .subtitle {
                font-size: 18px;
                line-height: 28px;
            }
            a.button {
                padding: 15px 48px;
                border: 0;
                border-radius: 50px;
                background: #0967D2;
                color: #FFF;
            }
            a.button.primary {
                background: #188D77;
            }
            a.button.danger {
                background: #E30613;
            }
            a {
                font-size: inherit;
                line-height: 24px;
                color: #188D77;
                text-decoration: none;
            }
            .fine-print,
            .fine-print a {
                font-size: 14px;
            }
            .pre-line {
                white-space: pre-line;
            }
            </style>
        </head>
        <body>
            <div class="wrapper">
            <h1 class="header pt-2 pb-8">
                Reset Your Password
            </h1>
            <p class="pb-2">
                You're receiving this because someone is attempting to reset the password
                associated with this email on CommuteAnalyzer.
            </p>
            <p class="pb-4">
                If it was you, click <a href=${codeURL}>here</a> to reset your password, otherwise ignore it. This link is only good for 1 hour.
            </p>
            <p class="pt-2 pb-6">
                If you have any questions, reach out to us at CommuteAnalyzerTeam@gmail.com.
            </p>
            <p class="small fw-bold mt-2 mb-4">
                Team Commute Analyzer
            </p>
            <div class="social-media">
                <a href="" class="mr-4">
                <img width="16" height="16" src="https://superpeer.dev/emails/twitter.png" />
                </a>
                <a href="">
                <img width="16" height="16" src="https://superpeer.dev/emails/instagram.png" />
                </a>
            </div>
            </div>
            <div class="wrapper lineless">
            <p class="fine-print pb-8">
                Have questions or need help? Check out our
                <a href="">FAQs</a>,
                or email us at
                <a href="mailto:CommuteAnalyzerTeam@gmail.com">
                CommuteAnalyzerTeam@gmail.com
                </a>
            </p>
            <p class="fine-print inline-block">
                <a href="">Terms of Service</a>
                and
                <a href="">Privacy Policy</a>
            </p>
            <p class="fine-print inline-block right-0 pr-8 mr-8">
                CommuteAnalyzer 2020
            </p>
            </div>
        </body>
    </html>
`;
}
