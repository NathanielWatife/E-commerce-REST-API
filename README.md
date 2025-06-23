# E-commerce-REST-API
These is an E-commerce API developed with using Nodejs/Express.js, mongoDB as the database. 

## installation Ruquirements
    ### cd into working directory
        -- Initialize working directory
        ```
            npm init -y
        ```

        -- Install packages
        ```
            npm install
        ```
        -- Install development tool (Nodemon)
        ```
            npm install --save-dev nodemon
        ```

### Add this to packages.json inside scripts
    -- "start": "nodemon index.js",

## Create connection to mongodb database
    -- https://cloud.mongodb.com/


### CreatedModels folder
    --- Added cart.js, product.js, user.js, order.js, category.js

    - User.js
        - added address schema
