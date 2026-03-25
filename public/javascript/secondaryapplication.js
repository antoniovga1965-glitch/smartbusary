
export function applications() {
  // personal information
  const nameinput = document.getElementById("nameinput");
  const bithcertno = document.getElementById("bithcertno");
  const gender = document.getElementById("gender");
  const countyresidence = document.getElementById("countyresidence");
  const subcounty = document.getElementById("subcounty");
  const wardlevel = document.getElementById("wardlevel");
  const personalemail = document.getElementById("personalemail");

  // school information
  const schoolname = document.getElementById("schoolname");
  const primarySchoolemail = document.getElementById("primarySchoolemail");
  const secondarySchoolemail = document.getElementById("secondarySchoolemail");
  const schoolcounty = document.getElementById("schoolcounty");
  const kcpecode = document.getElementById("kcpecode");
  const Assesmentno = document.getElementById("Assesmentno");
  const kcpeyear = document.getElementById("kcpeyear");


  const kcpemarks = document.getElementById("kcpemarks");
  const currentform = document.getElementById("currentform");
  const admissionno = document.getElementById("admissionno");
  const schooltype = document.getElementById("schooltype");

  // guadian details

  const guardianname = document.getElementById("guardianname");
  const Guardiankrapin = document.getElementById("Guardian_krapin");
  const guardianphoneno = document.getElementById("guardianphoneno");
  const guardianID = document.getElementById("guardianID");
  const relationshiptostudent = document.getElementById(
    "relationshiptostudent",
  );
  const occupation = document.getElementById("occupation");
  const guardianlocation = document.getElementById("guardianlocation");
  const guardiansincome = document.getElementById("guardiansincome");

  //   household section

  const numberofsiblings = document.getElementById("numberofsiblings");
  const siblingsinschool = document.getElementById("siblingsinschool");
  const orphanstatus = document.getElementById("orphanstatus");
  const housingstatus = document.getElementById("housingstatus");

  const declarationcheck = document.getElementById("declarationcheck");

  // file upload section

  const siblingscert = document.getElementById("numberofsiblingscert");
  const disabilitystatus = document.getElementById("disabilitystatus");

  const birthcertificate = document.getElementById("birthcertificate");
  const admissionletter = document.getElementById("admissionletter");
  const feestructure = document.getElementById("feestructure");
  const schoolreport = document.getElementById("schoolreport");
  const DeathCertificates = document.getElementById("DeathCertificates");

  const guardiannationalid = document.getElementById("guardiannationalid");

  const proofofincome = document.getElementById("proofofincome");

  const deathcertificates = document.getElementById("DeathCertificates");
  const disabilitycertificates = document.getElementById(
    "disabilitycertificates",
  );
  const chiefsletter = document.getElementById("chiefsletter");
  const passportphoto = document.getElementById("passportphoto");

  const submitbtn = document.getElementById("submitbtn");
  const submittedresults = document.getElementById("submittedresults");



submitbtn.addEventListener("click", async () => {
  const formStartTime = Date.now();


  if (!declarationcheck.checked) {
    submittedresults.textContent = "Please accept the declaration before submitting!";
    return;
  }

  if (
  !nameinput.value||
      !guardianname.value ||
      !guardianphoneno.value ||
      !guardianID.value ||
      !relationshiptostudent.value ||
      !occupation.value ||
      !guardianlocation.value ||
      !guardiansincome.value ||
      !numberofsiblings.value ||
      !siblingsinschool.value ||
      !orphanstatus.value ||
      !housingstatus.value ||
      !birthcertificate.files[0] ||
      !admissionletter.files[0] ||
      !feestructure.files[0] ||
      !schoolreport.files[0] ||
      !disabilitystatus.value ||
      !guardiannationalid.files[0] ||
      !Guardiankrapin.value ||
      !proofofincome.files[0] ||
      !chiefsletter.files[0] ||
      !passportphoto.files[0]
  ) {
    submittedresults.textContent = "All fields are required before submission!";
    setTimeout(() => submittedresults.classList.add("hidden"), 3000);
    return;
  }

  
  const CHUNK_SIZE = 512 * 1024; 

  async function uploadFileInChunks(file, fieldName) {
    const fileId = `${fieldName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

      let attempts = 0;
      let success = false;
      
      while (attempts < 3 && !success) {
        try {
          const res = await fetch("/secondary/upload-chunk", {
            method: "POST",
            headers: {
              "Content-Type": "*/*",
              "fileid": fileId,
              "chunknumber": String(i + 1),
              "totalchunks": String(totalChunks),
              "filename": file.name,
            },
            body: chunk,
            credentials: "include",
          });
          
  const responseText = await res.text(); 


          if (!res.ok) throw new Error(`Chunk ${i + 1} failed`);
          success = true;
        } catch (err) {
          attempts++;
          if (attempts === 3) throw new Error(`Failed to upload ${fieldName} after 3 attempts`);
          await new Promise(r => setTimeout(r, 1000 * attempts)); // wait before retry
        }
      }

      
      const percent = Math.round(((i + 1) / totalChunks) * 100);
      submitbtn.textContent = `⏳ Uploading ${fieldName}... ${percent}%`;
    }

    return fileId;
  }

  
  submitbtn.disabled = true;
  submittedresults.classList.remove("hidden");

  try {
  
    submitbtn.textContent = "⏳ Uploading files... please wait";

    const fileIds = {};
    fileIds.birthcertificate = await uploadFileInChunks(birthcertificate.files[0], "birthcertificate");
    fileIds.admissionletter = await uploadFileInChunks(admissionletter.files[0], "admissionletter");
    fileIds.feestructure = await uploadFileInChunks(feestructure.files[0], "feestructure");
    fileIds.schoolreport = await uploadFileInChunks(schoolreport.files[0], "schoolreport");
    fileIds.guardiannationalid = await uploadFileInChunks(guardiannationalid.files[0], "guardiannationalid");
    fileIds.proofofincome = await uploadFileInChunks(proofofincome.files[0], "proofofincome");
    fileIds.chiefsletter = await uploadFileInChunks(chiefsletter.files[0], "chiefsletter");
    fileIds.passportphoto = await uploadFileInChunks(passportphoto.files[0], "passportphoto");

  
    if (DeathCertificates.files[0]) {
      fileIds.DeathCertificates = await uploadFileInChunks(DeathCertificates.files[0], "DeathCertificates");
    }
    if (disabilitycertificates.files[0]) {
      fileIds.disabilitycertificates = await uploadFileInChunks(disabilitycertificates.files[0], "disabilitycertificates");
    }

    
    submitbtn.textContent = "⏳ Submitting application...";

    const response = await fetch("/secondary/secondaryapplicants", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameinput: nameinput.value,
        bithcertno: bithcertno.value,
        gender: gender.value,
        countyresidence: countyresidence.value,
        subcounty: subcounty.value,
        wardlevel: wardlevel.value,
        personalemail: personalemail.value,
        schoolname: schoolname.value,
        primarySchoolemail: primarySchoolemail.value,
        secondarySchoolemail: secondarySchoolemail.value,
        schoolcounty: schoolcounty.value,
        kcpecode: kcpecode.value,
        Assesmentno: Assesmentno.value,
        kcpeyear: kcpeyear.value,
        kcpemarks: kcpemarks.value,
        currentform: currentform.value,
        admissionno: admissionno.value,
        schooltype: schooltype.value,
        guardianname: guardianname.value,
        guardianphoneno: guardianphoneno.value,
        guardianID: guardianID.value,
        relationshiptostudent: relationshiptostudent.value,
        occupation: occupation.value,
        guardianlocation: guardianlocation.value,
        guardiansincome: guardiansincome.value,
        Guardian_krapin: Guardiankrapin.value,
        numberofsiblings: numberofsiblings.value,
        siblingsinschool: siblingsinschool.value,
        orphanstatus: orphanstatus.value,
        housingstatus: housingstatus.value,
        disabilitystatus: disabilitystatus.value,
        timeToSubmit: Date.now() - formStartTime,
        fileIds, 
      }),
    });

    const data = await response.json();
    alert(JSON.stringify(fileIds));
    
    submitbtn.disabled = false;
    submitbtn.textContent = "Submit Application";
    submittedresults.textContent = data.message;

  } catch (err) {
    submitbtn.disabled = false;
    submitbtn.textContent = "Submit Application";
    alert(err.message); 
    submittedresults.textContent = "Upload failed — check your connection and try again.";
    setTimeout(() => submittedresults.classList.add("hidden"), 4000);
  }
});
}
