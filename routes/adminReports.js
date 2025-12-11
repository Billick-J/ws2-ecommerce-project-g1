const express = require("express");
const router = express.Router();
const requireAdmin = require("../middleware/requireAdmin");
const ExcelJS = require("exceljs");


// GET /admin/reports/sales – sales overview with filters + aggregation
router.get("/reports/sales", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const ordersCollection = db.collection("orders");

    // 1. Read filters
    const startDateRaw = (req.query.startDate || "").trim();
    const endDateRaw = (req.query.endDate || "").trim();
    const statusRaw = (req.query.status || "all").trim();

    const filters = {
      startDate: startDateRaw,
      endDate: endDateRaw,
      status: statusRaw || "all",
    };

    // 2. Build $match stage
    const matchStage = {};
    const createdAtFilter = {};

    // Start date
    if (startDateRaw) {
      const startDateObj = new Date(startDateRaw);
      if (!isNaN(startDateObj.getTime())) {
        startDateObj.setHours(0, 0, 0, 0); // start of day
        createdAtFilter.$gte = startDateObj;
      }
    }

    // End date
    if (endDateRaw) {
      const endDateObj = new Date(endDateRaw);
      if (!isNaN(endDateObj.getTime())) {
        endDateObj.setHours(23, 59, 59, 999); // end of day
        createdAtFilter.$lte = endDateObj;
      }
    }

    if (Object.keys(createdAtFilter).length > 0) {
      matchStage.createdAt = createdAtFilter;
    }

    // Status filter
    if (filters.status !== "all") {
      matchStage.orderStatus = filters.status;
    }

    // 3. Aggregation pipeline
    const pipeline = [];

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
        },
      }
    );

    // 4. Execute aggregation
    const aggregationResult = await ordersCollection.aggregate(pipeline).toArray();

    // 5. Convert to dailySales[]
    const dailySales = aggregationResult.map((doc) => {
      const year = doc._id.year;
      const month = String(doc._id.month).padStart(2, "0");
      const day = String(doc._id.day).padStart(2, "0");

      return {
        date: `${year}-${month}-${day}`,
        totalSales: doc.totalSales || 0,
        orderCount: doc.orderCount || 0,
      };
    });

    // 6. Compute summary
    let totalSalesAll = 0;
    let totalOrdersAll = 0;

    dailySales.forEach((d) => {
      totalSalesAll += Number(d.totalSales) || 0;
      totalOrdersAll += Number(d.orderCount) || 0;
    });

    const averageOrderValue =
      totalOrdersAll > 0 ? totalSalesAll / totalOrdersAll : 0;

    const summary = {
      totalSales: totalSalesAll,
      totalOrders: totalOrdersAll,
      averageOrderValue,
    };

    // 7. Prepare chart data
    const labels = dailySales.map(day => day.date);
    const salesData = dailySales.map(day => Number(day.totalSales) || 0);

    // 8. Render view
    res.render("admin-reports-sales", {
    title: "Admin – Sales Overview",
    filters,
    dailySales,
    summary,
    labels,
    salesData
    });

  } catch (err) {
    console.error("Error loading sales report:", err);
    res.status(500).send("Error loading sales report.");
  }
});

