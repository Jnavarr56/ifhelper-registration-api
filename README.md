# Registration Service API

---

### Intro

This is a microservice API that I created as part of a larger implmentation of a microservices application structure using Node.js (Typescript). Its meant to exist alongside the other services in this implementation, which is orchestrated using Docker-Compose and is contained in a submodules repo.

---

### Made With/Relies On

- <a href="https://nodejs.org/en/"><img src="https://github.com/nodejs/nodejs.org/blob/master/static/images/logos/nodejs.png?raw=true" alt="Node.js" height=50/></a>
- <a href="https://www.typescriptlang.org/"><img src="https://github.com/remojansen/logo.ts/raw/master/ts.png" height=50/></a>
- <a href="https://expressjs.com/"><img alt="Express.js" src="https://expressjs.com/images/express-facebook-share.png" height=50/></a>
- <a href="http://jwt.io/"><img src="http://jwt.io/img/logo-asset.svg" alt="JSON Web Tokens" height=50/></a>
- <a href="https://nodemailer.com"><img height=50 src="https://nodemailer.com/nm_logo_200x136.png" alt="nodemailer"/></a>
- <a href="https://www.docker.com"><img height=50 src="https://www.docker.com/sites/default/files/d8/styles/role_icon/public/2019-07/vertical-logo-monochromatic.png?itok=erja9lKc" alt="Docker"/></a>
- <a href="hhttps://redis.io/"><img height=50 src="https://upload.wikimedia.org/wikipedia/en/thumb/6/6b/Redis_Logo.svg/1200px-Redis_Logo.svg.png" alt="Redis"/></a>
- <a href="https://www.rabbitmq.com/"><img height=25 src="https://www.rabbitmq.com/img/RabbitMQ-logo.svg" alt="RabbitMQ"/></a>

---

### Scope/Functionality

1. Signing up new users.
2. Sending confirmation emails to newly signed up users.
3. Confirming newly signed up user emails.
4. Sending password update emails to existing users.
5. Updating user passwords.
6. Sending email update emails to existing users.
7. Updating user emails.

---

### Services Communicated With/Protocols

1. **AMPQ**

   - Requests system access tokens from a token processing microservice on the same network via an AMPQ message broker (**RabbitMQ**) in order to access the users resource microservice.

2. **REDIS**:

   - Uses a **Redis** servier on the same network as a cache to store JWT verification results and to verify frequency of email requests in 5 minute period.

3. **HTTP**:
   - Sends requests to the users resource microservice to create and update users.
   - For the one route requiring authentication via an access token (/send-update-email-confirmation) forward the credentials to the token processign microservice.

---

### Required Environment Variables

1. **EMAIL_CONFIRMATION_JWT_SECRET_KEY**
   - For signing and verifiying the JWT that is used as an email confirmation code sent in an email.
2. **PASSWORD_RESET_JWT_SECRET_KEY**
   - For signing and verifiying the JWT that is used as a password reset code sent in an email.
3. **REGISTRATION_REDIS_DB_PASSWORD**
   - To gain access to a secured redis network on the same network.
4. **GMAIL_ADDRESS** and **GMAIL_PASSWORD**
   - For the Gmail account that the application will be using to send emails to users.
   - This account must have access to "less secure apps" turned on.

---

### Error Responses

All error responses (4xx, 5xx) come in the format of a JSON object containing an `error_code` which may be a string describing the error and possibly an `error` property which may be an object or string containing further information on the error.

Example:

```
{
    error_code: Invalid Parameters
    error: {
    	invalid_parameters: {
            first_name: "must be string",
            last_name: "must be string"
        }
    }
}
```

---

### Routes

All are prefixed with the value of the PATHNAME variable in the vars.ts file. It currently looks like this.
`export const PATHNAME = "/api/registration"`

##### POST /sign-up

- **Requires Access Token**: \* No
- **Behavior**:
  - Creates a user account and triggers sending a confirmation email.
- **Required Params**:
  - _first_name_: string
  - _last_name_: string
  - _password_: string
  - _email_: string
