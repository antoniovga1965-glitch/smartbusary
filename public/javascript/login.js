export function login() {
    const username = document.getElementById('username');
    const Password = document.getElementById('Password');
    const login = document.getElementById('login');
    const resetpassword = document.getElementById('resetpassword');
    const loginresults = document.getElementById('loginresults');
    const showloginpassword = document.getElementById('imageping');


    showloginpassword.addEventListener('click', () => {
        if (Password.type === 'password') {
            Password.type = 'text';
        } else {
            Password.type = 'password';
        }
    })

    login.addEventListener('click', () => {
        const loginname = username.value.trim();
        const loginpassword = Password.value.trim();

        if (!loginname || !loginpassword) {
            loginresults.textContent = 'Please fill in the password and username first';

            setTimeout(() => {
                loginresults.classList.add('hidden')
            }, 3000);
            return
        }

        fetch('/login/loginroute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({loginname,loginpassword}),
        })

        .then(res=>res.json())
        .then(data=>{
            console.log(data);

            if(data.redirect){
                window.location.href=data.redirect;
            }
            
            loginresults.textContent = data.message;
        })
        .catch(err=>{
            loginresults.textContent = err.message;
        })

    })

const emailresetcont = document.getElementById('emailresetcont');

resetpassword.addEventListener('click',()=>{
emailresetcont.classList.remove('hidden');
})

const emailreset = document.getElementById('emailreset');
const getemail = document.getElementById('getemail');
const emailresults  =document.getElementById('emailresults');

getemail.addEventListener('click',()=>{
    const email = emailreset.value.trim();

    if(!email){
        emailresults.textContent = 'Enter registered email to reset your password';
        setTimeout(() => {
            emailresults.classList.add('hidden')
        }, 3000);
        return;
    }
    fetch('/sendemail/emailreset',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body:JSON.stringify({email})
    })
    .then(res=>res.json())
    .then(data=>{
        emailresults.textContent = data.message;
    })
    .catch(err=>{
        console.log(err);
        
         emailresults.textContent = err.message;
    })
})






}
