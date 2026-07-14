const express = require("express");

const router = express.Router();

const db = require("../config/db");

/*=========================================================
LOGIN
=========================================================*/

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({
      success: false,
      message: "Vui lòng nhập đầy đủ thông tin",
    });
  }

  const sql = `
    SELECT

      u.id,
      u.username,
      u.password,
      u.hoten,
      u.avatar,
      u.role,

      s.id AS student_id,
      s.masv,
      s.nienkhoa,
      s.chuyennganh,
      s.is_class_monitor,

      t.id AS teacher_id,
      t.magv,

      c.id AS class_id,
      c.tenlop AS lop

    FROM users u

    LEFT JOIN students s
      ON s.user_id = u.id

    LEFT JOIN teachers t
      ON t.user_id = u.id

    LEFT JOIN class_students cs
      ON cs.student_id = s.id

    LEFT JOIN classes c
      ON c.id = cs.class_id

    WHERE
      u.username = ?
    AND
      u.password = ?

    LIMIT 1
  `;

  db.query(sql, [username, password], (err, result) => {
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
        message: "Sai tài khoản hoặc mật khẩu",
      });
    }

    const user = result[0];

    res.json({
      success: true,

      user: {
        id: user.id,

        username: user.username,

        hoten: user.hoten,

        avatar: user.avatar,

        role: user.role,

        student_id: user.student_id,

        teacher_id: user.teacher_id,

        masv: user.masv,

        lop: user.lop,

        nienkhoa: user.nienkhoa,

        chuyennganh: user.chuyennganh,

        is_class_monitor: user.is_class_monitor,

        magv: user.magv,

        class_id: user.class_id,

        tenlop: user.lop,
      },
    });
  });
});

/*=========================================================
ĐỔI MẬT KHẨU
=========================================================*/

router.post("/change-password", (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  if (!username || !oldPassword || !newPassword) {
    return res.json({
      success: false,
      message: "Vui lòng nhập đầy đủ thông tin",
    });
  }

  if (newPassword.length < 6) {
    return res.json({
      success: false,
      message: "Mật khẩu phải có ít nhất 6 ký tự",
    });
  }

  if (oldPassword === newPassword) {
    return res.json({
      success: false,
      message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    });
  }

  const checkSql = `
    SELECT id

    FROM users

    WHERE
      username = ?
    AND
      password = ?
  `;

  db.query(checkSql, [username, oldPassword], (err, result) => {
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
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    const updateSql = `
      UPDATE users

      SET password = ?

      WHERE username = ?
    `;

    db.query(updateSql, [newPassword, username], (err) => {
      if (err) {
        console.log(err);

        return res.status(500).json({
          success: false,
          message: "Không thể đổi mật khẩu",
        });
      }

      res.json({
        success: true,
        message: "Đổi mật khẩu thành công",
      });
    });
  });
});

/*=========================================================
EXPORT
=========================================================*/

module.exports = router;
