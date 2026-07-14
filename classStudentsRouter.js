const express = require("express");

const router = express.Router();

const multer = require("multer");

const XLSX = require("xlsx");

const ExcelJS = require("exceljs");

const db = require("../config/db");

const { addActivity } = require("../helpers/activity");

/*=========================================================
UPLOAD
=========================================================*/

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/");
  },

  filename(req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
});

/*=========================================================
THÔNG TIN LỚP
=========================================================*/

router.get("/class/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT

      c.id,
      c.malop,
      c.tenlop,

      m.id AS major_id,
      m.major_code,
      m.major_name,

      t.id AS teacher_id,
      t.magv,

      u.hoten AS teacher_name,

      (
        SELECT COUNT(*)
        FROM class_students
        WHERE class_id = c.id
      ) AS total_students

    FROM classes c

    LEFT JOIN majors m
      ON c.major_id = m.id

    LEFT JOIN teachers t
      ON c.teacher_id = t.id

    LEFT JOIN users u
      ON t.user_id = u.id

    WHERE c.id = ?

    LIMIT 1
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).send(err);
    }

    if (result.length === 0) {
      return res.status(404).send("Không tìm thấy lớp");
    }

    res.json(result[0]);
  });
});

/*=========================================================
DANH SÁCH SINH VIÊN TRONG LỚP
=========================================================*/

router.get("/class-students/:classId", (req, res) => {
  const { classId } = req.params;

  const sql = `
    SELECT

      cs.id,

      s.id AS student_id,
      s.masv,
      s.nienkhoa,
      s.chuyennganh,
      s.is_class_monitor,

      u.id AS user_id,
      u.username,
      u.hoten,
      u.email,
      u.sodienthoai,
      u.avatar,

      c.id AS class_id,
      c.malop,
      c.tenlop,

      m.major_code,
      m.major_name

    FROM class_students cs

    JOIN students s
      ON cs.student_id = s.id

    JOIN users u
      ON s.user_id = u.id

    JOIN classes c
      ON cs.class_id = c.id

    LEFT JOIN majors m
      ON c.major_id = m.id

    WHERE cs.class_id = ?

    ORDER BY

      s.is_class_monitor DESC,

      u.hoten ASC
  `;

  db.query(sql, [classId], (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).send(err);
    }

    res.json(result);
  });
});

/*=========================================================
DANH SÁCH TOÀN BỘ SINH VIÊN
(CHƯA THUỘC LỚP NÀO)
=========================================================*/

