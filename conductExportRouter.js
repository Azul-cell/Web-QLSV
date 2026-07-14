const express = require("express");

const router = express.Router();

const ExcelJS = require("exceljs");

const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const {
  getExportData,
  getStatistics,
  getDashboard,
} = require("../helpers/conductHelper");

/*=========================================================
CẤU HÌNH BIỂU ĐỒ
=========================================================*/

const CHART_WIDTH = 900;

const CHART_HEIGHT = 500;

const chartCanvas = new ChartJSNodeCanvas({
  width: CHART_WIDTH,
  height: CHART_HEIGHT,
  backgroundColour: "white",
});

/*=========================================================
FORMAT HEADER
=========================================================*/

function formatHeader(sheet) {
  const row = sheet.getRow(1);

  row.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  row.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  row.height = 24;

  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",

      pattern: "solid",

      fgColor: {
        argb: "4472C4",
      },
    };

    cell.border = {
      top: {
        style: "thin",
      },

      left: {
        style: "thin",
      },

      bottom: {
        style: "thin",
      },

      right: {
        style: "thin",
      },
    };
  });
}

/*=========================================================
FORMAT BORDER
=========================================================*/

function formatBorder(sheet) {
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: {
          style: "thin",
        },

        left: {
          style: "thin",
        },

        bottom: {
          style: "thin",
        },

        right: {
          style: "thin",
        },
      };

      cell.alignment = {
        vertical: "middle",
      };
    });
  });
}

/*=========================================================
TẠO BIỂU ĐỒ
=========================================================*/

