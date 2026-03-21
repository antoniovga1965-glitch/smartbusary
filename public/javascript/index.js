const applynowbtn = document.getElementById("applynowbtn");
const loginpage = document.getElementById("loginpage");
const loginform = document.getElementById("loginform");
const startssection = document.getElementById("startssection");
const howitworksection = document.getElementById("howitworksection");
const oldnewway = document.getElementById("oldnewway");
const features = document.getElementById("features");
const registerpage = document.getElementById("registerpage");
const registerform = document.getElementById("registerform");
const applynowhero = document.getElementById("applynow");

loginform.addEventListener("submit", (e) => {
  e.preventDefault();
});

registerform.addEventListener("submit", (e) => {
  e.preventDefault();
});


const emailresetcont = document.getElementById('emailresetcont');
const resetpassword = document.getElementById('resetpassword');
resetpassword.addEventListener('click',()=>{
  emailresetcont.scroll({behavior:'instant'})
  emailresetcont.classList.remove('hidden')

})
 

applynowbtn.addEventListener("click", () => {
  loginpage.classList.remove("hidden");
  howitworksection.classList.add('hidden');
  startssection.classList.add("hidden");
  oldnewway.classList.add("hidden");
  features.classList.add("hidden");
  loginpage.scrollIntoView({ behavior: "smooth" });
  registerpage.classList.add("hidden");
});

applynowhero.addEventListener("click", () => {
  loginpage.classList.remove("hidden");
  startssection.classList.add("hidden");
  howitworksection.classList.add("hidden");
  oldnewway.classList.add("hidden");
  features.classList.add("hidden");
  registerpage.classList.add("hidden");
  loginpage.scrollIntoView({ behavior: "smooth" });
});

const registerlink = document.getElementById("registerlink");
registerpage.scrollIntoView({ behavior: "smooth" });
registerlink.addEventListener("click", () => {
  loginpage.classList.add("hidden");
  startssection.classList.add("hidden");
  howitworksection.classList.add("hidden");
  oldnewway.classList.add("hidden");
  features.classList.add("hidden");
  registerform.classList.remove("hidden");
  registerpage.classList.remove("hidden");
});



const signin = document.getElementById("signin");

const redirecttologinform = document.getElementById("redirecttologinform");

redirecttologinform.addEventListener("click", () => {
  loginpage.classList.remove("hidden");
  startssection.classList.add("hidden");
  howitworksection.classList.add("hidden");
  oldnewway.classList.add("hidden");
  features.classList.add("hidden");
  registerpage.classList.add("hidden");
  loginpage.scrollIntoView({ behavior: "smooth" });
});

signin.addEventListener("click", () => {
  loginpage.classList.remove("hidden");
  startssection.classList.add("hidden");
  howitworksection.classList.add("hidden");
  oldnewway.classList.add("hidden");
  features.classList.add("hidden");
  registerpage.classList.add("hidden");
  loginpage.scrollIntoView({ behavior: "smooth" });
});

const asidebar = document.getElementById("asidebar");
const hamburgermenu = document.getElementById("hamburgermenu");

hamburgermenu.addEventListener("click", (e) => {
  e.stopPropagation();
  if (asidebar.style.right === "0px") {
    asidebar.style.right = "-100%";
  } else {
    asidebar.style.right = "0px";
  }
});

document.addEventListener("click", (e) => {
  if (!asidebar.contains(e.target) && asidebar.style.right === "0px") {
    asidebar.style.right = "-100%";
  }
});

const homebtn = document.getElementById("homebtn");
const landingpage = document.getElementById("landingpage");

homebtn.addEventListener("click", () => {
  landingpage.scrollIntoView({ behavior:"smooth" });
});



const herohowitwork = document.getElementById('herohowitwork');


herohowitwork.addEventListener("click", () => {
  howitworksection.scrollIntoView({ behavior: "smooth" });
});


const workbtn = document.getElementById('workbtn');

workbtn.addEventListener("click", () => {
  howitworksection.scrollIntoView({ behavior: "smooth" });
});



const btnfeatures = document.getElementById("btnfeatures");

btnfeatures.addEventListener("click", () => {
  features.scrollIntoView({ behavior: 'smooth'});
});

const btnfqs = document.getElementById("btnfqs");
const FAQ = document.getElementById("FAQ");

btnfqs.addEventListener("click", () => {
  FAQ.scrollIntoView({ behavior: 'smooth'});
});


const liveapplants = document.getElementById("liveapplants");


const applicants = [
  { name: "Antony Chacha", status: "Pending", reason: "Application submitted and awaiting review" },
  { name: "Smartkid TGa", status: "Rejected", reason: "Used fake KCPE results slip" },
  { name: "Faith Akinyi", status: "Approved", reason: "Excellent KCPE performance and financial need confirmed" },
  { name: "Brian Otieno", status: "Rejected", reason: "Guardian income exceeds bursary eligibility limit" },
  { name: "Mercy Wanjiku", status: "Approved", reason: "Orphan status verified with supporting documents" },
  { name: "Kevin Mwita", status: "Rejected", reason: "Missing required admission letter" },
  { name: "Janet Njeri", status: "Approved", reason: "Top KCPE marks and strong recommendation from chief" },
  { name: "Samuel Kiptoo", status: "Rejected", reason: "KCPE results did not meet bursary criteria" },
  { name: "Peter Mutua", status: "Approved", reason: "Disability certificate verified and financial hardship confirmed" },
  { name: "Lilian Atieno", status: "Rejected", reason: "Incomplete application documents submitted" }
];

let index  = 0;


function showstatus() {
    const applicant = applicants[index];
    liveapplants.textContent = `
    ${applicant.name} 
     ${applicant.reason} 
    ${applicant.status} 
    
    `
    index++;

    if(index>=applicants.length){
        index=0;
    }
}
setInterval(showstatus,4000);




import { REGISTER } from "./register.js";
REGISTER();

import { login } from "./login.js";
login();
