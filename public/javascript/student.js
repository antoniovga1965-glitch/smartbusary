const logoutstudent= document.getElementById('logoutstudent');

logoutstudent.addEventListener("click", () => {

  fetch("/logoutroute/logoutstudent", {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
        setTimeout(() => {
            window.location.href="/index.html";
        }, 2000);

        
      console.log(data);
    })
    .catch((err) => {
      console.log(err);
    });
});




const startapplication = document.getElementById('startapplication');
const startbtn = document.getElementById('startbtn');
const applicantform = document.getElementById('applicantform');

applicantform.addEventListener('submit',(e)=>{
e.preventDefault();
})

startapplication.addEventListener('click',()=>{
  applicantform.classList.remove('hidden')
    applicantform.scrollIntoView({behavior:'smooth'});
  
})

startbtn.addEventListener('click',()=>{
 
    applicantform.classList.remove('hidden')
     applicantform.scrollIntoView({behavior:'smooth'});
})

import { applications } from "./secondaryapplication.js";
applications();