async function createChartBuffer() {
  const statistics = await getStatistics();

  return await chartCanvas.renderToBuffer({
    type: "bar",

    data: {
      labels: statistics.labels,

      datasets: [
        {
          label: "Số sinh viên",

          data: statistics.values,

          backgroundColor: [
            "#4CAF50",
            "#2196F3",
            "#FFC107",
            "#FF9800",
            "#F44336",
          ],

          borderWidth: 1,
        },
      ],
    },

    options: {
      responsive: false,

      plugins: {
        legend: {
          display: false,
        },

        title: {
          display: true,

          text: "THỐNG KÊ XẾP LOẠI ĐIỂM RÈN LUYỆN",

          font: {
            size: 18,
          },
        },
      },

      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

/*=========================================================
XUẤT TOÀN BỘ KẾT QUẢ
=========================================================*/

router.get("/results", async (req, res) => {
  try {
    const data = await getExportData();

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet("Điểm rèn luyện");

    sheet.columns = [
      { header: "STT", key: "stt", width: 8 },

      { header: "MSSV", key: "masv", width: 18 },

      { header: "Họ tên", key: "hoten", width: 35 },

      { header: "Lớp", key: "lop", width: 15 },

      { header: "Niên khóa", key: "nienkhoa", width: 15 },

      { header: "Học kỳ", key: "hocky", width: 12 },

      { header: "Năm học", key: "namhoc", width: 18 },

      { header: "Điểm", key: "diem", width: 12 },

      { header: "Xếp loại", key: "xeploai", width: 18 },
    ];

    formatHeader(sheet);

    data.forEach((item, index) => {
      sheet.addRow({
        stt: index + 1,

        masv: item.masv,

        hoten: item.hoten,

        lop: item.lop,

        nienkhoa: item.nienkhoa,

        hocky: item.hoc_ky,

        namhoc: item.nam_hoc,

        diem: item.final_total,

        xeploai: item.final_rank,
      });
    });

    formatBorder(sheet);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="conduct-results.xlsx"',
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (err) {
    console.log(err);

    res.status(500).send("Không thể xuất Excel");
  }
});
/*=========================================================
XUẤT KẾT QUẢ THEO ĐỢT ĐÁNH GIÁ
=========================================================*/

router.get("/results/:periodId", async (req, res) => {
  try {
    const { periodId } = req.params;

    const data = await getExportData({
      periodId,
    });

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet("Điểm rèn luyện");

    sheet.columns = [
      { header: "STT", key: "stt", width: 8 },

      { header: "MSSV", key: "masv", width: 18 },

      { header: "Họ tên", key: "hoten", width: 35 },

      { header: "Lớp", key: "lop", width: 15 },

      { header: "Niên khóa", key: "nienkhoa", width: 15 },

      { header: "Học kỳ", key: "hocky", width: 12 },

      { header: "Năm học", key: "namhoc", width: 18 },

      { header: "Điểm", key: "diem", width: 12 },

      { header: "Xếp loại", key: "xeploai", width: 18 },
    ];

    formatHeader(sheet);

    data.forEach((item, index) => {
      sheet.addRow({
        stt: index + 1,

        masv: item.masv,

        hoten: item.hoten,

        lop: item.lop,

        nienkhoa: item.nienkhoa,

        hocky: item.hoc_ky,

        namhoc: item.nam_hoc,

        diem: item.final_total,

        xeploai: item.final_rank,
      });
    });

    formatBorder(sheet);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="conduct-period-${periodId}.xlsx"`,
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (err) {
    console.log(err);

    res.status(500).send("Không thể xuất Excel");
  }
});
/*=========================================================
XUẤT THỐNG KÊ + BIỂU ĐỒ
=========================================================*/

router.get("/statistics", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet("Thống kê");

    sheet.columns = [
      {
        header: "Xếp loại",
        key: "rank",
        width: 25,
      },
      {
        header: "Số lượng",
        key: "total",
        width: 20,
      },
    ];

    formatHeader(sheet);

    const statistics = await getStatistics();

    statistics.detail.forEach((item) => {
      sheet.addRow({
        rank: item.final_rank,
        total: item.total,
      });
    });

    formatBorder(sheet);

    /*=====================================================
    TẠO BIỂU ĐỒ
    =====================================================*/

    const imageBuffer = await createChartBuffer();

    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: {
        col: 4,
        row: 1,
      },

      ext: {
        width: 700,
        height: 380,
      },
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="conduct-statistics.xlsx"',
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (err) {
    console.log(err);

    res.status(500).send("Không thể xuất thống kê");
  }
});

/*=========================================================
XUẤT DASHBOARD
=========================================================*/

router.get("/dashboard", async (req, res) => {
  try {
    const dashboard = await getDashboard();

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet("Dashboard");

    sheet.columns = [
      {
        header: "Thông tin",
        key: "title",
        width: 35,
      },
      {
        header: "Giá trị",
        key: "value",
        width: 20,
      },
    ];

    formatHeader(sheet);

    sheet.addRow({
      title: "Tổng số sinh viên",
      value: dashboard.students,
    });

    sheet.addRow({
      title: "Tổng số giảng viên",
      value: dashboard.teachers,
    });

    sheet.addRow({
      title: "Tổng số đợt đánh giá",
      value: dashboard.periods,
    });

    sheet.addRow({
      title: "Tổng số phiếu đánh giá",
      value: dashboard.results,
    });

    formatBorder(sheet);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="conduct-dashboard.xlsx"',
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (err) {
    console.log(err);

    res.status(500).send("Không thể xuất Dashboard");
  }
});
/*=========================================================
XUẤT BÁO CÁO TỔNG HỢP
=========================================================*/

router.get("/report", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();

    /*=====================================================
    SHEET 1 - KẾT QUẢ
    =====================================================*/

    const resultSheet = workbook.addWorksheet("Kết quả");

    resultSheet.columns = [
      { header: "STT", key: "stt", width: 8 },
      { header: "MSSV", key: "masv", width: 18 },
      { header: "Họ tên", key: "hoten", width: 35 },
      { header: "Lớp", key: "lop", width: 15 },
      { header: "Niên khóa", key: "nienkhoa", width: 15 },
      { header: "Học kỳ", key: "hocky", width: 12 },
      { header: "Năm học", key: "namhoc", width: 18 },
      { header: "Điểm", key: "diem", width: 12 },
      { header: "Xếp loại", key: "xeploai", width: 20 },
    ];

    formatHeader(resultSheet);

    const results = await getExportData();

    results.forEach((item, index) => {
      resultSheet.addRow({
        stt: index + 1,
        masv: item.masv,
        hoten: item.hoten,
        lop: item.lop,
        nienkhoa: item.nienkhoa,
        hocky: item.hoc_ky,
        namhoc: item.nam_hoc,
        diem: item.final_total,
        xeploai: item.final_rank,
      });
    });

    formatBorder(resultSheet);

    /*=====================================================
    SHEET 2 - DASHBOARD
    =====================================================*/

    const dashboardSheet = workbook.addWorksheet("Dashboard");

    dashboardSheet.columns = [
      {
        header: "Thông tin",
        key: "title",
        width: 35,
      },
      {
        header: "Giá trị",
        key: "value",
        width: 20,
      },
    ];

    formatHeader(dashboardSheet);

    const dashboard = await getDashboard();

    dashboardSheet.addRow({
      title: "Tổng số sinh viên",
      value: dashboard.students,
    });

    dashboardSheet.addRow({
      title: "Tổng số giảng viên",
      value: dashboard.teachers,
    });

    dashboardSheet.addRow({
      title: "Tổng số đợt đánh giá",
      value: dashboard.periods,
    });

    dashboardSheet.addRow({
      title: "Tổng số phiếu đánh giá",
      value: dashboard.results,
    });

    formatBorder(dashboardSheet);

    /*=====================================================
    SHEET 3 - THỐNG KÊ
    =====================================================*/

    const statisticsSheet = workbook.addWorksheet("Thống kê");

    statisticsSheet.columns = [
      {
        header: "Xếp loại",
        key: "rank",
        width: 25,
      },
      {
        header: "Số lượng",
        key: "total",
        width: 20,
      },
    ];

    formatHeader(statisticsSheet);

    const statistics = await getStatistics();

    statistics.detail.forEach((item) => {
      statisticsSheet.addRow({
        rank: item.final_rank,
        total: item.total,
      });
    });

    formatBorder(statisticsSheet);

    /*=====================================================
    BIỂU ĐỒ CỘT
    =====================================================*/

    const imageBuffer = await createChartBuffer();

    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: "png",
    });

    statisticsSheet.addImage(imageId, {
      tl: {
        col: 4,
        row: 1,
      },
      ext: {
        width: 720,
        height: 380,
      },
    });

    /*=====================================================
    THUỘC TÍNH FILE
    =====================================================*/

    workbook.creator = "QLSV";

    workbook.company = "VNUA";

    workbook.created = new Date();

    /*=====================================================
    DOWNLOAD
    =====================================================*/

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="conduct-report.xlsx"',
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (err) {
    console.log(err);

    res.status(500).send("Không thể xuất báo cáo");
  }
});

/*=========================================================
EXPORT
=========================================================*/

module.exports = router;
