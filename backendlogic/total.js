const expres = require("express");
const router = expres.Router();
const prisma = require("../prisma.client");
const verifyadmin = require("../adminmiddleware");

router.get("/totalapplyingstudents", verifyadmin, async (req, res) => {
  try {
    const totalapplicants = await prisma.Application.count();
    return res.status(200).json({ message: totalapplicants });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/rejectedstudents", verifyadmin, async (req, res) => {
  try {
    const rejected = await prisma.Application.count({
      where: { status: "rejected" },
    });
    return res.status(200).json({ message: rejected });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/pendingapplication", verifyadmin, async (req, res) => {
  try {
    const pending = await prisma.Application.count({
      where: { status: "pending" },
    });
    return res.status(200).json({ message: pending });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/approvedstudents", verifyadmin, async (req, res) => {
  try {
    const verified = await prisma.Application.count({
      where: { status: "verified" },
    });
    return res.status(200).json({ message: verified });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/registeredusers", verifyadmin, async (req, res) => {
  try {
    const users = await prisma.registerd_users.findMany();
    return res.status(200).json({ message: users });
  } catch (error) {
    return res.status(500).json({ message: "something went wrong" });
  }
});

router.get("/secondaryapplicants", verifyadmin, async (req, res) => {
  try {
    const secondaryuser = await prisma.Application.findMany();
    return res.status(200).json({ message: secondaryuser });
  } catch (error) {
    return res.status(500).json({ message: "something went wrong try again" });
  }
});

router.post("/setbudget", verifyadmin, async (req, res) => {
  const { SETBUGET, BUDGETEDCOUNTY, FINANCIALYEAR } = req.body;

  try {
    const budget = await prisma.budget.create({
      data: {
        SETBUGET: parseInt(req.body.SETBUGET),
        BUDGETEDCOUNTY: BUDGETEDCOUNTY,
        FINANCIALYEAR: FINANCIALYEAR,
      },
    });
    return res.status(200).json({
      message: `Budget for ${BUDGETEDCOUNTY} for financial year ${FINANCIALYEAR} set succesfully`,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({ message: "something went wrong try again" });
  }
});

router.get("/displaybudget", verifyadmin, async (req, res) => {
  try {
    const budget = await prisma.budget.findMany();
    return res.status(200).json({ message: budget });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong try again" });
  }
});

router.get("/gendergraph", verifyadmin, async (req, res) => {
  try {
    const [male, female] = await Promise.all([
      prisma.Application.count({ where: { gender: "Male" } }),
      prisma.Application.count({ where: { gender: "Female" } }),
    ]);
    return res.status(200).json({ male, female });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong try again later" });
  }
});

const categorizeflag = (reason) => {
  if (reason.includes("name")) return "Name Mismatch";
  if (reason.includes("school") || reason.includes("admission"))
    return "School Fraud";
  if (
    reason.includes("ID") ||
    reason.includes("KRA") ||
    reason.includes("birth cert")
  )
    return "Identity Fraud";
  if (
    reason.includes("county") ||
    reason.includes("location") ||
    reason.includes("chief")
  )
    return "Location Fraud";
  if (reason.includes("disability")) return "Disability Fraud";
  if (reason.includes("government") || reason.includes("KNEC"))
    return "Document Forgery";
  if (reason.includes("IP") || reason.includes("device")) return "System Abuse";
  if (reason.includes("income")) return "Income Fraud";
  return "Other";
};
router.get("/frauds", verifyadmin, async (req, res) => {
  try {
    const applications = await prisma.Application.findMany({
      select: { flags: true },
    });

    const categories = {
      "Name Mismatch": 0,
      "School Fraud": 0,
      "Identity Fraud": 0,
      "Location Fraud": 0,
      "Disability Fraud": 0,
      "Document Forgery": 0,
      "System Abuse": 0,
      "Income Fraud": 0,
      Other: 0,
    };

    applications.forEach((app) => {
      app.flags.forEach((flag) => {
        const category = categorizeflag(flag.reason);
        categories[category]++;
      });
    });

    return res.status(200).json({ categories });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/residence", verifyadmin, async (req, res) => {
  try {
    const residence = await prisma.Application.groupBy({
      by: ["wardlevel"],
      _count: {
        wardlevel: true,
      },
      orderBy: {
        _count: {
          wardlevel: 'desc' 
        }
      },
      take: 10,
    });

    const formatted = residence.map(r => ({
      ward: r.wardlevel,
      count: r._count.wardlevel,
    }));

    return res.status(200).json({ residence: formatted });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong try again later' });
  }
});
module.exports = router;
