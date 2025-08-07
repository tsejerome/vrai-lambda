# Vrai Lambda Server

VoiceRecorder AI Lambda Server - FFmpeg processing service for audio and video processing

A serverless backend with KOA, TypeScript, and Firebase for the Vrai (Voice Recorder AI) project.

## 🚀 Deployment Options

This application can be deployed to either **AWS Lambda** (using Serverless Framework) or **Fly.io** (containerized deployment).

### Fly.io Deployment (Recommended)

For Fly.io deployment, see the comprehensive migration guide: [FLY_DEPLOYMENT.md](./FLY_DEPLOYMENT.md)

**Quick Start:**
```bash
# Install Fly CLI
brew install flyctl  # macOS
# or visit https://fly.io/docs/hands-on/install-flyctl/

# Login and deploy
fly auth login
./scripts/migrate-to-fly.sh
```

### AWS Lambda Deployment (Legacy)

For AWS Lambda deployment using Serverless Framework, see the legacy setup below.

## 🆕 Migration Benefits

Migrating from AWS Lambda to Fly.io provides several advantages:

- **Cost Efficiency**: Pay only for actual compute time, scales to zero when not in use
- **Simplified Deployment**: No complex Lambda layers or cold start issues
- **Better Performance**: No cold starts, consistent response times
- **Easier Debugging**: Direct access to logs and container environment
- **Global Edge Network**: Automatic global distribution
- **Simplified FFmpeg Setup**: System-installed binaries instead of Lambda layers

## 📋 Migration Status

- ✅ Application code migrated to Fly.io
- ✅ FFmpeg configuration updated for containerized deployment
- ✅ Health checks and monitoring configured
- ✅ Environment variable management set up
- ✅ Deployment scripts and documentation created

## 🚀 Modal.com Migration Available

This repository now includes a **Modal.com migration** that maintains the same TypeScript functionality with improved performance and scalability. See:

- **[README-MODAL.md](./README-MODAL.md)** - Quick start guide for Modal.com version
- **[MODAL_MIGRATION_GUIDE.md](./MODAL_MIGRATION_GUIDE.md)** - Complete step-by-step migration instructions

### Key Benefits of Modal.com Migration

- ✅ **TypeScript Preserved**: Same language, same functionality
- ✅ **Better Performance**: Faster cold starts and automatic scaling
- ✅ **Resource Control**: Exact 1 CPU + 1GB RAM configuration
- ✅ **Simplified Deployment**: No complex serverless framework setup
- ✅ **Cost Optimization**: Pay only for actual compute time

### Quick Migration

```bash
# Install Modal CLI
pip install modal
modal setup

# Deploy to Modal
npm run modal:deploy
```

For complete migration instructions, see [MODAL_MIGRATION_GUIDE.md](./MODAL_MIGRATION_GUIDE.md).

## Set up / Install1. `npm i --save`

## Environment Variables Setup

This project uses environment variables for sensitive configuration. Create a `.env` file in the root directory with the following variables:

### Required Environment Variables

```bash
# Firebase Configuration
# Copy your Firebase service account key JSON content here (as a single line)
FIREBASE_SERVICE_ACCOUNT_KEY={"type:service_account",project_id:your-project-id,...}

# Database Configuration
# MongoDB connection string or Firebase database URL
DATABASE_URL=mongodb+srv://username:password@your-cluster.mongodb.net/your-database?retryWrites=true&w=majority
# OR for Firebase
# DATABASE_URL=https://your-project-id.firebaseio.com

# S3Configuration
s3bucket_name=vrai

# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_ACCESS_PW=your-aws-secret-access-key

# OpenAI Configuration
openai_secret=sk-your-openai-api-key-here

# Sieve Configuration

# Firebase Client Configuration (for frontend)
NEXT_PUBLIC_CLIENT_FIREBASE_CONFIG={apiKey:our-api-key,authDomain":your-project.firebaseapp.com","projectId:-project","storageBucket":"your-project.appspot.com,messagingSenderId:123456789appId:"your-app-id"}
```

### Getting Firebase Service Account Key
1o Firebase Console → Project Settings → Service Accounts
2lick "Generate new private key"
3. Download the JSON file
4py the entire JSON content and paste it as the value for `FIREBASE_SERVICE_ACCOUNT_KEY`

## How to use

use `serverless offline` to start a local server

### FFMpeg Setup

#### Localhost

On running `npx serverless offline`, you will need to manually copy both binaries into `./.esbuild/.build` folder

Note that different machines may require different versions of ffmpeg and ffprobe to work, but you can use the one in the `ffmpeg` folder as well. Some trial and error is required.

| Name | Location          | Remarks                                             |
| ---- | ----------------- | --------------------------------------------------- |
| Mac  | /opt/homebrew/bin | You need to use Show Original" as it is a shortcut |

#### Staging / Production

The FFMpeg / FFprobe we used in the lambdas are currently located in the `ffmpeg` folder.

1. We manually uploaded both binaries to s3the layer manually on AWS Console
3nk the layers into the lambda via `serverless.yml`

