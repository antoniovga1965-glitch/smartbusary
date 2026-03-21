const totalapplicants = document.getElementById("totalapplicants");

async function gettotalapplicants() {
  fetch("/total/totalapplyingstudents", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      totalapplicants.innerHTML = `<P class="px-2 py-2">${data.message}</P>`;
    })
    .catch((err) => {
      totalapplicants.textContent = err.message;
    });
}
gettotalapplicants();

const rejectedapplicants = document.getElementById("rejectedapplicants");

async function getrejectedapplicants() {
  fetch("/total/rejectedstudents", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      rejectedapplicants.innerHTML = `${data.message} `;
    })
    .catch((err) => {
      rejectedapplicants.textContent = err.message;
    });
}
getrejectedapplicants();

const logoutbtn = document.getElementById("logoutbtn");

logoutbtn.addEventListener("click", () => {
  fetch("/logoutadministration/logutadmin", {
    method: "POST",
    credentials: "include",
  })
    .then((res) => {
      if (res.status === 200) {
        window.location.href = "/index.html";
      }
      return res.json();
    })
    .then((data) => {
      console.log(data);
    })
    .catch((err) => {
      console.log(err);
    });
});

const pendingapplicants = document.getElementById("pendingapplicants");

async function pendingresults() {
  fetch("/total/pendingapplication", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
    })
    .catch((err) => {
      console.log(err);
    });
}
pendingresults();

const ApprovedApplicants = document.getElementById("ApprovedApplicants");

async function approved() {
  fetch("/total/approvedstudents", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      ApprovedApplicants.textContent = data.message;
    })
    .catch((err) => {
      ApprovedApplicants.textContent = err.message;
    });
}
approved();

const registeredstudents = document.getElementById("registeredusers");

async function registereduser() {
  fetch("/total/registeredusers", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);

      registeredstudents.innerHTML = "";

      data.message.forEach((user) => {
        const row = document.createElement("tr");

        row.innerHTML = `
        
        <td class="px-4 py-2">${user.registername}</td>
        <td class="px-4 py-2">${user.registeradmission}</td>
        <td class="px-4 py-2">${user.registerschool}</td>
        <td class="px-4 py-2">${user.registercounty}</td>
        <td class="px-4 py-2">${user.registerpassword}</td>
        <td class="px-4 py-2">${user.Created_at}</td>
        `;
        registeredstudents.appendChild(row);
      });
    })
    .catch((err) => {
      console.log(err);
    });
}
registereduser();

const secondaryapplicants = document.getElementById("secondaryapplicants");

async function secondaryapplicant() {
  fetch("/total/secondaryapplicants", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      secondaryapplicants.innerHTML = "";
      console.log(data);

      data.message.forEach((student) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="px-2 py-2">${student.nameinput}</td>
            <td class="px-2 py-2">${student.schoolname}</td>
            <td class="px-2 py-2">${student.currentform}</td>
           <td class="px-2 py-2"> ${student.countyresidence}</td>
            <td class="px-2 py-2">${new Date(student.createdate).toLocaleString()}</td>
            <td class="px-2 py-2">${student.fraudscore}</td>
            <td class="px-2 py-2 text-yellow-400">${student.flags.map((f) => f.reason).join(", ")}</td>
            <td class="px-2 py-2"> ${student.status}</td>
            <td class="px-2 py-2"> ${student.action}</td>
           
            `;
        secondaryapplicants.appendChild(row);
      });
    })
    .catch((err) => {
      console.log(err);
    });
}
secondaryapplicant();

const setbudget = document.getElementById("setbudget");
const BudgetedCounty = document.getElementById("BudgetedCounty");
const financialyear = document.getElementById("financialyear");
const results = document.getElementById("results");
const setbutton = document.getElementById("setbutton");

setbutton.addEventListener("click", () => {
  const SETBUGET = setbudget.value.trim();
  const BUDGETEDCOUNTY = BudgetedCounty.value.trim();
  const FINANCIALYEAR = financialyear.value;

  if (!SETBUGET || !BUDGETEDCOUNTY || !FINANCIALYEAR) {
    results.textContent = "Please honourable Set your budget first";
    setTimeout(() => {
      results.classList.add("hidden");
    }, 3000);
    return;
  }
  fetch("/total/setbudget", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ SETBUGET, BUDGETEDCOUNTY, FINANCIALYEAR }),
  })
    .then((res) => res.json())
    .then((data) => {
      results.innerHTML = data.message;
    })
    .catch((err) => {
      console.log(err);

      results.innerHTML = err.message;
    });
});

const displaysetbudget = document.getElementById("displaysetbudget");

async function displaybudget() {
  fetch("/total/displaybudget", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      data.message.forEach((student) => {
        displaysetbudget.innerHTML = `${student.BUDGETEDCOUNTY} allocated ${student.SETBUGET} for financial year ${student.FINANCIALYEAR}`;
      });
    })
    .catch((err) => {
      displaysetbudget.innerHTML = err.message;
    });
}
displaybudget();

const Genderchart = document.getElementById("Genderchart").getContext("2d");

async function genderchart() {
  fetch("/total/gendergraph", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      new Chart(Genderchart, {
        type: "doughnut",
        data: {
          labels: ["male", "female"],
          datasets: [
            {
              data: [data.male, data.female],
              backgroundColor: ["#a6baad", "#275939"],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#ffffff",
                font: { size: 19 },
                padding: 20,
                boxWidth: 15,
              },
            },
          },
        },
      });
    })
    .catch((err) => {
      console.log(err);
    });
}
genderchart();

const Fraudalert = document.getElementById("Fraudalert").getContext("2d");

async function fraud() {
  fetch("/total/frauds", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      const labels = Object.keys(data.categories);
      const counts = Object.values(data.categories);

      const combined = labels
        .map((label, i) => ({ label, count: counts[i] }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count);

      const sortedlabels = combined.map((item) => item.label);
      const sortedcounts = combined.map((item) => item.count);

      new Chart(Fraudalert, {
        type: "bar",
        data: {
          labels: sortedlabels,
          datasets: [
            {
              label: "Fraud Attempts",
              data: sortedcounts,
              backgroundColor: "#4ade80",
              borderColor: "#166534",
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => ` ${context.raw} applications`,
              },
            },
          },
          scales: {
            x: {
              ticks: { color: "#4ade80" },
              grid: { color: "#1a3a2a" },
            },
            y: {
              ticks: { color: "#eef8f1", font: { size: 19 } },
              grid: { display: false },
            },
          },
        },
      });
    })
    .catch((err) => {
      console.log(err);
    });
}
fraud();

const residencegraph = document
  .getElementById("residencegraph")
  .getContext("2d");

async function residence() {
  fetch("/total/residence", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);

    const labels = data.residence.map(r => r.ward);
    const counts = data.residence.map(r => r.count);

    new Chart(residencegraph, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Applications per Ward',
          data: counts,
          backgroundColor: '#4ade80',
          borderColor: '#166534',
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.raw} applications`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#4ade80' },
            grid: { color: '#1a3a2a' }
          },
          y: {
            ticks: { 
              color: '#4ade80',
              font: { size: 12 }
            },
            grid: { display: false }
          }
        }
      }
    });
  })
   
    .catch((err) => {
      console.log(err);
    });
}
residence();