router.get("/all-students", (req, res) => {
  const sql = `
    SELECT

      s.id,
      s.masv,
      s.nienkhoa,
      s.chuyennganh,

      u.hoten,
      u.email,
      u.sodienthoai

    FROM students s

    JOIN users u
      ON s.user_id = u.id

    WHERE s.id NOT IN
    (
      SELECT student_id
      FROM class_students
    )

    ORDER BY u.hoten ASC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).send(err);
    }

    res.json(result);
  });
});
/*=========================================================
THÊM SINH VIÊN VÀO LỚP
=========================================================*/

router.post("/add-student-class", (req, res) => {
  const { class_id, student_id } = req.body;

  if (!class_id || !student_id) {
    return res.send("Thiếu dữ liệu");
  }

  db.query(
    `
    SELECT id

    FROM class_students

    WHERE

      class_id=?

    AND

      student_id=?
    `,
    [class_id, student_id],

    (err, result) => {
      if (err) {
        console.log(err);

        return res.send("Lỗi hệ thống");
      }

      if (result.length > 0) {
        return res.send("Sinh viên đã có trong lớp");
      }

      db.query(
        `
        INSERT INTO class_students
        (
          class_id,
          student_id
        )
        VALUES
        (
          ?,?
        )
        `,
        [class_id, student_id],

        (err) => {
          if (err) {
            console.log(err);

            return res.send("Không thể thêm sinh viên");
          }

          addActivity(
            "Thêm sinh viên vào lớp",
            `Student ${student_id}`,
            "class",
          );

          res.send("Đã thêm sinh viên vào lớp");
        },
      );
    },
  );
});

/*=========================================================
ĐỔI LỚP TRƯỞNG
=========================================================*/

router.post("/change-class-monitor", (req, res) => {
  const { class_id, student_id } = req.body;

  if (!class_id || !student_id) {
    return res.send("Thiếu dữ liệu");
  }

  db.query(
    `
    UPDATE students s

    JOIN class_students cs
      ON s.id = cs.student_id

    SET
      s.is_class_monitor = 0

    WHERE cs.class_id = ?
    `,
    [class_id],

    (err) => {
      if (err) {
        console.log(err);

        return res.send("Lỗi hệ thống");
      }

      db.query(
        `
        UPDATE students

        SET
          is_class_monitor = 1

        WHERE id = ?
        `,
        [student_id],

        (err) => {
          if (err) {
            console.log(err);

            return res.send("Không thể cập nhật lớp trưởng");
          }

          addActivity("Bổ nhiệm lớp trưởng", `Student ${student_id}`, "class");

          res.send("Đổi lớp trưởng thành công");
        },
      );
    },
  );
});

/*=========================================================
XÓA SINH VIÊN KHỎI LỚP
=========================================================*/

router.post("/remove-student-class", (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.send("Thiếu dữ liệu");
  }

  db.query(
    `
    SELECT student_id

    FROM class_students

    WHERE id=?
    `,
    [id],

    (err, result) => {
      if (err) {
        console.log(err);

        return res.send("Lỗi hệ thống");
      }

      if (result.length === 0) {
        return res.send("Không tìm thấy sinh viên");
      }

      const studentId = result[0].student_id;

      db.query(
        `
        DELETE

        FROM class_students

        WHERE id=?
        `,
        [id],

        (err) => {
          if (err) {
            console.log(err);

            return res.send("Không thể xóa sinh viên");
          }

          db.query(
            `
            UPDATE students

            SET
              is_class_monitor=0

            WHERE id=?
            `,
            [studentId],
          );

          addActivity(
            "Xóa sinh viên khỏi lớp",
            `Student ${studentId}`,
            "class",
          );

          res.send("Đã xóa sinh viên khỏi lớp");
        },
      );
    },
  );
});
/*=========================================================
IMPORT SINH VIÊN TỪ EXCEL
=========================================================*/

router.post(
  "/import-class-students",
  upload.single("file"),

  async (req, res) => {
    const { class_id } = req.body;

    if (!class_id) {
      return res.send("Thiếu mã lớp");
    }

    if (!req.file) {
      return res.send("Vui lòng chọn file Excel");
    }

    try {
      const workbook = XLSX.readFile(req.file.path);

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      });

      if (rows.length === 0) {
        return res.send("File Excel rỗng");
      }

      /*=========================================================
      TÌM DÒNG CHỨA HEADER
      =========================================================*/

      let headerRow = -1;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i].map((cell) => cell.toString().trim().toLowerCase());

        if (
          row.includes("mã sv") ||
          row.includes("ma sv") ||
          row.includes("mssv") ||
          row.includes("masv") ||
          row.includes("mã sinh viên") ||
          row.includes("ma sinh vien")
        ) {
          headerRow = i;
          break;
        }
      }

      if (headerRow === -1) {
        return res.send("Không tìm thấy cột Mã SV");
      }

      /*=========================================================
      TÌM CỘT MSSV
      =========================================================*/

      const header = rows[headerRow].map((cell) =>
        cell.toString().trim().toLowerCase(),
      );

      const mssvIndex = header.findIndex((item) =>
        [
          "mã sv",
          "ma sv",
          "mssv",
          "masv",
          "mã sinh viên",
          "ma sinh vien",
          "student id",
          "studentid",
        ].includes(item),
      );

      if (mssvIndex === -1) {
        return res.send("Không xác định được cột MSSV");
      }

      let success = 0;

      let fail = 0;

      /*=========================================================
      IMPORT DỮ LIỆU
      =========================================================*/

      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i];

        const masv = row[mssvIndex]?.toString().trim();

        if (!masv) {
          continue;
        }

        /* BỎ QUA DÒNG TC1 TC2 TC3... */

        if (
          masv.toLowerCase().startsWith("tc") ||
          masv.toLowerCase() === "mã sv"
        ) {
          continue;
        }

        /* TÌM SINH VIÊN */

        const student = await new Promise((resolve, reject) => {
          db.query(
            `
            SELECT id

            FROM students

            WHERE masv=?
            `,
            [masv],

            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            },
          );
        });

        if (student.length === 0) {
          fail++;
          continue;
        }

        const studentId = student[0].id;

        /* KIỂM TRA ĐÃ THUỘC LỚP */

        const existed = await new Promise((resolve, reject) => {
          db.query(
            `
            SELECT id

            FROM class_students

            WHERE

              class_id=?

            AND

              student_id=?
            `,
            [class_id, studentId],

            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            },
          );
        });

        if (existed.length > 0) {
          fail++;
          continue;
        }

        /* THÊM SINH VIÊN */

        try {
          await new Promise((resolve, reject) => {
            db.query(
              `
              INSERT INTO class_students
              (
                class_id,
                student_id
              )
              VALUES
              (
                ?,?
              )
              `,
              [class_id, studentId],

              (err) => {
                if (err) reject(err);
                else resolve();
              },
            );
          });

          success++;
        } catch (err) {
          console.log(err);

          fail++;
        }
      }

      /*=========================================================
      GHI NHẬT KÝ
      =========================================================*/

      addActivity("Import sinh viên", `Lớp ${class_id}`, "class");

      res.send(`Import hoàn tất: ${success} sinh viên, ${fail} lỗi.`);
    } catch (error) {
      console.log(error);

      res.status(500).send("Không thể import Excel");
    }
  },
);
/*=========================================================
EXPORT SINH VIÊN RA EXCEL
=========================================================*/

router.get(
  "/export-class-students/:classId",

  async (req, res) => {
    const { classId } = req.params;

    db.query(
      `
      SELECT

        s.masv,

        u.hoten,

        c.malop,

        IF
        (
          s.is_class_monitor=1,
          'Lớp trưởng',
          'Sinh viên'
        ) AS chucvu

      FROM class_students cs

      JOIN students s
        ON cs.student_id=s.id

      JOIN users u
        ON s.user_id=u.id

      JOIN classes c
        ON cs.class_id=c.id

      WHERE cs.class_id=?

      ORDER BY

        s.is_class_monitor DESC,

        u.hoten ASC
      `,
      [classId],

      async (err, result) => {
        if (err) {
          console.log(err);

          return res.status(500).send("Không thể xuất Excel");
        }

        const workbook = new ExcelJS.Workbook();

        const sheet = workbook.addWorksheet("Danh sách sinh viên");

        sheet.columns = [
          {
            header: "MSSV",
            key: "masv",
            width: 20,
          },

          {
            header: "Họ tên",
            key: "hoten",
            width: 35,
          },

          {
            header: "Lớp",
            key: "malop",
            width: 18,
          },

          {
            header: "Chức vụ",
            key: "chucvu",
            width: 18,
          },
        ];

        result.forEach((row) => sheet.addRow(row));

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );

        res.setHeader(
          "Content-Disposition",
          `attachment; filename=class_${classId}.xlsx`,
        );

        await workbook.xlsx.write(res);

        res.end();
      },
    );
  },
);

module.exports = router;
