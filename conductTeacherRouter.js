const express = require("express");

const XLSX = require("xlsx");

const ExcelJS = require("exceljs");

const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const router = express.Router();

const db = require("../config/db");

const {
  getResultDetail,
  saveTeacherForm,
  submitTeacher,
  getStatistics,
  getExportData,
} = require("../helpers/conductHelper");

const { getCurrentPeriod, getAllPeriods } = require("../helpers/conductPeriod");

/*=========================================================
DANH SÁCH SINH VIÊN GIẢNG VIÊN PHỤ TRÁCH
=========================================================*/

router.get("/students/:teacherId/:periodId", (req, res) => {
  const { teacherId, periodId } = req.params;

  if (!teacherId || !periodId) {
    return res.json({
      success: false,
      message: "Thiếu dữ liệu",
    });
  }

  const sql = `
    SELECT

        cr.id AS result_id,

        s.id AS student_id,

        s.masv,

        u.hoten,

        c.id AS class_id,

        c.malop,

        c.tenlop,

        cr.student_score,

        cr.leader_score,

        cr.teacher_score,

        cr.final_score,

        cr.status,

        cr.created_at

    FROM classes c

    INNER JOIN teachers t
        ON t.id = c.teacher_id

    INNER JOIN class_students cs
        ON cs.class_id = c.id

    INNER JOIN students s
        ON s.id = cs.student_id

    INNER JOIN users u
        ON u.id = s.user_id

    LEFT JOIN conduct_results cr
        ON

            cr.student_id = s.id

        AND

            cr.period_id = ?

    WHERE

        t.id = ?

    ORDER BY

        c.malop ASC,

        u.hoten ASC
  `;

  db.query(sql, [periodId, teacherId], (err, result) => {
    if (err) {
      console.log(err);

      return res.json({
        success: false,
        message: "Lỗi hệ thống",
      });
    }

    const data = result.map((item) => ({
      result_id: item.result_id,

      student_id: item.student_id,

      masv: item.masv,

      hoten: item.hoten,

      class_id: item.class_id,

      malop: item.malop,

      tenlop: item.tenlop,

      student_score: item.student_score || 0,

      leader_score: item.leader_score || 0,

      teacher_score: item.teacher_score || 0,

      final_score: item.final_score || 0,

      status: item.status || "Chưa tạo phiếu",

      created_at: item.created_at,
    }));

    res.json({
      success: true,

      total: data.length,

      data,
    });
  });
});
/*=========================================================
CHI TIẾT PHIẾU SINH VIÊN
Giảng viên chỉ xem sinh viên thuộc lớp mình phụ trách
=========================================================*/

router.get("/detail/:teacherId/:resultId", async (req, res) => {
  const { teacherId, resultId } = req.params;

  if (!teacherId || !resultId) {
    return res.json({
      success: false,
      message: "Thiếu dữ liệu",
    });
  }

  try {
    /*-------------------------------------------------------
    KIỂM TRA QUYỀN
    -------------------------------------------------------*/

    const checkSql = `
      SELECT

          cr.id

      FROM conduct_results cr

      JOIN students s
        ON s.id=cr.student_id

      JOIN class_students cs
        ON cs.student_id=s.id

      JOIN classes c
        ON c.id=cs.class_id

      JOIN teachers t
        ON t.id=c.teacher_id

      WHERE

          cr.id=?

      AND

          t.id=?

      LIMIT 1
    `;

    db.query(checkSql, [resultId, teacherId], async (err, rows) => {
      if (err) {
        console.log(err);

        return res.json({
          success: false,
          message: "Lỗi hệ thống",
        });
      }

      if (rows.length === 0) {
        return res.json({
          success: false,
          message: "Bạn không có quyền xem phiếu này",
        });
      }

      const detail = await getResultDetail(resultId);

      if (!detail) {
        return res.json({
          success: false,
          message: "Không tìm thấy phiếu",
        });
      }

      res.json({
        success: true,

        result: detail.result,

        answers: detail.answers,
      });
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
      message: "Lỗi hệ thống",
    });
  }
});
/*=========================================================
GIẢNG VIÊN LƯU ĐÁNH GIÁ
=========================================================*/

