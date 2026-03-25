const express = require('express');
const app = express();
const port = 3000;
const cors  =require('cors');
const cookieparser = require('cookie-parser');


app.use((req, res, next) => {
  if (req.url.includes('/upload-chunk')) return next();
  express.json()(req, res, next);
});
app.use(express.static('public'));
app.set('trust proxy', 1);


app.use((req, res, next) => {
  req.setTimeout(180000); 
  res.setTimeout(180000);
  next();
});
app.use(cookieparser());
app.use(cors({
  origin: 'https://smartbusary-production.up.railway.app',
  credentials: true
}));

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