// GET /admin/reports/sales/export/daily – Excel export for daily sales
router.get("/reports/sales/export/daily", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const ordersCollection = db.collection("orders");

    // 1. Read filters from query
    const startDateRaw = (req.query.startDate || "").trim();
    const endDateRaw = (req.query.endDate || "").trim();
    const statusRaw = (req.query.status || "all").trim();

    const filters = {
      startDate: startDateRaw,
      endDate: endDateRaw,
      status: statusRaw || "all"
    };

    // 2. Build match stage
    const matchStage = {};
    const createdAtFilter = {};

    if (startDateRaw) {
      const startDateObj = new Date(startDateRaw);
      if (!isNaN(startDateObj.getTime())) {
        startDateObj.setHours(0, 0, 0, 0);
        createdAtFilter.$gte = startDateObj;
      }
    }

    if (endDateRaw) {
      const endDateObj = new Date(endDateRaw);
      if (!isNaN(endDateObj.getTime())) {
        endDateObj.setHours(23, 59, 59, 999);
        createdAtFilter.$lte = endDateObj;
      }
    }

    if (Object.keys(createdAtFilter).length > 0) {
      matchStage.createdAt = createdAtFilter;
    }

    if (filters.status !== "all") {
      matchStage.orderStatus = filters.status;
    }

    // 3. Aggregation pipeline
    const pipeline = [];
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }
    pipeline.push(
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1
        }
      }
    );

    const aggregationResult = await ordersCollection.aggregate(pipeline).toArray();

    // 4. Convert to dailySales array
    const dailySales = aggregationResult.map(doc => {
      const year = doc._id.year;
      const month = String(doc._id.month).padStart(2, "0");
      const day = String(doc._id.day).padStart(2, "0");
      return {
        date: `${year}-${month}-${day}`,
        totalSales: doc.totalSales || 0,
        orderCount: doc.orderCount || 0
      };
    });

    // 5. Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Daily Sales");

    sheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Total Sales", key: "totalSales", width: 15, style: { numFmt: '"₱"#,##0.00;[Red]\-"₱"#,##0.00' } },
    { header: "Number of Orders", key: "orderCount", width: 18 }
    ];

    // Add rows
    dailySales.forEach(day => {
    sheet.addRow({
        date: day.date,
        totalSales: Number(day.totalSales), // keep as number for formatting
        orderCount: day.orderCount
    });
    });

    // 6. Set headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="daily_sales_report.xlsx"'
    );

    // 7. Stream workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error exporting daily sales Excel:", err);
    res.status(500).send("Error exporting daily sales Excel file.");
  }
});

// GET /admin/reports/sales/export/orders – Excel export for detailed orders
router.get("/reports/sales/export/orders", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const ordersCollection = db.collection("orders");

    // 1. Read filters from query
    const startDateRaw = (req.query.startDate || "").trim();
    const endDateRaw = (req.query.endDate || "").trim();
    const statusRaw = (req.query.status || "all").trim();
    const filters = {
      startDate: startDateRaw,
      endDate: endDateRaw,
      status: statusRaw || "all"
    };

    // 2. Build MongoDB query
    const query = {};
    const createdAtFilter = {};
    if (startDateRaw) {
      const startDateObj = new Date(startDateRaw);
      if (!isNaN(startDateObj.getTime())) startDateObj.setHours(0, 0, 0, 0);
      createdAtFilter.$gte = startDateObj;
    }
    if (endDateRaw) {
      const endDateObj = new Date(endDateRaw);
      if (!isNaN(endDateObj.getTime())) endDateObj.setHours(23, 59, 59, 999);
      createdAtFilter.$lte = endDateObj;
    }
    if (Object.keys(createdAtFilter).length > 0) query.createdAt = createdAtFilter;
    if (filters.status !== "all") query.orderStatus = filters.status;

    // 3. Fetch orders
    const orders = await ordersCollection.find(query).sort({ createdAt: 1 }).toArray();

    // 4. Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Detailed Orders");

    // 5. Define columns
    sheet.columns = [
      { header: "Order ID", key: "orderId", width: 20 },
      { header: "Date/Time", key: "dateTime", width: 20 },
      { header: "User", key: "user", width: 25 },
      { header: "Status", key: "status", width: 15 },
      { header: "Total Amount", key: "totalAmount", width: 15, style: { numFmt: '"₱"#,##0.00;[Red]\-"₱"#,##0.00' } }
    ];

    // Optional: bold header row
    sheet.getRow(1).font = { bold: true };

    // 6. Add rows
    orders.forEach(order => {
      const created = order.createdAt ? new Date(order.createdAt) : null;
      const dateTime = created
        ? `${created.getFullYear()}-${String(created.getMonth()+1).padStart(2,'0')}-${String(created.getDate()).padStart(2,'0')} ${String(created.getHours()).padStart(2,'0')}:${String(created.getMinutes()).padStart(2,'0')}:${String(created.getSeconds()).padStart(2,'0')}`
        : "";

      sheet.addRow({
        orderId: order.orderId || "",
        dateTime,
        user: order.userEmail || order.userId || "",
        status: order.orderStatus || "",
        totalAmount: Number(order.totalAmount || 0)
      });
    });

    // 7. Send Excel file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="detailed_orders_report.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("Error exporting detailed orders Excel:", err);
    res.status(500).send("Error exporting detailed orders Excel file.");
  }
});




module.exports = router;
