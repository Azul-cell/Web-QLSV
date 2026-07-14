const express = require("express");

const router = express.Router();

const db = require("../config/db");

/* ================= LẤY 10 HOẠT ĐỘNG MỚI NHẤT ================= */

router.get("/activities", (req, res) => {
  const sql = `
    SELECT
      a.id,
      a.title,
      a.description,
      a.type,
      a.created_at,

      u.hoten

    FROM activities a

    LEFT JOIN users u
      ON a.created_by = u.id

    ORDER BY a.created_at DESC

    LIMIT 10
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).json({
        message: "Không thể tải hoạt động",
      });
    }

    res.json(result);
  });
});

/* ================= LẤY TẤT CẢ HOẠT ĐỘNG ================= */

router.get("/activities/all", (req, res) => {
  const sql = `
    SELECT
      a.id,
      a.title,
      a.description,
      a.type,
      a.created_at,

      u.hoten

    FROM activities a

    LEFT JOIN users u
      ON a.created_by = u.id

    ORDER BY a.created_at DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).json({
        message: "Không thể tải dữ liệu",
      });
    }

    res.json(result);
  });
});

/* ================= THÊM HOẠT ĐỘNG (TEST) ================= */

router.post("/activities", (req, res) => {
  const { title, description, type, created_by } = req.body;

  if (!title) {
    return res.send("Thiếu tiêu đề");
  }

  const sql = `
    INSERT INTO activities
    (
      title,
      description,
      type,
      created_by
    )

    VALUES
    (
      ?,?,?,?
    )
  `;

  db.query(
    sql,
    [title, description || "", type || "system", created_by || null],
    (err) => {
      if (err) {
        console.log(err);

        return res.send("Không thể thêm hoạt động");
      }

      res.send("Thêm hoạt động thành công");
    },
  );
});

/* ================= XÓA 1 HOẠT ĐỘNG ================= */

router.post("/activities/delete", (req, res) => {
  const { id } = req.body;

  const sql = `
    DELETE FROM activities

    WHERE id=?
  `;

  db.query(sql, [id], (err) => {
    if (err) {
      console.log(err);

      return res.send("Không thể xóa");
    }

    res.send("Đã xóa");
  });
});

/* ================= XÓA TOÀN BỘ ================= */

router.post("/activities/clear", (req, res) => {
  const sql = `
    DELETE FROM activities
  `;

  db.query(sql, (err) => {
    if (err) {
      console.log(err);

      return res.send("Không thể xóa");
    }

    res.send("Đã xóa toàn bộ hoạt động");
  });
});

module.exports = router;