router.post("/save", async (req, res) => {
  const { resultId, answers, teacherComment } = req.body;

  if (!resultId) {
    return res.json({
      success: false,
      message: "Thiếu resultId",
    });
  }

  if (!Array.isArray(answers)) {
    return res.json({
      success: false,
      message: "Thiếu dữ liệu đánh giá",
    });
  }

  try {
    const summary = await saveTeacherForm(resultId, answers, teacherComment);

    res.json({
      success: true,

      totalScore: summary.score,

      rank: summary.rank,

      message: "Lưu đánh giá thành công",
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
      message: "Không thể lưu đánh giá",
    });
  }
});

/*=========================================================
GIẢNG VIÊN DUYỆT PHIẾU
=========================================================*/

router.post("/submit", async (req, res) => {
  const { resultId } = req.body;

  if (!resultId) {
    return res.json({
      success: false,
      message: "Thiếu resultId",
    });
  }

  try {
    await submitTeacher(resultId);

    res.json({
      success: true,
      message: "Duyệt phiếu thành công",
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
      message: "Không thể duyệt phiếu",
    });
  }
});
/*=========================================================
GIẢNG VIÊN DASHBOARD
=========================================================*/

router.get("/dashboard/:teacherId/:periodId", (req, res) => {
  const { teacherId, periodId } = req.params;

  const sql = `
    SELECT

        COUNT(*) total,

        SUM(
            CASE
                WHEN cr.status='submitted'
                THEN 1
                ELSE 0
            END
        ) submitted,

        SUM(
            CASE
                WHEN cr.status='leader_checked'
                THEN 1
                ELSE 0
            END
        ) leader_checked,

        SUM(
            CASE
                WHEN cr.status='teacher_checked'
                THEN 1
                ELSE 0
            END
        ) teacher_checked

    FROM classes c

    JOIN teachers t
        ON t.id=c.teacher_id

    JOIN class_students cs
        ON cs.class_id=c.id

    JOIN students s
        ON s.id=cs.student_id

    LEFT JOIN conduct_results cr
        ON

            cr.student_id=s.id

        AND

            cr.period_id=?

    WHERE

        t.id=?
  `;

  db.query(sql, [periodId, teacherId], (err, result) => {
    if (err) {
      console.log(err);

      return res.json({
        success: false,
        message: "Lỗi hệ thống",
      });
    }

    res.json({
      success: true,
      data: result[0],
    });
  });
});

/*=========================================================
THỐNG KÊ BIỂU ĐỒ
=========================================================*/

router.get("/chart/:periodId", async (req, res) => {
  const { periodId } = req.params;

  try {
    const chart = await getStatistics(periodId);

    res.json({
      success: true,
      data: chart,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
      message: "Không thể lấy dữ liệu biểu đồ",
    });
  }
});

/*=========================================================
DANH SÁCH ĐỢT ĐÁNH GIÁ
=========================================================*/

router.get("/periods", async (req, res) => {
  try {
    const periods = await getAllPeriods();

    res.json({
      success: true,
      data: periods,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
      message: "Không thể tải danh sách đợt đánh giá",
    });
  }
});

/*=========================================================
ĐỢT ĐANG MỞ
=========================================================*/

router.get("/current-period", async (req, res) => {
  try {
    const period = await getCurrentPeriod();

    res.json({
      success: true,
      data: period,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
      message: "Không thể tải đợt đánh giá",
    });
  }
});

/*=========================================================
THÔNG TIN SINH VIÊN
=========================================================*/

router.get("/student/:studentId", (req, res) => {
  const { studentId } = req.params;

  const sql = `
    SELECT

        s.id,

        s.masv,

        s.nienkhoa,

        s.chuyennganh,

        u.hoten,

        u.email,

        u.sodienthoai,

        c.id class_id,

        c.malop,

        c.tenlop

    FROM students s

    JOIN users u
        ON u.id=s.user_id

    LEFT JOIN class_students cs
        ON cs.student_id=s.id

    LEFT JOIN classes c
        ON c.id=cs.class_id

    WHERE s.id=?

    LIMIT 1
  `;

  db.query(sql, [studentId], (err, result) => {
    if (err) {
      console.log(err);

      return res.json({
        success: false,
        message: "Lỗi hệ thống",
      });
    }

    if (result.length === 0) {
      return res.json({
        success: false,
        message: "Không tìm thấy sinh viên",
      });
    }

    res.json({
      success: true,
      data: result[0],
    });
  });
});
/*=========================================================
EXPORT EXCEL
=========================================================*/

