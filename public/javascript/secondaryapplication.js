export function applications() {
  // personal information
  const nameinput = document.getElementById("nameinput");
  const bithcertno = document.getElementById("bithcertno");
  const gender = document.getElementById("gender");
  const countyresidence = document.getElementById("Countyresidence");
  const subcounty = document.getElementById("subcounty");
  const wardlevel = document.getElementById("wardlevel");
  const personalemail = document.getElementById("personalemail");

  // school information
  const schoolname = document.getElementById("schoolname");
  const primarySchoolemail = document.getElementById("PrimarySchoolemail");
  const secondarySchoolemail = document.getElementById("SecondarySchoolemail");
  const schoolcounty = document.getElementById("schoolcounty");
  const kcpecode = document.getElementById("kcpecode");
  const Assesmentno = document.getElementById("Assesmentno");
  const kcpeyear = document.getElementById("KCPE Year");
  const kcpemarks = document.getElementById("kcpemarks");
  const currentform = document.getElementById("currentform");
  const admissionno = document.getElementById("Admissionno");
  const schooltype = document.getElementById("schooltype");

  // guadian details

  const guardianname = document.getElementById("Guardianname");
  const Guardiankrapin = document.getElementById("Guardiankrapin");
  const guardianphoneno = document.getElementById("Guardianphoneno");
  const guardianID = document.getElementById("GuardianID");
  const relationshiptostudent = document.getElementById(
    "Relationshiptostudent",
  );
  const occupation = document.getElementById("Occupation");
  const guardianlocation = document.getElementById("guardianlocation");
  const guardiansincome = document.getElementById("guardiansincome");

  //   household section

  const numberofsiblings = document.getElementById("numberofsiblings");
  const siblingsinschool = document.getElementById("siblingsinschool");
  const orphanstatus = document.getElementById("prphanstatus");
  const housingstatus = document.getElementById("housingstatus");

  const declarationcheck = document.getElementById("declarationcheck");

  // file upload section

  const siblingscert = document.getElementById("numberofsiblingscert");
  const disabilitystatus = document.getElementById("disabilitystatus");

  const birthcertificate = document.getElementById("birthcertificate");
  const admissionletter = document.getElementById("AdmissionLetter");
  const feestructure = document.getElementById("Fee Structure");
  const schoolreport = document.getElementById("SchoolIDReportCard");
  const DeathCertificates = document.getElementById("DeathCertificates");

  const guardiannationalid = document.getElementById("GuardianNationalID");

  const proofofincome = document.getElementById("Proofofincome");

  const deathcertificates = document.getElementById("DeathCertificates");
  const disabilitycertificates = document.getElementById(
    "DisabilityCertificates",
  );
  const chiefsletter = document.getElementById("ChiefsLetter");
  const passportphoto = document.getElementById("PassportPhoto");

  const submitbtn = document.getElementById("submitbtn");
  const submittedresults = document.getElementById("submittedresults");

  submitbtn.addEventListener("click", () => {
    const formStartTime = Date.now();
    const formdata = new FormData();
    formdata.append("nameinput", nameinput.value);
    formdata.append("bithcertno", bithcertno.value);
    formdata.append("gender", gender.value);
    formdata.append("countyresidence", countyresidence.value);
    formdata.append("subcounty", subcounty.value);
    formdata.append("wardlevel", wardlevel.value);
    formdata.append("personalemail", personalemail.value);

    formdata.append("schoolname", schoolname.value);
    formdata.append("primarySchoolemail", primarySchoolemail.value);
    formdata.append("secondarySchoolemail", secondarySchoolemail.value);
    formdata.append("schoolcounty", schoolcounty.value);
    formdata.append("kcpecode", kcpecode.value);
    formdata.append("Assesmentno", Assesmentno.value);
    formdata.append("kcpeyear", kcpeyear.value);
    formdata.append("kcpemarks", kcpemarks.value);
    formdata.append("currentform", currentform.value);
    formdata.append("admissionno", admissionno.value);
    formdata.append("schooltype", schooltype.value);

    formdata.append("guardianname", guardianname.value);
    formdata.append("guardianphoneno", guardianphoneno.value);
    formdata.append("guardianID", guardianID.value);
    formdata.append("relationshiptostudent", relationshiptostudent.value);
    formdata.append("occupation", occupation.value);
    formdata.append("guardianlocation", guardianlocation.value);
    formdata.append("guardiansincome", guardiansincome.value);
    formdata.append("Guardian_krapin", Guardiankrapin.value);

    if (!declarationcheck.checked) {
      submittedresults.textContent =
        "Please accept the declaration before submitting!";
      return;
    }

    formdata.append("numberofsiblings", numberofsiblings.value);
    formdata.append("siblingsinschool", siblingsinschool.value);
    formdata.append("orphanstatus", orphanstatus.value);
    formdata.append("housingstatus", housingstatus.value);

    formdata.append("disabilitystatus", disabilitystatus.value);

    formdata.append("birthcertificate", birthcertificate.files[0]);
    formdata.append("admissionletter", admissionletter.files[0]);
    formdata.append("feestructure", feestructure.files[0]);
    formdata.append("schoolreport", schoolreport.files[0]);

    formdata.append("guardiannationalid", guardiannationalid.files[0]);

    formdata.append("proofofincome", proofofincome.files[0]);

    if (DeathCertificates.files[0]) {
      formdata.append("DeathCertificates", DeathCertificates.files[0]);
    }

    if (disabilitycertificates.files[0]) {
      formdata.append(
        "disabilitycertificates",
        disabilitycertificates.files[0],
      );
    }
    formdata.append("chiefsletter", chiefsletter.files[0]);

    if (passportphoto.files[0]) {
      formdata.append("passportphoto", passportphoto.files[0]);
    }

    if (
      !nameinput.value ||
      !bithcertno.value ||
      !gender.value ||
      !countyresidence.value ||
      !subcounty.value ||
      !wardlevel.value ||
      !schoolname.value ||
      !personalemail ||
      !primarySchoolemail.value ||
      !secondarySchoolemail.value ||
      !schoolcounty.value ||
      !kcpecode.value ||
      !Assesmentno.value ||
      !kcpeyear.value ||
      !kcpemarks.value ||
      !currentform.value ||
      !admissionno.value ||
      !schooltype.value ||
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
      submittedresults.textContent =
        "all  fields are required before submission!";
      setTimeout(() => {
        submittedresults.classList.add("hidden");
      }, 3000);
      return;
    }

    formdata.append("timeToSubmit", Date.now() - formStartTime);

    submitbtn.disabled = true;
    submitbtn.textContent = "⏳ Submitting... please wait";
    fetch("/secondary/secondaryapplicants", {
      method: "POST",
      body: formdata,
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        submitbtn.disabled = false;
        submitbtn.textContent = "Submit Application";
        submittedresults.textContent = data.message;
      
      })
      .catch((err) => {
        submitbtn.disabled = false;
        submitbtn.textContent = "Submit Application";
        submittedresults.textContent = err.message;

        setTimeout(() => {
          submitbtn.disabled = false;
          submittedresults.classList.add("hidden");
        }, 3000);
      });
  });
}