- **Responses**:
  - 200
    - user sign up successful and email confirmation sent.
  - 400:
    - ```
        {
            error_code: "User with email already exists"
        }
      ```
    - ```
       {
           error_code: "Invalid paramaters",
           error: {
              invalid_parameters: {
                      first_name: "must be string",
                      last_name: "must be string"
                      ...etc
              }
           }
       }
      ```

##### POST /resend-confirmation-email

- **Behavior**:
  - Resends a confirmation email. Limited to once every 5 minutes.
- **Required Params**:
  - _email_: string
- **Responses**:
  - 200
    - confirmation email resent to supplied email.
  - 429:
    - happens when the same user requests an email more than once in a 5 minute period.
      - ```
         	{
                error_code: "Last sent at DATE_STRING"
         	}
        ```
  - 404:
    - no user found with the supplied email.
  - 409:
    - user's email has already been confirmed.

##### POST /confirm-email

- **Requires Access Token**: NO
- **Behavior**:
  - Confirms user email.
- **Required Params**:
  - _code_: string
- **Responses**:
  - 200:
    - user email confirmed.
      - ```
          {
              first_name: USER_FIRST_NAME
          }
        ```
  - 404:
    - code is invalid or user does not exist anymore.
  - 410:
    - code has expired or has already been used.

##### POST /send-password-reset-email

- **Requires Access Token**: NO
- **Behavior**:
  - Sends password reset email.
- **Required Params**:
  - _email_: string
- **Responses**:
  - 200
    - password reset email successfully sent.
  - 400:
    - missing email parameter.
      - ```
          {
              error_code: "Missing required parameters",
              error: {
                  missing_parameters: ["email", ...etc]
              }
          }
        ```
  - 404
    - no user with supplied email exists.
  - 429
    - happens when the same user requests an email more than once in a 5 minute period.
      - ```
         	{
                error_code: "Last sent at DATE_STRING"
         	}
        ```

##### GET /test-password-reset-code

- **Requires Access Token**: NO
- **Behavior**:
  - Tests if a password reset code is valid.
- **Required Params**:
  - _code_: string
- **Responses**:
  - 200
    - code is valid.
  - 404:
    - code is invalid or user does not exist anymore.
  - 410:
    - code expired or used already.

##### POST /reset-password

- **Requires Access Token**: NO
- **Behavior**:
  - Changes a users password.
- **Required Params**:
  - _code_: string
  - _password_: string (this is the new password)
- **Responses**:
  - 200
    - code is valid.
  - 400:
    - missing any of required parameters.
      - ```
          {
              error_code: "Missing required parameters",
              error: {
                  missing_parameters: ["code", ...etc]
              }
          }
        ```
  - 404:
    - code is invalid or user does not exist anymore.
  - 410:
    - code expired or used already.

##### POST /send-update-email-confirmation

- **Requires Access Token**: YES
- **Behavior**:
  - Sends an email with a code that will update a users email when posted to /update-email.
- **Required Params**:
  - new_email: string
- **Responses**:

  - 200
    - code generated and email sent.
  - 400:

    - missing any of required parameters.

      - ```
          {
              error_code: "Missing required parameters",
              error: {
                  missing_parameters: ["new_email", ...etc]
              }
          }
        ```

  - 409:

    - either:

      - ```
          {
              error_code: "New email same as current email"
          }
        ```
      - ```
         {
             error_code: "New email unavailable"

         }
        ```

  - 429:
    - happens when the same user requests an email update to the same email more than once in a 5 minute period.
      - ```
         	{
                error_code: "Last sent at DATE_STRING"
         	}
        ```

##### POST /update-email

- **Requires Access Token**: No
- **Behavior**:
  - Updates user passord.
- **Required Params**:
  - _code_: string
- **Responses**:
  - 200:
    - user email confirmed.
      - ```
          {
              first_name: USER_FIRST_NAME
          }
        ```
  - 404:
    - code is invalid or user does not exist anymore.
  - 410:
    - code has expired or has already been used.

---

### Running

This this repo is a submodule in a repo that contains a Docker-Compose file that when run will activate the commands in the Dockerfile in this repo.
