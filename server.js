const express = require('express');
const app = express();
const port = 3000;
const cors  =require('cors');
const cookieparser = require('cookie-parser');


app.use(express.json())
app.use(express.static('public'));

app.use(cookieparser());
app.use(cors());

const register = require('./security/register');
app.use('/register',register);

const login = require('./security/login');
app.use('/login',login);


const logoutroute = require('./helpers/logout');
app.use('/logoutroute',logoutroute);


const sendemail = require('./helpers/sendemail');
app.use('/sendemail',sendemail);


const secondary = require('./backendlogic/sieve1');
app.use('/secondary',secondary);


const total = require('./backendlogic/total');

app.use('/total',total)


const logoutadministration = require('./backendlogic/logoutadmin');
app.use('/logoutadministration',logoutadministration)


require('./bullmq/worker')
app.listen(port,()=>{
    console.log(`Your app is live at http://localhost:${port}`)
})