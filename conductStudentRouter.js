const express = require("express");

const router = express.Router();

const db = require("../config/db");

const { getOrCreateResult, getAnswers } = require("../helpers/conductHelper");

/*=========================================================
MỞ PHIẾU ĐÁNH GIÁ
=========================================================*/

router.post("/form", async (req, res) => {
  try {
    const { studentId, periodId } = req.body;

    if (!studentId || !periodId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin",
      });
    }

    /*-----------------------------------------------------
    KIỂM TRA ĐỢT ĐÁNH GIÁ
    -----------------------------------------------------*/

    db.query(
      `
      SELECT *

      FROM conduct_periods

      WHERE

          id=?

      LIMIT 1
      `,
      [periodId],
      async (err, periodResult) => {
        if (err) {
          console.log(err);

          return res.status(500).json({
            success: false,
            message: "Lỗi hệ thống",
          });
        }

        if (periodResult.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Không tìm thấy đợt đánh giá",
          });
        }

        const period = periodResult[0];

        /*-----------------------------------------------------
        KIỂM TRA ĐỢT ĐANG MỞ
        -----------------------------------------------------*/

        if (period.is_open == 0) {
          return res.json({
            success: false,
            message: "Đợt đánh giá chưa mở",
          });
        }

        if (period.is_locked == 1) {
          return res.json({
            success: false,
            message: "Đợt đánh giá đã khóa",
          });
        }

        /*-----------------------------------------------------
        LẤY HOẶC TẠO PHIẾU
        -----------------------------------------------------*/

        const result = await getOrCreateResult(studentId, periodId);

        /*-----------------------------------------------------
        LẤY DANH SÁCH TIÊU CHÍ
        -----------------------------------------------------*/

        const answers = await getAnswers(result.id);

        /*-----------------------------------------------------
        TRẢ VỀ
        -----------------------------------------------------*/

        res.json({
          success: true,

          period,

          result,

          answers,
        });
      },
    );
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
    });
  }
});

/*=========================================================
CHI TIẾT PHIẾU
=========================================================*/

router.get("/detail/:resultId", (req, res) => {
  const { resultId } = req.params;

  db.query(
    `
    SELECT *

    FROM conduct_results

    WHERE id=?

    LIMIT 1
    `,
    [resultId],
    (err, result) => {
      if (err) {
        console.log(err);

        return res.status(500).json({
          success: false,
          message: "Lỗi hệ thống",
        });
      }

      if (result.length === 0) {
        return res.json({
          success: false,
          message: "Không tìm thấy phiếu",
        });
      }

      db.query(
        `
        SELECT

            c.id,

            c.group_name,

            c.title,

            c.score,

            c.choice_group,

            c.need_proof,

            c.sort_order,

            IFNULL(a.checked,0) checked,

            a.proof,

            a.leader_checked,

            a.teacher_score,

            a.teacher_note

        FROM conduct_criteria c

        LEFT JOIN conduct_answers a

        ON

            a.criteria_id=c.id

        AND

            a.result_id=?

        ORDER BY

            c.group_name,

            c.sort_order,

            c.id
        `,
        [resultId],
        (err, answers) => {
          if (err) {
            console.log(err);

            return res.status(500).json({
              success: false,
              message: "Lỗi hệ thống",
            });
          }

          res.json({
            success: true,

            result: result[0],

            answers,
          });
        },
      );
    },
  );
});
/*=========================================================
LƯU PHIẾU SINH VIÊN
=========================================================*/

router.post("/save", async (req, res) => {
  try {
    const { studentId, periodId, answers } = req.body;

    if (!studentId || !periodId) {
      return res.json({
        success: false,
        message: "Thiếu thông tin",
      });
    }

    if (!Array.isArray(answers)) {
      return res.json({
        success: false,
        message: "Dữ liệu không hợp lệ",
      });
    }

    /*-------------------------------------------------------
    LẤY KẾT QUẢ
    -------------------------------------------------------*/

    const result = await getOrCreateResult(studentId, periodId);

    const resultId = result.id;

    /*-------------------------------------------------------
    XÓA TOÀN BỘ CÂU TRẢ LỜI CŨ
    -------------------------------------------------------*/

    db.query(
      `
      DELETE

      FROM conduct_answers

      WHERE result_id=?
      `,
      [resultId],
      async (err) => {
        if (err) {
          console.log(err);

          return res.json({
            success: false,
            message: "Không thể lưu phiếu",
          });
        }

        let totalScore = 0;

        /*-------------------------------------------------------
        LƯU LẠI
        -------------------------------------------------------*/

        for (const item of answers) {
          await new Promise((resolve, reject) => {
            db.query(
              `
              INSERT INTO conduct_answers
(
    result_id,
    criteria_id,

    checked,

    proof,

    proof_type,

    proof_text,

    leader_checked,

    teacher_score,

    teacher_note
)
VALUES
(
    ?,?,
    ?,?,
    ?,?,
    NULL,
    NULL,
    ''
)
              `,
              [
                resultId,

                item.criteriaId,

                item.checked ? 1 : 0,

                item.proof || "",

                item.proofType || "text",

                item.proofText || "",
              ],
              (err) => {
                if (err) {
                  return reject(err);
                }

                resolve(true);
              },
            );
          });

          if (item.checked) {
            totalScore += Number(item.score || 0);
          }
        }

        /*-------------------------------------------------------
        CẬP NHẬT ĐIỂM
        -------------------------------------------------------*/

        const finalScore = totalScore;

        db.query(
          `
  UPDATE conduct_results

  SET

      student_score=?,

      final_score=?,



      updated_at=NOW()

  WHERE id=?
  `,
          [totalScore, finalScore, resultId],
          (err) => {
            if (err) {
              console.log(err);

              return res.json({
                success: false,
                message: "Không thể cập nhật điểm",
              });
            }

            res.json({
              success: true,

              message: "Lưu phiếu thành công",

              resultId,

              totalScore,
            });
          },
        );
      },
    );
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
      message: "Lỗi hệ thống",
    });
  }
});
/*=========================================================
SINH VIÊN NỘP PHIẾU
=========================================================*/