router.get("/export/:periodId", async (req, res) => {
  try {
    const periodId = Number(req.params.periodId);

    const list = await getExportData(periodId);

    const statistics = await getStatistics(periodId);

    const chartBuffer = await createChart(statistics);

    const workbook = new ExcelJS.Workbook();

    const imageId = workbook.addImage({
      buffer: chartBuffer,

      extension: "png",
    });

    workbook.creator = "Conduct Management";

    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Điểm rèn luyện");

    sheet.mergeCells("A1:L1");

    sheet.getCell("A1").value = "BẢNG ĐIỂM RÈN LUYỆN SINH VIÊN";

    sheet.getCell("A1").font = {
      bold: true,
      size: 18,
    };

    sheet.getCell("A1").alignment = {
      horizontal: "center",
    };

    sheet.mergeCells("A2:L2");

    sheet.getCell("A2").value =
      `Học kỳ ${list[0]?.hoc_ky || ""} - Năm học ${list[0]?.nam_hoc || ""}`;

    sheet.getCell("A2").alignment = {
      horizontal: "center",
    };

    /*=========================================================
HEADER
=========================================================*/

    sheet.columns = [
      { key: "stt", width: 8 },

      { key: "masv", width: 15 },

      { key: "hoten", width: 30 },

      { key: "tenlop", width: 18 },

      { key: "hoc_ky", width: 10 },

      { key: "nam_hoc", width: 15 },

      { key: "student_score", width: 12 },

      { key: "leader_score", width: 12 },

      { key: "teacher_score", width: 12 },

      { key: "final_score", width: 12 },

      { key: "xep_loai", width: 15 },

      { key: "status", width: 18 },
    ];
    /*=========================================================
HEADER TABLE
=========================================================*/

    sheet.addRow([]);

    sheet.addRow([]);

    sheet.addRow([
      "STT",
      "MSSV",
      "Họ tên",
      "Lớp",
      "Học kỳ",
      "Năm học",
      "Điểm SV",
      "Điểm LT",
      "Điểm GV",
      "Điểm cuối",
      "Xếp loại",
      "Trạng thái",
    ]);

    sheet.getRow(4).font = {
      bold: true,
    };

    sheet.getRow(4).alignment = {
      horizontal: "center",

      vertical: "middle",
    };

    sheet.getRow(4).fill = {
      type: "pattern",

      pattern: "solid",

      fgColor: {
        argb: "D9EAD3",
      },
    };

    list.forEach((item, index) => {
      sheet.addRow({
        stt: index + 1,

        masv: item.masv,

        hoten: item.hoten,

        tenlop: item.tenlop,

        hoc_ky: item.hoc_ky,

        nam_hoc: item.nam_hoc,

        student_score: item.student_score,

        leader_score: item.leader_score,

        teacher_score: item.teacher_score,

        final_score: item.final_score,

        xep_loai: item.xep_loai,

        status: item.status,
      });
    });
    /*=========================================================
BORDER
=========================================================*/

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
      });
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 4) return;

      const score = Number(row.getCell(10).value);

      if (score >= 90) {
        row.getCell(10).fill = {
          type: "pattern",

          pattern: "solid",

          fgColor: { argb: "92D050" },
        };
      } else if (score >= 80) {
        row.getCell(10).fill = {
          type: "pattern",

          pattern: "solid",

          fgColor: { argb: "C6EFCE" },
        };
      } else if (score >= 65) {
        row.getCell(10).fill = {
          type: "pattern",

          pattern: "solid",

          fgColor: { argb: "FFF2CC" },
        };
      }
    });

    /*=========================================================
ĐỊNH DẠNG HEADER BẢNG
=========================================================*/

    const headerRow = sheet.getRow(4);

    headerRow.height = 28;

    headerRow.font = {
      bold: true,
      color: {
        argb: "FFFFFF",
      },
    };

    headerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "4F81BD",
      },
    };

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    const statSheet = workbook.addWorksheet("Thống kê");

    /*=========================================================
SHEET BIỂU ĐỒ
=========================================================*/

    const chartSheet = workbook.addWorksheet("Biểu đồ");

    chartSheet.mergeCells("A1:H1");

    chartSheet.getCell("A1").value = "BIỂU ĐỒ THỐNG KÊ ĐIỂM RÈN LUYỆN";

    chartSheet.getCell("A1").font = {
      bold: true,
      size: 18,
      color: {
        argb: "1F4E78",
      },
    };

    chartSheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    chartSheet.getRow(1).height = 28;

    /*=========================================================
CHÈN BIỂU ĐỒ
=========================================================*/

    chartSheet.addImage(imageId, {
      tl: {
        col: 0,
        row: 2,
      },

      ext: {
        width: 760,

        height: 430,
      },
    });

    statSheet.columns = [
      {
        header: "Xếp loại",

        key: "rank",

        width: 20,
      },

      {
        header: "Số lượng",

        key: "total",

        width: 15,
      },
    ];

    statistics.detail.forEach((item) => {
      statSheet.addRow({
        rank: item.conduct_rank,

        total: item.total,
      });
    });

    statSheet.getRow(1).font = {
      bold: true,
    };

    statSheet.eachRow((row) => {
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
      });
    });

    statSheet.getRow(1).font = {
      bold: true,
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="DiemRenLuyen.xlsx"',
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,

      message: "Không thể xuất Excel",
    });
  }
});

