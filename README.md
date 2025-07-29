# Project Setup
## Clone the repository

```
git clone git@github.com:rohitkumar4826/agent_management.git
```

## Go to root repository

```
cd kiranai
```

## Go to server and client folder

```
cd server
cd client
```

## Change mongoDB URL in server (.env) with your username and password
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.qoyejkq.mongodb.net/agent-management
JWT_SECRET=fajw4hk5u36899dfdfafvha489dciufawethw4k4jsddfduia4
```

## Start the server
```
node server.js
```

## Start the frontend (Client)
```
npm start
```
