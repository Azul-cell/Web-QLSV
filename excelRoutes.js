const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");

const router = express.Router();

const db = require("../config/db");

const { addActivity } = require("../helpers/activity");

/*=========================================================
UPLOAD CONFIG
=========================================================*/

const upload = multer({
  dest: "uploads/",
});

/*=========================================================
IMPORT EXCEL
=========================================================*/

router.post(
  "/upload-excel",
  upload.single("file"),

  (req, res) => {
    try {
      if (!req.file) {
        return res.send("Vui lòng chọn file Excel");
      }

      const workbook = XLSX.readFile(req.file.path);

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const data = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

      if (data.length === 0) {
        return res.send("File Excel không có dữ liệu");
      }

      let total = data.length;

      let completed = 0;

      data.forEach((user) => {
        if (!user.username || !user.password || !user.hoten || !user.role) {
          completed++;

          if (completed === total) {
            return res.send("Import hoàn tất");
          }

          return;
        }

        const role = String(user.role).trim().toLowerCase();

        /*=========================================================
        KHÔNG CHO IMPORT ADMIN
        =========================================================*/

        if (role === "admin") {
          completed++;

          if (completed === total) {
            return res.send("Import hoàn tất");
          }

          return;
        }

        /*=========================================================
        KIỂM TRA USERNAME
        =========================================================*/

        db.query(
          `
          SELECT id

          FROM users

          WHERE username=?
          `,
          [user.username],

          (err, result) => {
            if (err) {
              console.log(err);

              completed++;

              return;
            }

            if (result.length > 0) {
              console.log(`${user.username} đã tồn tại`);

              completed++;

              return;
            }

            /*=========================================================
            TẠO USER
            =========================================================*/

            const userSql = `
              INSERT INTO users
              (
                username,
                password,
                hoten,
                email,
                sodienthoai,
                role
              )

              VALUES
              (
                ?,?,?,?,?,?
              )
            `;

            db.query(
              userSql,

              [
                user.username,
                user.password,
                user.hoten,
                user.email || null,
                user.sodienthoai || null,
                role,
              ],

              (err, userResult) => {
                if (err) {
                  console.log(err);

                  completed++;

                  return;
                }

                const userId = userResult.insertId;
                /*=========================================================
                TẠO SINH VIÊN
                =========================================================*/

                if (role === "student") {
                  const studentSql = `
                    INSERT INTO students
                    (
                      user_id,
                      masv,
                      lop,
                      nienkhoa,
                      chuyennganh,
                      is_class_monitor
                    )
                    VALUES
                    (
                      ?,?,?,?,?,?
                    )
                  `;

                  db.query(
                    studentSql,
                    [
                      userId,
                      user.username,
                      user.lop || "",
                      user.nienkhoa || "",
                      user.chuyennganh || "",
                      0,
                    ],
                    (err) => {
                      if (err) {
                        console.log(
                          "STUDENT ERROR:",
                          user.username,
                          err.sqlMessage,
                        );
                      } else {
                        addActivity(
                          "Import sinh viên",
                          `${user.hoten} (${user.username})`,
                          "student",
                          userId,
                        );
                      }

                      completed++;

                      if (completed === total) {
                        return res.send("Import Excel thành công");
                      }
                    },
                  );

                  return;
                }

                /*=========================================================
                TẠO GIẢNG VIÊN
                =========================================================*/

                if (role === "teacher") {
                  const teacherSql = `
                    INSERT INTO teachers
                    (
                      user_id,
                      magv
                    )
                    VALUES
                    (
                      ?,?
                    )
                  `;

                  db.query(teacherSql, [userId, user.username], (err) => {
                    if (err) {
                      console.log(
                        "TEACHER ERROR:",
                        user.username,
                        err.sqlMessage,
                      );
                    } else {
                      addActivity(
                        "Import giảng viên",
                        `${user.hoten} (${user.username})`,
                        "teacher",
                        userId,
                      );
                    }

                    completed++;

                    if (completed === total) {
                      return res.send("Import Excel thành công");
                    }
                  });

                  return;
                }

                completed++;

                if (completed === total) {
                  return res.send("Import Excel thành công");
                }
              },
            );
          },
        );
      });
    } catch (error) {
      console.log(error);

      res.status(500).send("Lỗi upload Excel");
    }
  },
);

module.exports = router;