/*=========================================================
CREATE CHART IMAGE
=========================================================*/

async function createChart(statistics) {
  const width = 800;

  const height = 500;

  const canvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
  });

  const configuration = {
    type: "bar",

    data: {
      labels: statistics.labels,

      datasets: [
        {
          label: "Số sinh viên",

          data: statistics.values,

          backgroundColor: [
            "#22c55e",

            "#3b82f6",

            "#f59e0b",

            "#ef4444",

            "#6b7280",
          ],
        },
      ],
    },

    options: {
      responsive: false,

      plugins: {
        legend: {
          display: false,
        },
      },

      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  };

  return await canvas.renderToBuffer(configuration);
}
/*=========================================================
EXPORT EXCEL
=========================================================*/

router.get("/export/:periodId", async (req, res) => {
  try {
    const periodId = Number(req.params.periodId);

    const list = await getExportData(periodId);

    const statistics = await getStatistics(periodId);

    const chartBuffer = await createChart(statistics);

    const workbook = new ExcelJS.Workbook();

    const imageId = workbook.addImage({
      buffer: chartBuffer,

      extension: "png",
    });

    workbook.creator = "Conduct Management";

    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Điểm rèn luyện");

    sheet.mergeCells("A1:L1");

    sheet.getCell("A1").value = "BẢNG ĐIỂM RÈN LUYỆN SINH VIÊN";

    sheet.getCell("A1").font = {
      bold: true,
      size: 18,
    };

    sheet.getCell("A1").alignment = {
      horizontal: "center",
    };

    sheet.mergeCells("A2:L2");

    sheet.getCell("A2").value =
      `Học kỳ ${list[0]?.hoc_ky || ""} - Năm học ${list[0]?.nam_hoc || ""}`;

    sheet.getCell("A2").alignment = {
      horizontal: "center",
    };

    /*=========================================================
HEADER
=========================================================*/

    sheet.columns = [
      { key: "stt", width: 8 },

      { key: "masv", width: 15 },

      { key: "hoten", width: 30 },

      { key: "tenlop", width: 18 },

      { key: "hoc_ky", width: 10 },

      { key: "nam_hoc", width: 15 },

      { key: "student_score", width: 12 },

      { key: "leader_score", width: 12 },

      { key: "teacher_score", width: 12 },

      { key: "final_score", width: 12 },

      { key: "xep_loai", width: 15 },

      { key: "status", width: 18 },
    ];
    /*=========================================================
HEADER TABLE
=========================================================*/

    sheet.addRow([]);

    sheet.addRow([]);

    sheet.addRow([
      "STT",
      "MSSV",
      "Họ tên",
      "Lớp",
      "Học kỳ",
      "Năm học",
      "Điểm SV",
      "Điểm LT",
      "Điểm GV",
      "Điểm cuối",
      "Xếp loại",
      "Trạng thái",
    ]);

    sheet.getRow(4).font = {
      bold: true,
    };

    sheet.getRow(4).alignment = {
      horizontal: "center",

      vertical: "middle",
    };

    sheet.getRow(4).fill = {
      type: "pattern",

      pattern: "solid",

      fgColor: {
        argb: "D9EAD3",
      },
    };

    list.forEach((item, index) => {
      sheet.addRow({
        stt: index + 1,

        masv: item.masv,

        hoten: item.hoten,

        tenlop: item.tenlop,

        hoc_ky: item.hoc_ky,

        nam_hoc: item.nam_hoc,

        student_score: item.student_score,

        leader_score: item.leader_score,

        teacher_score: item.teacher_score,

        final_score: item.final_score,

        xep_loai: item.xep_loai,

        status: item.status,
      });
    });
    /*=========================================================
BORDER
=========================================================*/

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
      });
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 4) return;

      const score = Number(row.getCell(10).value);

      if (score >= 90) {
        row.getCell(10).fill = {
          type: "pattern",

          pattern: "solid",

          fgColor: { argb: "92D050" },
        };
      } else if (score >= 80) {
        row.getCell(10).fill = {
          type: "pattern",

          pattern: "solid",

          fgColor: { argb: "C6EFCE" },
        };
      } else if (score >= 65) {
        row.getCell(10).fill = {
          type: "pattern",

          pattern: "solid",

          fgColor: { argb: "FFF2CC" },
        };
      }
    });

    /*=========================================================
ĐỊNH DẠNG HEADER BẢNG
=========================================================*/

    const headerRow = sheet.getRow(4);

    headerRow.height = 28;

    headerRow.font = {
      bold: true,
      color: {
        argb: "FFFFFF",
      },
    };

    headerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "4F81BD",
      },
    };

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    const statSheet = workbook.addWorksheet("Thống kê");

    /*=========================================================
SHEET BIỂU ĐỒ
=========================================================*/

    const chartSheet = workbook.addWorksheet("Biểu đồ");

    chartSheet.mergeCells("A1:H1");

    chartSheet.getCell("A1").value = "BIỂU ĐỒ THỐNG KÊ ĐIỂM RÈN LUYỆN";

    chartSheet.getCell("A1").font = {
      bold: true,
      size: 18,
      color: {
        argb: "1F4E78",
      },
    };

    chartSheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    chartSheet.getRow(1).height = 28;

    /*=========================================================
CHÈN BIỂU ĐỒ
=========================================================*/

    chartSheet.addImage(imageId, {
      tl: {
        col: 0,
        row: 2,
      },

      ext: {
        width: 760,

        height: 430,
      },
    });

    statSheet.columns = [
      {
        header: "Xếp loại",

        key: "rank",

        width: 20,
      },

      {
        header: "Số lượng",

        key: "total",

        width: 15,
      },
    ];

    statistics.detail.forEach((item) => {
      statSheet.addRow({
        rank: item.conduct_rank,

        total: item.total,
      });
    });

    statSheet.getRow(1).font = {
      bold: true,
    };

    statSheet.eachRow((row) => {
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
      });
    });

    statSheet.getRow(1).font = {
      bold: true,
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="DiemRenLuyen.xlsx"',
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,

      message: "Không thể xuất Excel",
    });
  }
});

/*=========================================================
CREATE CHART IMAGE
=========================================================*/

async function createChart(statistics) {
  const width = 800;

  const height = 500;

  const canvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
  });

  const configuration = {
    type: "bar",

    data: {
      labels: statistics.labels,

      datasets: [
        {
          label: "Số sinh viên",

          data: statistics.values,

          backgroundColor: [
            "#22c55e",

            "#3b82f6",

            "#f59e0b",

            "#ef4444",

            "#6b7280",
          ],
        },
      ],
    },

    options: {
      responsive: false,

      plugins: {
        legend: {
          display: false,
        },
      },

      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  };

  return await canvas.renderToBuffer(configuration);
}
/*=========================================================
EXPORT
=========================================================*/

module.exports = router;
