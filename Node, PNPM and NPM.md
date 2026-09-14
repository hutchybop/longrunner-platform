
# Updating

### Locally (On Mac)
**Download and install the latest package from (This will install new and remove old):**
[nodejs](https://nodejs.org/en)
**Update npm:**
`sudo npm install -g npm@latest`
**update pnpm**
`sudo npm install -g pnpm@latest`
**Check latest versions:**
```
node -v
npm -v
pnpm -v
```

### Remotely (On Server)
**Update Node**
`sudo n <node version number>`
**Update npm:**
`sudo npm install -g npm@<version num>`
**update pnpm**
`sudo npm install -g pnpm@<version num>`
**Check the versions match the local mac:**
```
node -v
npm -v
pnpm -v
```

# Update pnpm packages

### Install packages
```
# Install package across all apps
cd <longrunner-platform dir>
pnpm add <package> -r
pnpm install

# Install package per app
cd <longrunner-platform dir>
pnpm add <package> --filter <app-name>
pnpm install
```

### Uninstall packages
```
# Unnstall package across all apps
cd <longrunner-platform dir>
pnpm remove <package> -r
pnpm install

# Uninstall package per app
cd <longrunner-platform dir>
pnpm remove <package> --filter <app-name>
pnpm install
```

### Update locally first to 'wanted'
**Update and test locally first**
```
# Update all apps
cd <longrunner-platform dir>
pnpm outdated -r
pnpm update -r
pnpm install

# Update per app
cd <longrunner-platform dir>
pnpm --filter <app-name> outdated  
pnpm --filter <app-name> update
pnpm install
```
**This will update 'current' to 'wanted' **

### Update to latest package versions
**This may have breaking changes**
```
# Update to the latest package versions
# N.B this may have breaking changes!!
pnpm up -L
pnpm install
```

# Update npm packages

### Update locally first to 'wanted'
**Update and test locally first**
```
cd <app working directory>
npm outdated
npm update
```
**This will update 'current' to 'wanted' **

### Update to latest package versions
**This may have breaking changes**
```
# Update to the latest package versions
# N.B this may have breaking changes!!
ncu -u
npm i

# Install ncu if not already
npm install -g npm-check-updates
```


# Install Nodemon
**Globally install to use with any app**
```
npm install -g nodemon
```


# Starting apps
### Commands
**To start all apps in same terminal:**
```
# In dev (locally)
pnpm -r --parallel run dev

# In production (Remotely)
pnpm -r --parallel run --if-present start
```

### Setup
**To setup multiple app start:**
**Add to each apps package.json script:**
```
"dev": "nodemon app.js",
"start": "node app.js"

# e.g for blog
 "name": "blog",
  "version": "1.0.0",
  "description": "Ironman blog application",
  "main": "app.js",
  "type": "module",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "dev": "nodemon app.js",
    "start": "node app.js"
  },
```

**In the shared package folder package.json add:**
```
"scripts": {
  "dev": "pnpm -r --parallel run dev",
  "start": "pnpm -r --parallel run start"
}
```