router.post("/submit", (req, res) => {
  const { studentId, periodId } = req.body;

  if (!studentId || !periodId) {
    return res.json({
      success: false,
      message: "Thiếu thông tin",
    });
  }

  /*-------------------------------------------------------
  KIỂM TRA PHIẾU
  -------------------------------------------------------*/

  db.query(
    `
    SELECT *

    FROM conduct_results

    WHERE

        student_id=?

    AND period_id=?

    LIMIT 1
    `,
    [studentId, periodId],
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
          message: "Chưa có phiếu đánh giá",
        });
      }

      const conductResult = result[0];

      /*-------------------------------------------------------
      ĐÃ NỘP
      -------------------------------------------------------*/

      if (conductResult.status !== "draft") {
        return res.json({
          success: false,
          message: "Phiếu đã được nộp",
        });
      }

      /*-------------------------------------------------------
      KIỂM TRA ĐÃ CHỌN ÍT NHẤT 1 TIÊU CHÍ
      -------------------------------------------------------*/

      db.query(
        `
        SELECT COUNT(*) total

        FROM conduct_answers

        WHERE

            result_id=?

        AND checked=1
        `,
        [conductResult.id],
        (err, answerResult) => {
          if (err) {
            console.log(err);

            return res.json({
              success: false,
              message: "Lỗi hệ thống",
            });
          }

          if (answerResult[0].total === 0) {
            return res.json({
              success: false,
              message: "Bạn chưa chọn tiêu chí nào",
            });
          }

          /*-------------------------------------------------------
          CẬP NHẬT TRẠNG THÁI
          -------------------------------------------------------*/

          db.query(
            `
            UPDATE conduct_results

            SET

                status='submitted',

                updated_at=NOW()

            WHERE id=?
            `,
            [conductResult.id],
            (err) => {
              if (err) {
                console.log(err);

                return res.json({
                  success: false,
                  message: "Không thể nộp phiếu",
                });
              }

              res.json({
                success: true,
                message: "Nộp phiếu thành công",
              });
            },
          );
        },
      );
    },
  );
});
/*=========================================================
LỊCH SỬ ĐÁNH GIÁ
=========================================================*/

router.get("/history/:studentId", (req, res) => {
  const { studentId } = req.params;

  db.query(
    `
    SELECT

        cr.id,

        cp.hoc_ky,

        cp.nam_hoc,

        cr.student_score,

        cr.leader_score,

        cr.teacher_score,

        cr.final_score,

        cr.status,

        cr.leader_note,

        cr.teacher_note

    FROM conduct_results cr

    JOIN conduct_periods cp

        ON cp.id=cr.period_id

    WHERE

        cr.student_id=?

    ORDER BY

        cp.nam_hoc DESC,

        cp.hoc_ky DESC
    `,
    [studentId],
    (err, result) => {
      if (err) {
        console.log(err);

        return res.json({
          success: false,
          message: "Lỗi hệ thống",
        });
      }

      result.forEach((item) => {
        if (item.final_score >= 90) {
          item.rank = "Xuất sắc";
        } else if (item.final_score >= 80) {
          item.rank = "Tốt";
        } else if (item.final_score >= 65) {
          item.rank = "Khá";
        } else if (item.final_score >= 50) {
          item.rank = "Trung bình";
        } else {
          item.rank = "Yếu";
        }
      });

      res.json({
        success: true,
        data: result,
      });
    },
  );
});
/*=========================================================
EXPORT
=========================================================*/

module.exports = router;
