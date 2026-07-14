const express = require("express");

const router = express.Router();

const db = require("../config/db");

const { addActivity } = require("../helpers/activity");

/*=========================================================
DANH SÁCH LỚP
=========================================================*/

router.get("/classes", (req, res) => {
  const sql = `
    SELECT

      c.id,
      c.malop,
      c.tenlop,
      c.major_id,
      c.teacher_id,
      c.created_at,

      m.major_code,
      m.major_name,

      t.magv,

      u.hoten AS giaovien,

      (
        SELECT COUNT(*)
        FROM class_students cs
        WHERE cs.class_id = c.id
      ) AS total_students

    FROM classes c

    LEFT JOIN majors m
      ON m.id = c.major_id

    LEFT JOIN teachers t
      ON t.id = c.teacher_id

    LEFT JOIN users u
      ON u.id = t.user_id

    ORDER BY c.malop ASC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Lỗi hệ thống");
    }

    res.json(result);
  });
});

/*=========================================================
CHI TIẾT LỚP
=========================================================*/

router.get("/class/:id", (req, res) => {
  const sql = `
    SELECT

      c.id,
      c.malop,
      c.tenlop,
      c.major_id,
      c.teacher_id,
      c.created_at,

      m.major_code,
      m.major_name,

      t.magv,

      u.hoten AS giaovien,

      (
        SELECT COUNT(*)
        FROM class_students cs
        WHERE cs.class_id=c.id
      ) AS total_students

    FROM classes c

    LEFT JOIN majors m
      ON m.id=c.major_id

    LEFT JOIN teachers t
      ON t.id=c.teacher_id

    LEFT JOIN users u
      ON u.id=t.user_id

    WHERE c.id=?

    LIMIT 1
  `;

  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Lỗi hệ thống");
    }

    if (result.length === 0) {
      return res.status(404).send("Không tìm thấy lớp");
    }

    res.json(result[0]);
  });
});

/*=========================================================
LỚP GIÁO VIÊN CHỦ NHIỆM
=========================================================*/

router.get("/teacher/classes/:teacherId", (req, res) => {
  const sql = `
    SELECT

      c.id,
      c.malop,
      c.tenlop,

      m.major_code,
      m.major_name,

      (
        SELECT COUNT(*)
        FROM class_students cs
        WHERE cs.class_id=c.id
      ) AS total_students

    FROM classes c

    LEFT JOIN majors m
      ON m.id=c.major_id

    WHERE c.teacher_id=?

    ORDER BY c.malop ASC
  `;

  db.query(sql, [req.params.teacherId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Lỗi hệ thống");
    }

    res.json(result);
  });
});

/*=========================================================
TẠO LỚP
=========================================================*/

router.post("/create-class", (req, res) => {
  let { major_id, nienkhoa, lop, teacher_id } = req.body;

  if (!major_id || !nienkhoa || !lop || !teacher_id) {
    return res.send("Vui lòng nhập đầy đủ thông tin");
  }

  lop = lop.trim().toUpperCase();

  db.query(
    `
    SELECT
      major_code
    FROM majors
    WHERE id=?
    `,
    [major_id],

    (err, majorResult) => {
      if (err) {
        console.log(err);
        return res.send("Lỗi hệ thống");
      }

      if (majorResult.length === 0) {
        return res.send("Không tìm thấy chuyên ngành");
      }

      const majorCode = majorResult[0].major_code;

      const malop = `K${nienkhoa}${majorCode}${lop}`;

      const tenlop = malop;

      db.query(
        `
        SELECT id

        FROM classes

        WHERE malop=?
        `,
        [malop],

        (err, checkResult) => {
          if (err) {
            console.log(err);
            return res.send("Lỗi hệ thống");
          }

          if (checkResult.length > 0) {
            return res.send("Lớp đã tồn tại");
          }

          db.query(
            `
            INSERT INTO classes
            (
              malop,
              tenlop,
              major_id,
              teacher_id
            )

            VALUES
            (
              ?,?,?,?
            )
            `,
            [malop, tenlop, major_id, teacher_id],

            (err) => {
              if (err) {
                console.log(err);
                return res.send("Không thể tạo lớp");
              }

              addActivity("Tạo lớp", malop, "class", teacher_id);

              res.send("Tạo lớp thành công");
            },
          );
        },
      );
    },
  );
});
/*=========================================================
CẬP NHẬT LỚP
=========================================================*/

router.post("/update-class", (req, res) => {
  let { id, major_id, nienkhoa, lop, teacher_id } = req.body;

  if (!id || !major_id || !nienkhoa || !lop || !teacher_id) {
    return res.send("Vui lòng nhập đầy đủ thông tin");
  }

  lop = lop.trim().toUpperCase();

  db.query(
    `
    SELECT
      major_code

    FROM majors

    WHERE id=?
    `,
    [major_id],

    (err, majorResult) => {
      if (err) {
        console.log(err);

        return res.send("Lỗi hệ thống");
      }

      if (majorResult.length === 0) {
        return res.send("Không tìm thấy chuyên ngành");
      }

      const majorCode = majorResult[0].major_code;

      const malop = `K${nienkhoa}${majorCode}${lop}`;

      const tenlop = malop;

      db.query(
        `
        SELECT id

        FROM classes

        WHERE

          malop=?

        AND

          id<>?
        `,
        [malop, id],

        (err, checkResult) => {
          if (err) {
            console.log(err);

            return res.send("Lỗi hệ thống");
          }

          if (checkResult.length > 0) {
            return res.send("Lớp đã tồn tại");
          }

          db.query(
            `
            UPDATE classes

            SET

              malop=?,
              tenlop=?,
              major_id=?,
              teacher_id=?

            WHERE id=?
            `,
            [malop, tenlop, major_id, teacher_id, id],

            (err) => {
              if (err) {
                console.log(err);

                return res.send("Không thể cập nhật lớp");
              }

              addActivity("Cập nhật lớp", malop, "class", teacher_id);

              res.send("Cập nhật lớp thành công");
            },
          );
        },
      );
    },
  );
});

/*=========================================================
ĐỔI GIÁO VIÊN CHỦ NHIỆM
=========================================================*/

router.post("/change-homeroom-teacher", (req, res) => {
  const { class_id, teacher_id } = req.body;

  if (!class_id || !teacher_id) {
    return res.send("Thiếu dữ liệu");
  }

  db.query(
    `
    UPDATE classes

    SET teacher_id=?

    WHERE id=?
    `,
    [teacher_id, class_id],

    (err) => {
      if (err) {
        console.log(err);

        return res.send("Không thể đổi giáo viên chủ nhiệm");
      }

      addActivity(
        "Đổi giáo viên chủ nhiệm",
        `Class ${class_id}`,
        "class",
        teacher_id,
      );

      res.send("Đổi giáo viên chủ nhiệm thành công");
    },
  );
});

/*=========================================================
XÓA LỚP
=========================================================*/

router.post("/delete-class", (req, res) => {
  const { id } = req.body;

  db.query(
    `
    SELECT
      tenlop

    FROM classes

    WHERE id=?
    `,
    [id],

    (err, classResult) => {
      if (err) {
        console.log(err);

        return res.send("Lỗi hệ thống");
      }

      if (classResult.length === 0) {
        return res.send("Không tìm thấy lớp");
      }

      const tenlop = classResult[0].tenlop;

      db.query(
        `
        SELECT id

        FROM class_students

        WHERE class_id=?

        LIMIT 1
        `,
        [id],

        (err, studentResult) => {
          if (err) {
            console.log(err);

            return res.send("Lỗi hệ thống");
          }

          if (studentResult.length > 0) {
            return res.send("Lớp đang có sinh viên, không thể xóa");
          }

          db.query(
            `
            DELETE

            FROM classes

            WHERE id=?
            `,
            [id],

            (err) => {
              if (err) {
                console.log(err);

                return res.send("Không thể xóa lớp");
              }

              addActivity("Xóa lớp", tenlop, "class");

              res.send("Xóa lớp thành công");
            },
          );
        },
      );
    },
  );
});
/*=========================================================
DANH SÁCH SINH VIÊN TRONG LỚP
=========================================================*/

router.get("/class-members/:classId", (req, res) => {
  const { classId } = req.params;

  const sql = `
    SELECT

      cs.id,

      s.id AS student_id,
      s.masv,
      s.is_class_monitor,

      u.id AS user_id,
      u.username,
      u.hoten,
      u.email,
      u.sodienthoai,
      u.avatar

    FROM class_students cs

    JOIN students s
      ON cs.student_id = s.id

    JOIN users u
      ON s.user_id = u.id

    WHERE cs.class_id = ?

    ORDER BY

      s.is_class_monitor DESC,

      u.hoten ASC
  `;

  db.query(sql, [classId], (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).send("Lỗi hệ thống");
    }

    res.json(result);
  });
});

/*=========================================================
THÊM SINH VIÊN VÀO LỚP
=========================================================*/

router.post("/add-student-to-class", (req, res) => {
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
        return res.send("Sinh viên đã thuộc lớp");
      }

      db.query(
        `
        DELETE

        FROM class_students

        WHERE student_id=?
        `,
        [student_id],

        (err) => {
          if (err) {
            console.log(err);

            return res.send("Không thể cập nhật");
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

              res.send("Thêm sinh viên vào lớp thành công");
            },
          );
        },
      );
    },
  );
});

/*=========================================================
XÓA SINH VIÊN KHỎI LỚP
=========================================================*/

router.post("/remove-student-from-class", (req, res) => {
  const { class_id, student_id } = req.body;

  db.query(
    `
    DELETE

    FROM class_students

    WHERE

      class_id=?

    AND

      student_id=?
    `,
    [class_id, student_id],

    (err) => {
      if (err) {
        console.log(err);

        return res.send("Không thể xóa sinh viên");
      }

      db.query(
        `
        UPDATE students

        SET is_class_monitor=0

        WHERE id=?
        `,
        [student_id],
      );

      addActivity("Xóa sinh viên khỏi lớp", `Student ${student_id}`, "class");

      res.send("Đã xóa sinh viên khỏi lớp");
    },
  );
});

/*=========================================================
BỔ NHIỆM LỚP TRƯỞNG
=========================================================*/

router.post("/set-class-monitor", (req, res) => {
  const { class_id, student_id } = req.body;

  if (!class_id || !student_id) {
    return res.send("Thiếu dữ liệu");
  }

  db.query(
    `
    UPDATE students s

    JOIN class_students cs

      ON s.id = cs.student_id

    SET s.is_class_monitor = 0

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

        SET is_class_monitor = 1

        WHERE id = ?
        `,
        [student_id],

        (err) => {
          if (err) {
            console.log(err);

            return res.send("Không thể cập nhật lớp trưởng");
          }

          addActivity("Bổ nhiệm lớp trưởng", `Student ${student_id}`, "class");

          res.send("Đã bổ nhiệm lớp trưởng");
        },
      );
    },
  );
});
/*=========================================================
TẠO NHÓM CHAT CHUNG CỦA LỚP
=========================================================*/

router.post("/create-main-chat", (req, res) => {
  const { class_id } = req.body;

  if (!class_id) {
    return res.send("Thiếu dữ liệu");
  }

  db.query(
    `
    SELECT id

    FROM chat_groups

    WHERE

      class_id=?

    AND

      group_type='class'
    `,
    [class_id],

    (err, result) => {
      if (err) {
        console.log(err);

        return res.send("Lỗi hệ thống");
      }

      if (result.length > 0) {
        return res.send("Lớp đã có nhóm chat");
      }

      db.query(
        `
        SELECT

          tenlop,
          teacher_id

        FROM classes

        WHERE id=?
        `,
        [class_id],

        (err, classResult) => {
          if (err) {
            console.log(err);

            return res.send("Lỗi hệ thống");
          }

          if (classResult.length === 0) {
            return res.send("Không tìm thấy lớp");
          }

          const lop = classResult[0];

          db.query(
            `
            INSERT INTO chat_groups
            (
              class_id,
              group_name,
              group_type,
              created_by
            )

            VALUES
            (
              ?,?,
              'class',
              ?
            )
            `,
            [class_id, lop.tenlop, lop.teacher_id],

            (err) => {
              if (err) {
                console.log(err);

                return res.send("Không thể tạo nhóm chat");
              }

              addActivity(
                "Tạo nhóm chat lớp",
                lop.tenlop,
                "chat",
                lop.teacher_id,
              );

              res.send("Tạo nhóm chat thành công");
            },
          );
        },
      );
    },
  );
});

/*=========================================================
LẤY NHÓM CHAT CHUNG
=========================================================*/

router.get("/main-chat/:classId", (req, res) => {
  db.query(
    `
    SELECT *

    FROM chat_groups

    WHERE

      class_id=?

    AND

      group_type='class'

    LIMIT 1
    `,
    [req.params.classId],

    (err, result) => {
      if (err) {
        console.log(err);

        return res.status(500).send("Lỗi hệ thống");
      }

      if (result.length === 0) {
        return res.json(null);
      }

      res.json(result[0]);
    },
  );
});

/*=========================================================
TẠO NHÓM CHAT RIÊNG
=========================================================*/

router.post("/create-private-chat", (req, res) => {
  const { class_id, group_name, created_by } = req.body;

  if (!class_id || !group_name || !created_by) {
    return res.send("Thiếu dữ liệu");
  }

  db.query(
    `
    INSERT INTO chat_groups
    (
      class_id,
      group_name,
      group_type,
      created_by
    )

    VALUES
    (
      ?,?,
      'private',
      ?
    )
    `,
    [class_id, group_name, created_by],

    (err) => {
      if (err) {
        console.log(err);

        return res.send("Không thể tạo nhóm chat");
      }

      addActivity("Tạo nhóm chat", group_name, "chat", created_by);

      res.send("Tạo nhóm chat thành công");
    },
  );
});

/*=========================================================
DANH SÁCH NHÓM CHAT RIÊNG
=========================================================*/

router.get("/private-chats/:classId", (req, res) => {
  db.query(
    `
    SELECT

      id,
      group_name,
      created_by,
      created_at

    FROM chat_groups

    WHERE

      class_id=?

    AND

      group_type='private'

    ORDER BY created_at DESC
    `,
    [req.params.classId],

    (err, result) => {
      if (err) {
        console.log(err);

        return res.status(500).send("Lỗi hệ thống");
      }

      res.json(result);
    },
  );
});

/*=========================================================
EXPORT
=========================================================*/

module.exports = router;
