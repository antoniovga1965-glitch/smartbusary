export function REGISTER() {
    const registername = document.getElementById('registername');
    const registerschool = document.getElementById('registerschool');
    const registercounty = document.getElementById('registercounty');
    const registeradmission = document.getElementById('registeradmission');
    const registerpassword = document.getElementById('registerpassword');
    const showpassword = document.getElementById('showpassword');
    const registerconfirmpassword = document.getElementById('registerconfirmpassword');
    const registerresults = document.getElementById('registerresults');
    const registerbtn = document.getElementById('registerbtn');
    const emailregister  =document.getElementById('emailregister');
    





    showpassword.addEventListener('click', () => {
        if (registerpassword.type === 'password') {
            registerpassword.type = 'text'
        } else {
            registerpassword.type = 'password';
        }
    });

    const confirmpassword = document.getElementById('confirmpassword');

     confirmpassword.addEventListener('click', () => {
        if (registerconfirmpassword.type === 'password') {
            registerconfirmpassword.type = 'text'
        } else {
            registerconfirmpassword.type = 'password';
        }
    });


    registerbtn.addEventListener('click', () => {
        const REGISTERNAME = registername.value.trim();
        const REGISTERCOUNTY = registercounty.value.trim();
        const REGISTERADMISSION = registeradmission.value.trim();
        const REGISTERPASSWORD = registerpassword.value.trim();
        const CONFIRMPASSWORD = registerconfirmpassword.value.trim();
        const REGISTERSCHOOL = registerschool.value.trim();
        const EMAILREGISTER= emailregister.value.trim();

        if (!REGISTERNAME || !REGISTERCOUNTY || !REGISTERADMISSION || !REGISTERPASSWORD || !CONFIRMPASSWORD || !REGISTERSCHOOL||!EMAILREGISTER) {
            registerresults.textContent = 'Please fill in the required fields';

            setTimeout(() => {
                registerresults.classList.add('hidden');
            }, 3000);
            return
        }





        if (REGISTERPASSWORD !== CONFIRMPASSWORD) {
            registerresults.textContent = 'Password doesnt match try with correct password';
            setTimeout(() => {
                registerresults.classList.add('hidden');
            }, 3000);
            return;
        }


        fetch('/register/registerroute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ REGISTERNAME, REGISTERCOUNTY, REGISTERSCHOOL, REGISTERADMISSION, REGISTERPASSWORD,EMAILREGISTER })
        })
            .then(res => {
                if(res.status===200){
                    setTimeout(() => {
                        window.location.href = '/student.html';
                    },2000);
                }
                return res.json();
            })
            .then(data => {
                registerresults.textContent = data.message;
            })
            .catch(err => {
                registerresults.textContent = err.message;

                setTimeout(() => {
                    registerresults.classList.add('hidden')
                }, 3000);
            })

    })
}