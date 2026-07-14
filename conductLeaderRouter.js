const express = require("express");

const router = express.Router();

const db = require("../config/db");

const {
  getResultDetail,

  saveLeaderForm,

  submitLeader,

  rejectLeader,

  resetResult,
  getStatistics,
} = require("../helpers/conductHelper");

const {
  getCurrentPeriod,

  getAllPeriods,
} = require("../helpers/conductPeriod");
/*=========================================================
DANH SÁCH SINH VIÊN CỦA LỚP TRƯỞNG
Chỉ hiển thị sinh viên cùng lớp
=========================================================*/

router.get("/students/:leaderId/:periodId", (req, res) => {
  const { leaderId, periodId } = req.params;

  if (!leaderId || !periodId) {
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

    FROM students leader

    INNER JOIN class_students csLeader
        ON csLeader.student_id = leader.id

    INNER JOIN classes c
        ON c.id = csLeader.class_id

    INNER JOIN class_students csStudent
        ON csStudent.class_id = c.id

    INNER JOIN students s
        ON s.id = csStudent.student_id

        

    INNER JOIN users u
        ON u.id = s.user_id

    LEFT JOIN conduct_results cr
        ON
            cr.student_id = s.id
        AND
            cr.period_id = ?

    WHERE

        leader.id = ?

    AND

        leader.is_class_monitor = 1

    ORDER BY

        u.hoten ASC
  `;

  db.query(sql, [periodId, leaderId], (err, result) => {
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
Lớp trưởng xem phiếu của sinh viên trong lớp mình
=========================================================*/

router.get("/detail/:leaderId/:resultId", async (req, res) => {
  const { leaderId, resultId } = req.params;

  if (!leaderId || !resultId) {
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

      JOIN students leader
        ON leader.id=?

      JOIN class_students csLeader
        ON csLeader.student_id=leader.id

      JOIN class_students csStudent
        ON csStudent.class_id=csLeader.class_id

      WHERE

          cr.id=?

      AND

          cr.student_id=csStudent.student_id

      AND

          leader.is_class_monitor=1

      LIMIT 1
    `;

    db.query(checkSql, [leaderId, resultId], async (err, rows) => {
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
LỚP TRƯỞNG LƯU DUYỆT
=========================================================*/

router.post("/save", async (req, res) => {
  const { resultId, answers, leaderComment } = req.body;

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
    const summary = await saveLeaderForm(resultId, answers, leaderComment);

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
LỚP TRƯỞNG DUYỆT PHIẾU
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
    await submitLeader(resultId);

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
LỚP TRƯỞNG TRẢ LẠI PHIẾU CHO SINH VIÊN
=========================================================*/

router.post("/reject", async (req, res) => {
  const { resultId, note } = req.body;

  if (!resultId) {
    return res.json({
      success: false,
      message: "Thiếu resultId",
    });
  }

  try {
    await rejectLeader(resultId, note || "");

    res.json({
      success: true,
      message: "Đã trả lại phiếu cho sinh viên",
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
      message: "Không thể trả lại phiếu",
    });
  }
});

/*=========================================================
LỚP TRƯỞNG XEM DANH SÁCH ĐỢT ĐÁNH GIÁ
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
LỚP TRƯỞNG XEM ĐỢT ĐANG MỞ
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
LỚP TRƯỞNG THỐNG KÊ
=========================================================*/

router.get("/dashboard/:leaderId/:periodId", (req, res) => {
  const { leaderId, periodId } = req.params;

  const sql = `
    SELECT

        COUNT(*) total,

IFNULL(SUM(
CASE
WHEN cr.status='submitted'
THEN 1
ELSE 0
END
),0) submitted,

IFNULL(SUM(
CASE
WHEN cr.status='leader_checked'
THEN 1
ELSE 0
END
),0) approved,

IFNULL(SUM(
CASE
WHEN cr.status='draft'
THEN 1
ELSE 0
END
),0) draft

    FROM students leader

    JOIN class_students csLeader
        ON csLeader.student_id=leader.id

    JOIN class_students csStudent
        ON csStudent.class_id=csLeader.class_id

    JOIN students s
        ON s.id=csStudent.student_id

    LEFT JOIN conduct_results cr
        ON

            cr.student_id=s.id

        AND

            cr.period_id=?

    WHERE

        leader.id=?

    AND

        leader.is_class_monitor=1
  `;

  db.query(sql, [periodId, leaderId], (err, result) => {
    if (err) {
      console.log(err);

      return res.json({
        success: false,
        message: "Lỗi hệ thống",
      });
    }

    res.json({
      success: true,
      data: {
        total: Number(result[0].total || 0),
        submitted: Number(result[0].submitted || 0),
        approved: Number(result[0].approved || 0),
        draft: Number(result[0].draft || 0),
      },
    });
  });
});

/*=========================================================
LỚP TRƯỞNG RESET PHIẾU
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
      message: "Đã đặt lại phiếu",
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
LỚP TRƯỞNG XEM THÔNG TIN MỘT SINH VIÊN
=========================================================*/

router.get("/student/:studentId", (req, res) => {
  const { studentId } = req.params;

  const sql = `
    SELECT

        s.id,

        s.masv,

        s.nienkhoa,

        s.chuyennganh,

        s.is_class_monitor,

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
LỚP TRƯỞNG XEM MINH CHỨNG
=========================================================*/

router.get("/proof/:resultId", (req, res) => {
  const { resultId } = req.params;

  const sql = `
    SELECT

        ca.criteria_id,

        cc.title,

        cc.score,

        ca.checked,

        ca.proof,

        ca.leader_checked,

        ca.teacher_score,

        ca.teacher_note

    FROM conduct_answers ca

    JOIN conduct_criteria cc
        ON cc.id=ca.criteria_id

    WHERE ca.result_id=?

    ORDER BY

        cc.group_name,

        cc.sort_order,

        cc.id
  `;

  db.query(sql, [resultId], (err, result) => {
    if (err) {
      console.log(err);

      return res.json({
        success: false,
        message: "Lỗi hệ thống",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  });
});

/*=========================================================
THỐNG KÊ BIỂU ĐỒ
=========================================================*/

router.get("/chart/:periodId", async (req, res) => {
  const { periodId } = req.params;

  try {
    const data = await getStatistics(periodId);

    res.json({
      success: true,

      data,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,

      message: "Không thể tải biểu đồ",
    });
  }
});

module.exports = router;
