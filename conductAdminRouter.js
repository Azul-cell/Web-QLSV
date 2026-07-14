const express = require("express");

const router = express.Router();

const db = require("../config/db");

const {
  getDashboard,

  getAllResults,

  getResultDetail,

  resetResult,

  getStatistics,

  getChartData,

  getClassStatistics,

  getTopStudents,

  getExportData,

  getSummary,
} = require("../helpers/conductHelper");

const {
  getCurrentPeriod,

  getAllPeriods,
} = require("../helpers/conductPeriod");

/*=========================================================
DASHBOARD
=========================================================*/

router.get("/dashboard", async (req, res) => {
  try {
    const dashboard = await getDashboard();

    res.json({
      success: true,

      data: dashboard,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,

      message: "Không thể tải Dashboard",
    });
  }
});

/*=========================================================
TỔNG HỢP DASHBOARD
=========================================================*/

router.get("/summary", async (req, res) => {
  try {
    const summary = await getSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
      message: "Không thể tải dữ liệu",
    });
  }
});

router.get("/summary/:periodId", async (req, res) => {
  try {
    const summary = await getSummary(req.params.periodId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
      message: "Không thể tải dữ liệu",
    });
  }
});
/*=========================================================
DANH SÁCH KẾT QUẢ ĐIỂM RÈN LUYỆN
=========================================================*/

router.get("/results", async (req, res) => {
  try {
    const { periodId } = req.query;

    const results = await getAllResults(periodId || null);

    res.json({
      success: true,

      total: results.length,

      data: results,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,

      message: "Không thể tải danh sách kết quả",
    });
  }
});

/*=========================================================
CHI TIẾT PHIẾU
=========================================================*/

router.get("/detail/:resultId", async (req, res) => {
  const { resultId } = req.params;

  if (!resultId) {
    return res.json({
      success: false,

      message: "Thiếu resultId",
    });
  }

  try {
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
  } catch (err) {
    console.log(err);

    res.json({
      success: false,

      message: "Lỗi hệ thống",
    });
  }
});

/*=========================================================
RESET PHIẾU
=========================================================*/

router.post("/reset", async (req, res) => {
  const { resultId } = req.body;

  if (!resultId) {
    return res.json({
      success: false,

      message: "Thiếu resultId",
    });
  }

  try {
    await resetResult(resultId);

    res.json({
      success: true,

      message: "Đặt lại phiếu thành công",
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,

      message: "Không thể đặt lại phiếu",
    });
  }
});
/*=========================================================
THỐNG KÊ XẾP LOẠI
=========================================================*/

router.get("/statistics", async (req, res) => {
  try {
    const data = await getStatistics();

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
    });
  }
});

router.get("/statistics/:periodId", async (req, res) => {
  try {
    const data = await getStatistics(req.params.periodId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
    });
  }
});

/*=========================================================
DỮ LIỆU BIỂU ĐỒ
=========================================================*/

router.get("/chart", async (req, res) => {
  try {
    const data = await getChartData();

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
    });
  }
});

router.get("/chart/:periodId", async (req, res) => {
  try {
    const data = await getChartData(req.params.periodId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
    });
  }
});
/*=========================================================
THỐNG KÊ THEO LỚP
=========================================================*/

router.get("/classes", async (req, res) => {
  try {
    const data = await getClassStatistics();

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
    });
  }
});

router.get("/classes/:periodId", async (req, res) => {
  try {
    const data = await getClassStatistics(req.params.periodId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
    });
  }
});
/*=========================================================
TOP SINH VIÊN
=========================================================*/

router.get("/top", async (req, res) => {
  try {
    const data = await getTopStudents();

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
    });
  }
});

router.get("/top/:periodId", async (req, res) => {
  try {
    const data = await getTopStudents(req.params.periodId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
    });
  }
});
/*=========================================================
XUẤT EXCEL
=========================================================*/

router.get("/export", async (req, res) => {
  try {
    const data = await getExportData();

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
    });
  }
});

router.get("/export/:periodId", async (req, res) => {
  try {
    const data = await getExportData(req.params.periodId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
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

      total: periods.length,

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
THÔNG TIN MỘT ĐỢT
=========================================================*/

router.get("/period/:id", (req, res) => {
  const { id } = req.params;

  db.query(
    `
    SELECT *

    FROM conduct_periods

    WHERE id=?

    LIMIT 1
    `,
    [id],
    (err, result) => {
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

          message: "Không tìm thấy đợt đánh giá",
        });
      }

      res.json({
        success: true,

        data: result[0],
      });
    },
  );
});
/*=========================================================
XÓA ĐỢT ĐÁNH GIÁ
=========================================================*/

router.delete("/period/:id", (req, res) => {
  const periodId = req.params.id;

  db.beginTransaction((err) => {
    if (err) {
      return res.json({
        success: false,

        message: "Lỗi hệ thống",
      });
    }

    db.query(
      `

            DELETE ca

            FROM conduct_answers ca

            JOIN conduct_results cr

            ON ca.result_id=cr.id

            WHERE cr.period_id=?

            `,

      [periodId],

      (err) => {
        if (err) {
          return db.rollback(() => {
            res.json({
              success: false,

              message: "Không xóa được câu trả lời",
            });
          });
        }

        db.query(
          `

                    DELETE

                    FROM conduct_results

                    WHERE period_id=?

                    `,

          [periodId],

          (err) => {
            if (err) {
              return db.rollback(() => {
                res.json({
                  success: false,

                  message: "Không xóa được kết quả",
                });
              });
            }

            db.query(
              `

                            DELETE

                            FROM conduct_periods

                            WHERE id=?

                            `,

              [periodId],

              (err) => {
                if (err) {
                  return db.rollback(() => {
                    res.json({
                      success: false,

                      message: "Không xóa được đợt",
                    });
                  });
                }

                db.commit((err) => {
                  if (err) {
                    return db.rollback(() => {
                      res.json({
                        success: false,

                        message: "Lỗi commit",
                      });
                    });
                  }

                  res.json({
                    success: true,

                    message: "Đã xóa đợt đánh giá.",
                  });
                });
              },
            );
          },
        );
      },
    );
  });
});
/*=========================================================
EXPORT
=========================================================*/

module.exports = router;