**Versions used:**
| Name | Version | Remarks |
| --- | --- | --- |
| ffmpeg | ffmpeg-master-latest-linux64pl.tar.xz | |
| ffprobe | ffmpeg-master-latest-linux64-lgpl.tar.xz | Smaller binary due to Lambda's250 bundle size limit, ffmpeg already at 130MB |

#####

## File tree - master branch

```
.
├──.serverless
├── src
│   ├── config
│   │   ├── .env-dev
│   │   └── .env-pro
│   ├── middleware
│   │   └── authorize.ts
│   ├── model
│   │   ├── schema
│   │   │   └── schema.ts
│   │   ├── VO
│   │   │   └── responseVo.ts
│   │   └── firebase.ts
│   ├── routes
│   │   ├── root
│   │   │   ├── root.controller.ts
│   │   │   └── root.routes.ts
│   │   └── users
│   │       ├── users.controller.ts
│   │       └── users.routes.ts
│   ├── services
│   │   └── logger.ts
│   └── util
│       └── message.ts
├── app.ts
├── package.json
├── package-lock.json
├── README.md
├── serverless.yml
└── tsconfig.json
```

## Tech Stack

### Base Tech

```
1. KOA - 2.11.0
2. Typescript - 3.8.3
3. Firebase - 7.17.2
```

### Middleware

```
1. koa-helmet - 5.2.0 Provide basic network security
2. koa-jwt - 3.3.0 Provide basic access token validation
3. koa-router 7.4.1 API Routing
4. koa-body - 4.2.0 Request Body parse to handle post request, replace koa-bodyparser and koa-multer
5. dotenv - 8.2.0 Switch environment variable in differ environment (local, dev, pro)
6. logger.ts - Self Coding Basic logger to print messages
7. message.ts - Self Coding Basic response message handler
8. serverless-http - 2.5.0 A useful framework to export the app server as serverless server
9. serverless-offline - 6.5.0 A pulgin to let you test the severless server in local
10. serverless-plugin-typescript - 1.1.9 Provide automatic compilation
```

## File Descriptions

### config

A directory to save the configure file such as .env fie, keys, json file etc.

### middleware

A directory to save the middleware file (e.g.authorize, permission checking, danger security control or request).

### model

A directory to save the database linking (e.g. firebase, mongodb, Mysql), export the value after init.

#### model/vo

Message.ts usage, no need to modify.

#### model/schema

The schema file for mongoDB/firebase using, you may also create a new type for object if you need.

### routes

A directory to save the API, one directory represent one route

#### routes/x.controller.ts

A file to handle API request (CRUD), all result should pre-process by message.ts before send out

#### routes/x.routes.ts

A file to export the route by connect all API functions in controller, for example please take a look on users.controller.ts (Please follow CRUD rules)

### services

A directory to save anythings related to in apps debugging (e.g. logger)

### util

A directory to save tools related function (e.g. messager, calculator, regex etc.)

## File Descriptions - serverless framework related

### .serverless

Auto create when you run `serverless deploy`

### serverless.yml

A yml file to save the serverless configuration, you can take ref and modify with you need

```yml
service: botbuilder-service-template

provider:
  name: aws
  runtime: nodejs10.x
  stage: dev
  region: us-east-2
  vpc:
    securityGroupIds:
      - sg-079afdd7abee843bf
    subnetIds:
      - subnet-35818f52
      - subnet-f60cc9af
      - subnet-4a2a1403

functions:
  app:
    handler: app.server # reference the file and exported method
    environment:
      MYSQL_HOST: botbuilder.cqngcvud8uum.us-east-2.rds.amazonaws.com
      MYSQL_PASSWORD: 18841884
      MYSQL_USER: db_test
      MYSQL_DATABASE: test
    events: # events trigger lambda functions
      - http: # this is an API Gateway HTTP event trigger
          path: /
          method: ANY
          cors:
            origin: "*" # <-- Specify allowed origin
            headers: # <-- Specify allowed headers
              - Content-Type
              - X-Amz-Date
              - Authorization
              - X-Api-Key
              - X-Amz-Security-Token
              - X-Amz-User-Agent
              - x-token
          authorizer:
            arn: arn:aws:lambda:us-east-2:428685568675:function:botbuilder-authorizer
            resultTtlInSeconds: 0
            identitySource: method.request.header.Authorization
      - http: # all routes get proxied to the Express router
          path: /{proxy+}
          method: ANY
          cors:
            origin: "*" # <-- Specify allowed origin
            headers: # <-- Specify allowed headers
              - Content-Type
              - X-Amz-Date
              - Authorization
              - X-Api-Key
              - X-Amz-Security-Token
              - X-Amz-User-Agent
              - x-token
          authorizer:
            arn: arn:aws:lambda:us-east-2:428685568675:function:botbuilder-authorizer
            resultTtlInSeconds: 0
            identitySource: method.request.header.Authorization
```

[1]: https://gitlab.com/freehunter/gist/serverless-backend-template/-/tree/serverless/serverless-frame
[2]: https://gitlab.com/freehunter/gist/firebase-function-template
