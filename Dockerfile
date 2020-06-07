# base image
FROM node:latest

# set working directory
WORKDIR /app/registration-api

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/registration-api/node_modules/.bin:$PATH

# install and cache app dependencies
COPY package.json /app/registration-api/package.json
RUN npm install

# wait for database then start app
CMD ["/app/wait-for-it.sh", "authentication-api:80", "-t", "0", "--", "npm", "run", "dev"]
